CREATE TABLE "spv_activity_records" (
 "id" SERIAL PRIMARY KEY,
 "spv_id" INTEGER NOT NULL REFERENCES "spvs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "created_by" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "activity_type" TEXT NOT NULL CHECK ("activity_type" IN ('FORMATION','INCORPORATION','OPERATIONS','INDUSTRY_ENGAGEMENT','EMPLOYMENT','TRAINING','OTHER')),
 "title" TEXT NOT NULL,
 "description" TEXT,
 "quantity" INTEGER CHECK ("quantity" IS NULL OR "quantity" >= 0),
 "activity_date" DATE,
 "evidence_url" TEXT,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "idx_spv_activity_spv_date" ON "spv_activity_records"("spv_id","activity_date");
CREATE TABLE "spv_submissions" (
 "id" SERIAL PRIMARY KEY,
 "spv_id" INTEGER NOT NULL REFERENCES "spvs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "created_by" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "title" TEXT NOT NULL,
 "report_period" TEXT NOT NULL,
 "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
 "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','SUBMITTED','REVISION_REQUESTED','APPROVED','REJECTED')),
 "submitted_at" TIMESTAMP(3),
 "reviewed_by" INTEGER REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "reviewed_at" TIMESTAMP(3),
 "review_remarks" TEXT,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "idx_spv_submissions_spv_status" ON "spv_submissions"("spv_id","status");
CREATE INDEX "idx_spv_submissions_created_by" ON "spv_submissions"("created_by");
