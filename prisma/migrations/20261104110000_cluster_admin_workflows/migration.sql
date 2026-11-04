CREATE TABLE "cluster_submissions" (
  "id" SERIAL NOT NULL,
  "cluster_id" INTEGER NOT NULL,
  "created_by" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "report_period" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submitted_at" TIMESTAMP(3),
  "reviewed_by" INTEGER,
  "reviewed_at" TIMESTAMP(3),
  "review_remarks" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cluster_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cluster_submissions_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cluster_submissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "cluster_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "cluster_submissions_status_check" CHECK ("status" IN ('DRAFT','SUBMITTED','REVISION_REQUESTED','APPROVED','REJECTED'))
);
CREATE INDEX "idx_cluster_submissions_cluster_status" ON "cluster_submissions"("cluster_id","status");
CREATE INDEX "idx_cluster_submissions_created_by" ON "cluster_submissions"("created_by");
CREATE INDEX "idx_cluster_submissions_submitted_at" ON "cluster_submissions"("submitted_at");
