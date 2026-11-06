import { logger } from "../../utils/logger";
import * as repo from "./integration.repository";
import { runScheduledSource } from "./integration.service";
import { createSchedulerLifecycle } from "./integration.scheduler.lifecycle";
import { createSchedulerLifecycle } from "./integration.scheduler.lifecycle";

const LEASE_HEARTBEAT_MS = 60_000;
let timer: NodeJS.Timeout | undefined;

async function runClaimedSource(source: Awaited<ReturnType<typeof repo.claimDueSources>>[number]): Promise<void> {
  let leaseLost = false;
  const heartbeat = setInterval(() => {
    void repo.renewSourceClaim(source.id, source.claimToken).then((renewed) => {
      if (!renewed) {
        leaseLost = true;
        logger.error("Integration scheduler lease ownership lost", { sourceCode: source.code });
      }
    }).catch(() => {
      leaseLost = true;
      logger.error("Integration scheduler lease renewal failed", { sourceCode: source.code });
    });
  }, LEASE_HEARTBEAT_MS);
  heartbeat.unref();

  try {
    await runScheduledSource(source, source.claimToken);
  } catch {
    logger.error("Scheduled integration sync failed", { sourceCode: source.code });
    try {
      const committed = await repo.listCommittedRuns(source.id, 1);
      await repo.createScheduledRun(source.id, source.claimToken, {
        status: "FAILED",
        recordsRead: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsRejected: 0,
        cursor: committed[0]?.cursor ?? null,
        errorCode: "ADAPTER_EXECUTION_FAILED",
        errorSummary: "Scheduled adapter execution failed; inspect protected application logs",
        startedAt: new Date(),
        completedAt: new Date(),
      });
    } catch {
      logger.error("Could not persist scheduled integration failure", { sourceCode: source.code });
    }
  } finally {
    clearInterval(heartbeat);
    try {
      await repo.releaseSourceClaim(source.id, source.claimToken);
    } catch {
      logger.error("Could not release integration scheduler lease", {
        sourceCode: source.code,
        leaseLost,
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
