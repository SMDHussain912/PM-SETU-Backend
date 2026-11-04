-- User-to-organisation scope assignments for cluster, ITI, AIP and SPV roles.
-- Target existence and role/scope compatibility are enforced by the service layer.
CREATE TABLE "user_scope_assignments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_scope_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_scope_assignments_scope_type_check"
        CHECK ("scope_type" IN ('CLUSTER', 'ITI', 'AIP', 'SPV')),
    CONSTRAINT "user_scope_assignments_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_scope_assignments_user_scope_key"
        UNIQUE ("user_id", "scope_type", "scope_id")
);
CREATE INDEX "idx_user_scope_assignments_scope"
    ON "user_scope_assignments"("scope_type", "scope_id");
