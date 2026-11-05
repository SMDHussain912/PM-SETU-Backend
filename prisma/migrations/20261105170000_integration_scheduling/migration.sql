ALTER TABLE "integration_sources"
  ADD COLUMN "sync_interval_seconds" INTEGER,
  ADD COLUMN "next_sync_at" TIMESTAMP(3);

ALTER TABLE "integration_sources"
  ADD CONSTRAINT "integration_sources_sync_interval_check"
  CHECK ("sync_interval_seconds" IS NULL OR "sync_interval_seconds" BETWEEN 60 AND 86400);

CREATE INDEX "idx_integration_sources_due_sync"
  ON "integration_sources" ("next_sync_at")
  WHERE "enabled" = TRUE AND "sync_interval_seconds" IS NOT NULL;
