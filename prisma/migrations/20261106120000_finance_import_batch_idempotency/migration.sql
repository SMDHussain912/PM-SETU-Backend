-- Stable caller-generated identity for one import attempt.
-- Reuse across transport retries; issue a new UUID for an intentional re-import.
ALTER TABLE "finance_import_batches"
  ADD COLUMN "idempotency_key" VARCHAR(36);

-- Existing historical batches have no caller attempt key. Backfill unique UUIDs
-- so the new non-null contract can be enforced without conflating file hashes.
UPDATE "finance_import_batches"
SET "idempotency_key" = (
  substr(md5(random()::text || clock_timestamp()::text || "id"::text), 1, 8) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text || "id"::text), 9, 4) || '-' ||
  '4' || substr(md5(random()::text || clock_timestamp()::text || "id"::text), 14, 3) || '-' ||
  '8' || substr(md5(random()::text || clock_timestamp()::text || "id"::text), 18, 3) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text || "id"::text), 21, 12)
)
WHERE "idempotency_key" IS NULL;

ALTER TABLE "finance_import_batches"
  ALTER COLUMN "idempotency_key" SET NOT NULL;

CREATE UNIQUE INDEX "uq_finance_import_batches_idempotency_key"
  ON "finance_import_batches"("idempotency_key");
