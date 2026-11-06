-- Separate operational history from scheduler checkpoint history.
-- Existing rows are marked LEGACY because their origin cannot be reconstructed safely.
ALTER TABLE "integration_sync_runs"
  ADD COLUMN "run_origin" VARCHAR(20);

UPDATE "integration_sync_runs"
SET "run_origin" = 'LEGACY'
WHERE "run_origin" IS NULL;

ALTER TABLE "integration_sync_runs"
  ALTER COLUMN "run_origin" SET DEFAULT 'MANUAL',
  ALTER COLUMN "run_origin" SET NOT NULL;

ALTER TABLE "integration_sync_runs"
  ADD CONSTRAINT "integration_sync_runs_run_origin_check"
  CHECK ("run_origin" IN ('SCHEDULED', 'MANUAL', 'LEGACY'));

CREATE INDEX "idx_integration_sync_runs_checkpoint"
  ON "integration_sync_runs"("source_id", "run_origin", "started_at" DESC)
  WHERE "status" IN ('SUCCEEDED', 'PARTIAL');
