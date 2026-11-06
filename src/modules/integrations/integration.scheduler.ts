import { logger } from "../../utils/logger";
import * as repo from "./integration.repository";
import { runScheduledSource } from "./integration.service";

const LEASE_HEARTBEAT_MS = 60_000;
let timer: NodeJS.Timeout | undefined;
let running = false;

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
    await runScheduledSource(source);
  } catch {
    logger.error("Scheduled integration sync failed", { sourceCode: source.code });
    try {
      const committed = await repo.listCommittedRuns(source.id, 1);
      await repo.createRun({
        sourceId: source.id,
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
  if (running) return;
  running = true;
  try {
    const due = await repo.claimDueSources();
    for (const source of due) {
      await runClaimedSource(source);
    }
  } catch {
    logger.error("Integration scheduler tick failed");
  } finally {
    running = false;
  }
}

export function startIntegrationScheduler(): void {
  if (process.env.INTEGRATION_SCHEDULER_ENABLED !== "true" || timer) return;
  const configured = Number(process.env.INTEGRATION_SCHEDULER_POLL_SECONDS ?? "30");
  const seconds = Number.isInteger(configured) && configured >= 5 && configured <= 300 ? configured : 30;
  logger.info(`Integration scheduler enabled; polling every ${seconds}s`);
  void tick();
  timer = setInterval(() => void tick(), seconds * 1000);
  timer.unref();
}

export function stopIntegrationScheduler(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
