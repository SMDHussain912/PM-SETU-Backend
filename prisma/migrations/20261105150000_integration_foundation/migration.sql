CREATE TABLE "integration_sources" (
  "id" SERIAL PRIMARY KEY,
  "code" VARCHAR(60) NOT NULL UNIQUE,
  "name" VARCHAR(120) NOT NULL,
  "system" VARCHAR(40) NOT NULL,
  "transport" VARCHAR(20) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "credential_ref" VARCHAR(120),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_sources_system_check" CHECK ("system" IN ('DET_MIS','ITI_MIS','STUDENT_MIS','TRAINING_MIS','APPRENTICESHIP','PLACEMENT_MIS','FINANCE_MIS','AP_GOVERNMENT','DGT_MSDE','GIS','SMS','EMAIL')),
  CONSTRAINT "integration_sources_transport_check" CHECK ("transport" IN ('REST','SFTP','CSV_UPLOAD','WEBHOOK'))
);
CREATE TABLE "integration_sync_runs" (
  "id" SERIAL PRIMARY KEY,
  "source_id" INTEGER NOT NULL REFERENCES "integration_sources"("id") ON DELETE CASCADE,
  "status" VARCHAR(20) NOT NULL,
  "records_read" INTEGER NOT NULL DEFAULT 0,
  "records_created" INTEGER NOT NULL DEFAULT 0,
  "records_updated" INTEGER NOT NULL DEFAULT 0,
  "records_rejected" INTEGER NOT NULL DEFAULT 0,
  "cursor" TEXT,
  "error_code" VARCHAR(100),
  "error_summary" VARCHAR(1000),
  "started_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_sync_runs_status_check" CHECK ("status" IN ('SUCCEEDED','PARTIAL','FAILED')),
  CONSTRAINT "integration_sync_runs_counts_check" CHECK ("records_read" >= 0 AND "records_created" >= 0 AND "records_updated" >= 0 AND "records_rejected" >= 0 AND "records_created" + "records_updated" + "records_rejected" <= "records_read")
);
CREATE INDEX "idx_integration_sync_runs_source_started" ON "integration_sync_runs"("source_id","started_at" DESC);
