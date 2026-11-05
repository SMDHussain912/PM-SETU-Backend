CREATE TABLE "academic_source_records" (
    "id" SERIAL NOT NULL,
    "kpi_code" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_version" TEXT,
    "cluster_id" INTEGER,
    "iti_id" INTEGER,
    "event_date" DATE,
    "subject_token" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "review_status" TEXT NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "academic_source_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_academic_source_records_kpi_code" CHECK ("kpi_code" IN ('ACD-01','ACD-02','ACD-03','ACD-04','ACD-05')),
    CONSTRAINT "ck_academic_source_records_review_status" CHECK ("review_status" IN ('PENDING','ACCEPTED','REJECTED')),
    CONSTRAINT "ck_academic_source_records_payload_object" CHECK (jsonb_typeof("payload") = 'object'),
    CONSTRAINT "fk_academic_source_records_cluster" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "fk_academic_source_records_iti" FOREIGN KEY ("iti_id") REFERENCES "itis"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "uq_academic_source_records_source_record" ON "academic_source_records"("source_system","source_record_id");
CREATE INDEX "idx_academic_source_records_kpi_status" ON "academic_source_records"("kpi_code","review_status");
CREATE INDEX "idx_academic_source_records_cluster_iti" ON "academic_source_records"("cluster_id","iti_id");
CREATE INDEX "idx_academic_source_records_event_date" ON "academic_source_records"("event_date");
