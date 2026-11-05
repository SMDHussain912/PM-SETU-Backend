-- Distinguish complete execution from selective/partial execution.
-- Existing rows remain unchanged; only the lifecycle vocabulary is expanded.
ALTER TABLE "finance_import_batches"
    DROP CONSTRAINT "finance_import_batches_lifecycle_check",
    ADD CONSTRAINT "finance_import_batches_lifecycle_check"
        CHECK ("lifecycle" IN (
            'PREVIEWED',
            'INVALID',
            'EXECUTED',
            'EXECUTED_WITH_REJECTIONS',
            'PARTIALLY_EXECUTED',
            'PARTIALLY_EXECUTED_WITH_REJECTIONS',
            'EXECUTION_BLOCKED'
        ));
