import { createFinanceImportBatch, type CreateFinanceImportBatchInput } from "./finance.import-batch.repository";
import { buildFinanceImportBatchInput, type FinanceImportBatchProjectionOptions } from "./finance.import-batch.lifecycle";
import type { FinanceCsvPreview } from "./finance.csv.preview";

export type FinanceImportBatchPersister = (
    input: CreateFinanceImportBatchInput,
) => Promise<unknown>;

/**
 * Persists a technical preview record and its row diagnostics.
 *
 * This operation never executes financial writes. The caller must supply the
 * SHA-256 digest of the uploaded bytes and a stable UUID idempotency key for
 * this import attempt. Reuse the key across transport retries; use a new key
 * for an intentional re-import. Raw CSV content is deliberately not accepted
 * or persisted. The default repository writes the batch and row
 * outcomes in one database transaction.
 */
export async function persistFinanceCsvPreview(
    preview: FinanceCsvPreview,
    options: FinanceImportBatchProjectionOptions,
    persist: FinanceImportBatchPersister = createFinanceImportBatch,
): Promise<unknown> {
    const input = buildFinanceImportBatchInput(preview, options);
    return persist(input);
}
