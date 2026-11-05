CREATE TABLE "integration_records" (
  "id" SERIAL PRIMARY KEY,
  "source_id" INTEGER NOT NULL REFERENCES "integration_sources"("id") ON DELETE CASCADE,
  "source_record_id" VARCHAR(200) NOT NULL,
  "source_version" VARCHAR(100),
  "occurred_at" TIMESTAMP(3),
  "payload" JSONB NOT NULL,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "uq_integration_records_source_external" UNIQUE ("source_id", "source_record_id"),
  CONSTRAINT "integration_records_payload_object_check" CHECK (jsonb_typeof("payload") = 'object')
);
CREATE INDEX "idx_integration_records_source_occurred" ON "integration_records"("source_id", "occurred_at");
