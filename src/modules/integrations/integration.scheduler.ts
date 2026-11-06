import { logger } from "../../utils/logger";
import * as repo from "./integration.repository";
import { runScheduledSource } from "./integration.service";
import { createSchedulerLifecycle } from "./integration.scheduler.lifecycle";
import { createLeaseHeartbeat } from "./integration.scheduler.heartbeat";
import { persistScheduledFailureIfOwned } from "./integration.scheduler.failure";

const LEASE_HEARTBEAT_MS = 60_000;
let timer: NodeJS.Timeout | undefined;

async function runClaimedSource(source: Awaited<ReturnType<typeof repo.claimDueSources>>[number]): Promise<void> {
  const heartbeat = createLeaseHeartbeat({
    intervalMs: LEASE_HEARTBEAT_MS,
    renew: () => repo.renewSourceClaim(source.id, source.claimToken),
    onLost: () => logger.error("Integration scheduler lease ownership lost", { sourceCode: source.code }),
    onError: () => logger.error("Integration scheduler lease renewal failed", { sourceCode: source.code }),
  });
  heartbeat.start();

  try {
    await runScheduledSource(source, source.claimToken);
  } catch {
    // Settle any in-flight renewal before deciding whether this worker may
    // persist a scheduler-level failure for the claimed source.
    await heartbeat.stop();
    logger.error("Scheduled integration sync failed", { sourceCode: source.code });
    try {
      const persisted = await persistScheduledFailureIfOwned(
        source.id,
        source.claimToken,
        heartbeat.ownershipUncertain,
      );
      if (!persisted) {
        logger.error("Skipped scheduled failure write because lease ownership is unverified", {
          sourceCode: source.code,
          leaseLost: heartbeat.leaseLost,
          ownershipUncertain: heartbeat.ownershipUncertain,
        });
      }
    } catch {
      logger.error("Could not persist scheduled integration failure", { sourceCode: source.code });
    }
  } finally {
    await heartbeat.stop();
    try {
      await repo.releaseSourceClaim(source.id, source.claimToken);
    } catch {
      logger.error("Could not release integration scheduler lease", {
        sourceCode: source.code,
        leaseLost: heartbeat.leaseLost,
        ownershipUncertain: heartbeat.ownershipUncertain,
      });
    }
  }
}

async function tick(): Promise<void> {
  try {
    const due = await repo.claimDueSources();
    // Claims are bounded in the repository; run this batch concurrently so a
    // slow provider cannot leave later claims idle until their leases expire.
    await Promise.all(due.map((source) => runClaimedSource(source)));
  } catch {
    logger.error("Integration scheduler tick failed");
  }
}

const lifecycle = createSchedulerLifecycle(tick);

export function startIntegrationScheduler(): void {
  if (process.env.INTEGRATION_SCHEDULER_ENABLED !== "true" || timer) return;
  lifecycle.start();
  const configured = Number(process.env.INTEGRATION_SCHEDULER_POLL_SECONDS ?? "30");
  const seconds = Number.isInteger(configured) && configured >= 5 && configured <= 300 ? configured : 30;
  logger.info(`Integration scheduler enabled; polling every ${seconds}s`);
  lifecycle.trigger();
  timer = setInterval(() => lifecycle.trigger(), seconds * 1000);
  timer.unref();
}

/**
 * Stop future polling and wait for the current tick, including every claimed
 * source's lease release, before the caller disconnects shared dependencies.
 */
export async function stopIntegrationScheduler(): Promise<void> {
  if (timer) clearInterval(timer);
  timer = undefined;
  await lifecycle.stop();
}
