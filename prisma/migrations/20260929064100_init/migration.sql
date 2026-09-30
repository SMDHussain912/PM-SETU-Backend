-- CreateTable
CREATE TABLE "clusters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "sector" TEXT NOT NULL,

    CONSTRAINT "clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itis" (
    "id" SERIAL NOT NULL,
    "iti_code" TEXT NOT NULL,
    "iti_name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "cluster_id" INTEGER,
    "address" TEXT,
    "principal" TEXT,
    "contact" TEXT,
    "email" TEXT,
    "existing_trades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proposed_trades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "student_strength" INTEGER,
    "infrastructure" TEXT,
    "lab_details" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "itis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aips" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "investment_amount" DECIMAL(18,2),
    "logo_url" TEXT,
    "cluster_id" INTEGER,
    "academic_partner" BOOLEAN NOT NULL DEFAULT false,
    "contact" TEXT,
    "website" TEXT,

    CONSTRAINT "aips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spvs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cluster_id" INTEGER,
    "aip_id" INTEGER,

    CONSTRAINT "spvs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sips" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "cluster_id" INTEGER,
    "aip_id" INTEGER,
    "submission_date" DATE,
    "version" INTEGER,
    "proposed_investment" DECIMAL(18,2),
    "infrastructure_contribution" DECIMAL(18,2),
    "equipment_contribution" DECIMAL(18,2),
    "training_contribution" DECIMAL(18,2),
    "industry_contribution" DECIMAL(18,2),
    "government_contribution" DECIMAL(18,2),
    "approval_date" DATE,
    "remarks" TEXT,

    CONSTRAINT "sips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "governance_members" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "organisation" TEXT,
    "role" TEXT,
    "photograph" TEXT,
    "email" TEXT,
    "contact" TEXT,
    "display_order" INTEGER,
    "effective_date" DATE,

    CONSTRAINT "governance_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "document_number" TEXT,
    "type" TEXT,
    "department" TEXT,
    "issue_date" DATE,
    "financial_year" TEXT,
    "cluster_id" INTEGER,
    "keywords" TEXT,
    "publish_status" TEXT,
    "version" INTEGER,
    "file_path" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "original_name" TEXT,
    "language" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "file_path" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "original_name" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "content" TEXT,
    "published_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "category" TEXT,
    "cluster_id" INTEGER,
    "thumbnail_url" TEXT,
    "is_published" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_attachments" (
    "id" SERIAL NOT NULL,
    "news_id" INTEGER NOT NULL,
    "file_path" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_items" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "type" TEXT,
    "media_url" TEXT,
    "thumbnail_url" TEXT,
    "published_date" TIMESTAMP(3),
    "category" TEXT,
    "is_published" BOOLEAN DEFAULT false,
    "display_order" INTEGER,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "desktop_image_url" TEXT,
    "mobile_image_url" TEXT,
    "cta_text" TEXT,
    "cta_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_published" BOOLEAN DEFAULT false,
    "is_archived" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" SERIAL NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submitted_by" TEXT,
    "reviewed_by" TEXT,
    "approved_by" TEXT,
    "remarks" TEXT,
    "stage" TEXT,
    "assigned_to" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "decision_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "approval_status" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "path" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_clusters_name" ON "clusters"("name");

-- CreateIndex
CREATE INDEX "idx_clusters_district" ON "clusters"("district");

-- CreateIndex
CREATE INDEX "idx_clusters_sector" ON "clusters"("sector");

-- CreateIndex
CREATE INDEX "idx_itis_iti_name" ON "itis"("iti_name");

-- CreateIndex
CREATE INDEX "idx_itis_district" ON "itis"("district");

-- CreateIndex
CREATE INDEX "idx_itis_type" ON "itis"("type");

-- CreateIndex
CREATE INDEX "idx_itis_cluster_id" ON "itis"("cluster_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_itis_iti_code" ON "itis"("iti_code");

-- CreateIndex
CREATE INDEX "idx_aips_name" ON "aips"("name");

-- CreateIndex
CREATE INDEX "idx_aips_sector" ON "aips"("sector");

-- CreateIndex
CREATE INDEX "idx_aips_status" ON "aips"("status");

-- CreateIndex
CREATE INDEX "idx_aips_cluster_id" ON "aips"("cluster_id");

-- CreateIndex
CREATE INDEX "idx_spvs_name" ON "spvs"("name");

-- CreateIndex
CREATE INDEX "idx_spvs_status" ON "spvs"("status");

-- CreateIndex
CREATE INDEX "idx_spvs_cluster_id" ON "spvs"("cluster_id");

-- CreateIndex
CREATE INDEX "idx_spvs_aip_id" ON "spvs"("aip_id");

-- CreateIndex
CREATE INDEX "idx_sips_status" ON "sips"("status");

-- CreateIndex
CREATE INDEX "idx_sips_cluster_id" ON "sips"("cluster_id");

-- CreateIndex
CREATE INDEX "idx_sips_aip_id" ON "sips"("aip_id");

-- CreateIndex
CREATE INDEX "idx_governance_members_display_order" ON "governance_members"("display_order");

-- CreateIndex
CREATE INDEX "idx_documents_type" ON "documents"("type");

-- CreateIndex
CREATE INDEX "idx_documents_department" ON "documents"("department");

-- CreateIndex
CREATE INDEX "idx_documents_financial_year" ON "documents"("financial_year");

-- CreateIndex
CREATE INDEX "idx_documents_issue_date" ON "documents"("issue_date");

-- CreateIndex
CREATE INDEX "idx_documents_cluster_id" ON "documents"("cluster_id");

-- CreateIndex
CREATE INDEX "idx_documents_publish_status" ON "documents"("publish_status");

-- CreateIndex
CREATE UNIQUE INDEX "idx_document_versions_document_id_version" ON "document_versions"("document_id", "version");

-- CreateIndex
CREATE INDEX "idx_news_published_date" ON "news"("published_date");

-- CreateIndex
CREATE INDEX "idx_news_category" ON "news"("category");

-- CreateIndex
CREATE INDEX "idx_news_is_published" ON "news"("is_published");

-- CreateIndex
CREATE INDEX "idx_news_cluster_id" ON "news"("cluster_id");

-- CreateIndex
CREATE INDEX "idx_news_attachments_news_id" ON "news_attachments"("news_id");

-- CreateIndex
CREATE INDEX "idx_gallery_items_type" ON "gallery_items"("type");

-- CreateIndex
CREATE INDEX "idx_gallery_items_published_date" ON "gallery_items"("published_date");

-- CreateIndex
CREATE INDEX "idx_gallery_items_display_order" ON "gallery_items"("display_order");

-- CreateIndex
CREATE INDEX "idx_gallery_items_is_published" ON "gallery_items"("is_published");

-- CreateIndex
CREATE INDEX "idx_banners_is_published" ON "banners"("is_published");

-- CreateIndex
CREATE INDEX "idx_banners_is_archived" ON "banners"("is_archived");

-- CreateIndex
CREATE INDEX "idx_banners_display_order" ON "banners"("display_order");

-- CreateIndex
CREATE INDEX "idx_contact_messages_status" ON "contact_messages"("status");

-- CreateIndex
CREATE INDEX "idx_contact_messages_created_at" ON "contact_messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "idx_user_roles_role_id" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "idx_approvals_entity_type_entity_id" ON "approvals"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_approvals_status" ON "approvals"("status");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity_entity_id" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "itis" ADD CONSTRAINT "itis_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aips" ADD CONSTRAINT "aips_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spvs" ADD CONSTRAINT "spvs_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spvs" ADD CONSTRAINT "spvs_aip_id_fkey" FOREIGN KEY ("aip_id") REFERENCES "aips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sips" ADD CONSTRAINT "sips_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sips" ADD CONSTRAINT "sips_aip_id_fkey" FOREIGN KEY ("aip_id") REFERENCES "aips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_attachments" ADD CONSTRAINT "news_attachments_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- WS-0 domain CHECK constraints
--
-- Prisma cannot express CHECK constraints, so they are added here. Text +
-- CHECK (rather than a Postgres ENUM) is deliberate: the SQL contracts mark
-- most of these vocabularies "TO CONFIRM", and a CHECK can be relaxed with a
-- single ALTER without the type-migration dance an ENUM requires.
-- See MASTER_PLAN.md §4.2 rule 4.
-- ============================================================================

-- Rule 1 (critical): home_kpis.sql filters WHERE itis.type = 'HUB' / 'SPOKE'.
-- Any other stored casing silently returns 0 for the Hub/Spoke KPIs.
ALTER TABLE "itis"
  ADD CONSTRAINT "itis_type_check" CHECK (type IN ('HUB', 'SPOKE'));

-- Rule 2: sips.status must contain 'SUBMITTED' and 'APPROVED' (KPI contract)
-- plus the seven canonical §10 workflow states.
ALTER TABLE "sips"
  ADD CONSTRAINT "sips_status_check" CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'UNDER_SCRUTINY', 'REVISION_REQUESTED',
    'RECOMMENDED', 'APPROVED', 'IMPLEMENTATION'
  ));

