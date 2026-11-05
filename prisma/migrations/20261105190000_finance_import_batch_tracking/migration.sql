-- Finance import batch metadata and row outcomes only.
-- Uploaded files and normalized financial payloads are not retained.

CREATE TABLE "finance_import_batches" (
  "id" SERIAL PRIMARY KEY,
  "record_kind" VARCHAR(20) NOT NULL,
  "file_sha256" VARCHAR(64) NOT NULL,
  "lifecycle" VARCHAR(30) NOT NULL,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "invalid_rows" INTEGER NOT NULL DEFAULT 0,
  "attempted_rows" INTEGER NOT NULL DEFAULT 0,
  "created_rows" INTEGER NOT NULL DEFAULT 0,
  "duplicate_rows" INTEGER NOT NULL DEFAULT 0,
  "rejected_rows" INTEGER NOT NULL DEFAULT 0,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3)
);

CREATE TABLE "finance_import_batch_rows" (
  "id" SERIAL PRIMARY KEY,
  "batch_id" INTEGER NOT NULL REFERENCES "finance_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "row_number" INTEGER NOT NULL CHECK ("row_number" > 0),
  "outcome" VARCHAR(20) NOT NULL,
  "target_record_id" INTEGER,
  "error_code" VARCHAR(100),
  "error_message" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_finance_import_batches_created" ON "finance_import_batches"("created_at" DESC);
CREATE INDEX "idx_finance_import_batches_lifecycle" ON "finance_import_batches"("lifecycle", "created_at" DESC);
CREATE UNIQUE INDEX "uq_finance_import_batch_rows_batch_row" ON "finance_import_batch_rows"("batch_id", "row_number");
CREATE INDEX "idx_finance_import_batch_rows_batch_outcome" ON "finance_import_batch_rows"("batch_id", "outcome");
