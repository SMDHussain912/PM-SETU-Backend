-- Defense-in-depth constraints for technical finance import metadata.
-- These checks do not represent accounting approval or financial acceptance.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "finance_import_batches"
        WHERE "record_kind" NOT IN ('OUTLAY', 'RELEASE', 'EXPENDITURE')
           OR "lifecycle" NOT IN ('PREVIEWED', 'INVALID', 'EXECUTED', 'EXECUTED_WITH_REJECTIONS', 'EXECUTION_BLOCKED')
           OR "total_rows" < 0
           OR "valid_rows" < 0
           OR "invalid_rows" < 0
           OR "attempted_rows" < 0
           OR "created_rows" < 0
           OR "duplicate_rows" < 0
           OR "rejected_rows" < 0
           OR "total_rows" <> "valid_rows" + "invalid_rows"
           OR "attempted_rows" <> "created_rows" + "duplicate_rows" + "rejected_rows"
    ) THEN
        RAISE EXCEPTION 'Existing finance import batch metadata violates integrity constraints';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "finance_import_batch_rows"
        WHERE "row_number" < 2
           OR "outcome" NOT IN ('VALID', 'INVALID', 'CREATED', 'DUPLICATE', 'REJECTED')
    ) THEN
        RAISE EXCEPTION 'Existing finance import batch row metadata violates integrity constraints';
    END IF;
END $$;

ALTER TABLE "finance_import_batches"
    ADD CONSTRAINT "finance_import_batches_record_kind_check"
        CHECK ("record_kind" IN ('OUTLAY', 'RELEASE', 'EXPENDITURE')),
    ADD CONSTRAINT "finance_import_batches_lifecycle_check"
        CHECK ("lifecycle" IN ('PREVIEWED', 'INVALID', 'EXECUTED', 'EXECUTED_WITH_REJECTIONS', 'EXECUTION_BLOCKED')),
    ADD CONSTRAINT "finance_import_batches_counters_nonnegative_check"
        CHECK (
            "total_rows" >= 0
            AND "valid_rows" >= 0
            AND "invalid_rows" >= 0
            AND "attempted_rows" >= 0
            AND "created_rows" >= 0
            AND "duplicate_rows" >= 0
            AND "rejected_rows" >= 0
        ),
    ADD CONSTRAINT "finance_import_batches_total_rows_check"
        CHECK ("total_rows" = "valid_rows" + "invalid_rows"),
    ADD CONSTRAINT "finance_import_batches_attempted_rows_check"
        CHECK ("attempted_rows" = "created_rows" + "duplicate_rows" + "rejected_rows");

ALTER TABLE "finance_import_batch_rows"
    ADD CONSTRAINT "finance_import_batch_rows_row_number_check"
        CHECK ("row_number" >= 2),
    ADD CONSTRAINT "finance_import_batch_rows_outcome_check"
        CHECK ("outcome" IN ('VALID', 'INVALID', 'CREATED', 'DUPLICATE', 'REJECTED'));