-- §9 lifecycle states, verbatim from the specification.
ALTER TABLE "spvs"
  ADD CONSTRAINT "spvs_status_check" CHECK (status IN (
    'PROPOSED', 'UNDER_FORMATION', 'INCORPORATED', 'OPERATIONAL'
  ));

-- gallery_items.type drives the /photos and /videos endpoints.
ALTER TABLE "gallery_items"
  ADD CONSTRAINT "gallery_items_type_check"
  CHECK (type IS NULL OR type IN ('PHOTO', 'VIDEO', 'PRESS_RELEASE'));

-- users.status — DELETE is a soft delete (status = 'INACTIVE').
ALTER TABLE "users"
  ADD CONSTRAINT "users_status_check" CHECK (status IN ('ACTIVE', 'INACTIVE'));

-- Triage vocabulary (INFERRED, TO CONFIRM per contact_queries.sql).
ALTER TABLE "contact_messages"
  ADD CONSTRAINT "contact_messages_status_check"
  CHECK (status IN ('NEW', 'READ', 'REPLIED', 'ARCHIVED'));

-- Approval workflow vocabulary (PROPOSED, TO CONFIRM per approval_queries.sql).
ALTER TABLE "approvals"
  ADD CONSTRAINT "approvals_status_check" CHECK (status IN (
    'PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED',
    'RECOMMENDED', 'APPROVED', 'REJECTED'
  ));

-- itis.photo/trade counts cannot be negative.
ALTER TABLE "itis"
  ADD CONSTRAINT "itis_student_strength_check"
  CHECK (student_strength IS NULL OR student_strength >= 0);
