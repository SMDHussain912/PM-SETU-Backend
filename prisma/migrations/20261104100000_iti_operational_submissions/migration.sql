-- Operational ITI submissions for Hub and Spoke institute workflows.
CREATE TABLE "iti_submissions" (
  "id" SERIAL NOT NULL,
  "iti_id" INTEGER NOT NULL,
  "created_by" INTEGER NOT NULL,
  "report_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submitted_at" TIMESTAMP(3),
  "reviewed_by" INTEGER,
  "reviewed_at" TIMESTAMP(3),
  "review_remarks" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "iti_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "iti_submissions_iti_id_fkey" FOREIGN KEY ("iti_id") REFERENCES "itis"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "iti_submissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "iti_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "iti_submissions_report_type_check" CHECK ("report_type" IN ('PERSONNEL','TRAINING','INFRASTRUCTURE','STUDENT_PROGRESS','MONTHLY_PROGRESS','OTHER')),
  CONSTRAINT "iti_submissions_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','REVISION_REQUESTED','APPROVED','REJECTED'))
);
CREATE INDEX "idx_iti_submissions_iti_status" ON "iti_submissions"("iti_id","status");
CREATE INDEX "idx_iti_submissions_created_by" ON "iti_submissions"("created_by");
CREATE INDEX "idx_iti_submissions_submitted_at" ON "iti_submissions"("submitted_at");
