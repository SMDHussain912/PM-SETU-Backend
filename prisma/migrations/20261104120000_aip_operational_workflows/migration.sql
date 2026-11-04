CREATE TABLE "aip_activity_records" (
 "id" SERIAL PRIMARY KEY,
 "aip_id" INTEGER NOT NULL REFERENCES "aips"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 "created_by" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "activity_type" TEXT NOT NULL CHECK ("activity_type" IN ('INDUSTRY_ENGAGEMENT','APPRENTICESHIP','PLACEMENT','FACULTY_SUPPORT','EQUIPMENT_SUPPORT','TRAINING_SUPPORT','OTHER')),
 "title" TEXT NOT NULL,
 "description" TEXT,
 "quantity" INTEGER CHECK ("quantity" IS NULL OR "quantity" >= 0),
 "activity_date" DATE,
 "institute_id" INTEGER REFERENCES "itis"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 "evidence_url" TEXT,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "idx_aip_activity_aip_date" ON "aip_activity_records"("aip_id","activity_date");
CREATE TABLE "aip_submissions" (
 "id" SERIAL PRIMARY KEY,
 "aip_id" INTEGER NOT NULL REFERENCES "aips"("id") ON DELETE CASCADE ON UPDATE CASCADE,
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
CREATE INDEX "idx_aip_submissions_aip_status" ON "aip_submissions"("aip_id","status");
CREATE INDEX "idx_aip_submissions_created_by" ON "aip_submissions"("created_by");
