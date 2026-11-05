-- Source-neutral industry outcome intake; not an approved KPI fact table.
CREATE TABLE "industry_outcome_records" (
    "id" SERIAL NOT NULL,
    "outcome_type" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_record_id" TEXT,
    "cluster_id" INTEGER,
    "iti_id" INTEGER,
    "employer_name" TEXT,
    "participant_ref" TEXT,
    "event_date" DATE,
    "evidence_ref" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "review_status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "industry_outcome_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_industry_outcomes_source_record"
ON "industry_outcome_records"("source_system", "source_record_id");

CREATE INDEX "idx_industry_outcomes_type_status"
ON "industry_outcome_records"("outcome_type", "review_status");

CREATE INDEX "idx_industry_outcomes_cluster_iti"
ON "industry_outcome_records"("cluster_id", "iti_id");

CREATE INDEX "idx_industry_outcomes_event_date"
ON "industry_outcome_records"("event_date");
