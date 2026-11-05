import { logger } from "../../utils/logger";
import * as repo from "./integration.repository";
import { runScheduledSource } from "./integration.service";
let timer: NodeJS.Timeout | undefined;
let running = false;
async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const due = await repo.claimDueSources();
    for (const source of due) {
      try { await runScheduledSource(source); }
      catch (error) {
        logger.error("Scheduled integration sync failed", { sourceCode: source.code });
        const latest = await repo.listRuns(source.id, 1);
        await repo.createRun({ sourceId: source.id, status: "FAILED", recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsRejected: 0, cursor: latest[0]?.cursor ?? null, errorCode: "ADAPTER_EXECUTION_FAILED", errorSummary: "Scheduled adapter execution failed; inspect protected application logs", startedAt: new Date(), completedAt: new Date() });
      }
    }
  } catch (error) { logger.error("Integration scheduler tick failed", error); }
  finally { running = false; }
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
export function stopIntegrationScheduler(): void { if (timer) clearInterval(timer); timer = undefined; }
