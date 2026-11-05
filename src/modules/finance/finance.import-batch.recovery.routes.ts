import { Router, type RequestHandler } from "express";
import type { FinanceImportRecoveryDownload } from "./finance.import-batch.recovery-delivery";

export interface FinanceImportRecoveryRouteDependencies {
    /** Must enforce the Finance/DET-approved access matrix before report lookup. */
    authorize: RequestHandler;
    /** Resolves an already-built report for the requested batch; null means not found. */
    resolveDownload: (batchId: number) => Promise<FinanceImportRecoveryDownload | null>;
}

export function parseFinanceRecoveryBatchId(value: string): number | null {
    if (!/^[1-9]\d*$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Creates an opt-in internal router. It is deliberately not mounted by default:
 * callers must supply the approved authorization middleware and explicitly
 * mount it only after Finance/DET access policy has been approved.
 */
export function createFinanceImportRecoveryRouter(
    dependencies: FinanceImportRecoveryRouteDependencies,
) {
    if (typeof dependencies.authorize !== "function" ||
        typeof dependencies.resolveDownload !== "function") {
        throw new Error("FINANCE_RECOVERY_ROUTE_DEPENDENCIES_REQUIRED");
    }

    const router = Router();
    router.get("/:batchId/recovery-report.json", dependencies.authorize, async (req, res, next) => {
        try {
            const rawBatchId = req.params.batchId;
            const batchId = typeof rawBatchId === "string"
                ? parseFinanceRecoveryBatchId(rawBatchId)
                : null;
            if (batchId === null) {
                res.status(400).json({ success: false, error: { code: "INVALID_BATCH_ID" } });
                return;
            }
            const download = await dependencies.resolveDownload(batchId);
            if (!download) {
                res.status(404).json({ success: false, error: { code: "FINANCE_RECOVERY_REPORT_NOT_FOUND" } });
                return;
            }
            res.setHeader("Content-Type", download.content_type);
            res.setHeader("Content-Disposition", download.content_disposition);
            res.setHeader("Cache-Control", download.cache_control);
            res.status(200).send(download.body);
        } catch (error) {
            next(error);
        }
    });
    return router;
}
