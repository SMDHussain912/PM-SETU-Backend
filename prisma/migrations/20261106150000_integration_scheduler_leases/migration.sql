ALTER TABLE "integration_sources"
  ADD COLUMN "claim_token" UUID,
  ADD COLUMN "claim_expires_at" TIMESTAMP(3);

CREATE INDEX "idx_integration_sources_claim_expiry"
  ON "integration_sources" ("claim_expires_at")
  WHERE "claim_token" IS NOT NULL;
