-- AlterTable
ALTER TABLE "aips" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "clusters" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "contact_messages" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "gallery_items" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "governance_members" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "itis" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "news" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sips" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "spvs" ADD COLUMN     "is_sample" BOOLEAN NOT NULL DEFAULT false;

-- Index the demo marker so the pre-go-live cleanup is a single indexed scan:
--   DELETE FROM <table> WHERE is_sample;
CREATE INDEX "idx_clusters_is_sample" ON "clusters" ("is_sample");
CREATE INDEX "idx_itis_is_sample" ON "itis" ("is_sample");
CREATE INDEX "idx_aips_is_sample" ON "aips" ("is_sample");
CREATE INDEX "idx_spvs_is_sample" ON "spvs" ("is_sample");
CREATE INDEX "idx_sips_is_sample" ON "sips" ("is_sample");
CREATE INDEX "idx_governance_members_is_sample" ON "governance_members" ("is_sample");
CREATE INDEX "idx_documents_is_sample" ON "documents" ("is_sample");
CREATE INDEX "idx_news_is_sample" ON "news" ("is_sample");
CREATE INDEX "idx_gallery_items_is_sample" ON "gallery_items" ("is_sample");
CREATE INDEX "idx_contact_messages_is_sample" ON "contact_messages" ("is_sample");
CREATE INDEX "idx_banners_is_sample" ON "banners" ("is_sample");
