-- Phase 6: finance ledger foundation.
-- This migration creates storage only. It does not enable finance APIs,
-- grant permissions, calculate official KPIs, or assert a Finance accounting
-- policy. Recognition basis and scope vocabulary remain subject to sign-off.

CREATE TABLE "finance_approved_outlays" (
    "id" SERIAL NOT NULL,
    "sanction_reference" TEXT NOT NULL,
    "sanction_date" DATE NOT NULL,
    "financial_year" TEXT NOT NULL,
    "approved_amount" DECIMAL(18,2) NOT NULL,
    "scope_level" TEXT NOT NULL,
    "cluster_id" INTEGER,
    "iti_id" INTEGER,
    "project_reference" TEXT,
    "source_system" TEXT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_updated_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "finance_approved_outlays_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "finance_approved_outlays_amount_nonnegative" CHECK ("approved_amount" >= 0),
    CONSTRAINT "finance_approved_outlays_cluster_fkey"
        FOREIGN KEY ("cluster_id") REFERENCES "clusters"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "finance_approved_outlays_iti_fkey"
        FOREIGN KEY ("iti_id") REFERENCES "itis"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "finance_fund_releases" (
    "id" SERIAL NOT NULL,
    "outlay_id" INTEGER NOT NULL,
    "release_reference" TEXT NOT NULL,
    "release_date" DATE NOT NULL,
    "financial_year" TEXT NOT NULL,
    "released_amount" DECIMAL(18,2) NOT NULL,
    "recipient_reference" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_updated_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "finance_fund_releases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "finance_fund_releases_amount_nonnegative" CHECK ("released_amount" >= 0),
    CONSTRAINT "finance_fund_releases_outlay_fkey"
        FOREIGN KEY ("outlay_id") REFERENCES "finance_approved_outlays"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "finance_expenditures" (
    "id" SERIAL NOT NULL,
    "outlay_id" INTEGER NOT NULL,
    "release_id" INTEGER,
    "transaction_reference" TEXT NOT NULL,
    "transaction_date" DATE NOT NULL,
    "financial_year" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "payee_reference" TEXT,
    "evidence_reference" TEXT,
    "recognition_basis" TEXT NOT NULL,
    "source_system" TEXT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_updated_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "finance_expenditures_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "finance_expenditures_amount_nonnegative" CHECK ("amount" >= 0),
    CONSTRAINT "finance_expenditures_outlay_fkey"
        FOREIGN KEY ("outlay_id") REFERENCES "finance_approved_outlays"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "finance_expenditures_release_fkey"
        FOREIGN KEY ("release_id") REFERENCES "finance_fund_releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_finance_outlays_source"
    ON "finance_approved_outlays"("source_system", "source_record_id");
CREATE INDEX "idx_finance_outlays_year_cluster"
    ON "finance_approved_outlays"("financial_year", "cluster_id");
CREATE INDEX "idx_finance_outlays_year_iti"
    ON "finance_approved_outlays"("financial_year", "iti_id");
CREATE INDEX "idx_finance_outlays_sanction"
    ON "finance_approved_outlays"("sanction_reference");

CREATE UNIQUE INDEX "uq_finance_releases_source"
    ON "finance_fund_releases"("source_system", "source_record_id");
CREATE INDEX "idx_finance_releases_outlay"
    ON "finance_fund_releases"("outlay_id");
CREATE INDEX "idx_finance_releases_year"
    ON "finance_fund_releases"("financial_year");
CREATE INDEX "idx_finance_releases_reference"
    ON "finance_fund_releases"("release_reference");

CREATE UNIQUE INDEX "uq_finance_expenditures_source"
    ON "finance_expenditures"("source_system", "source_record_id");
CREATE INDEX "idx_finance_expenditures_outlay"
    ON "finance_expenditures"("outlay_id");
CREATE INDEX "idx_finance_expenditures_release"
    ON "finance_expenditures"("release_id");
CREATE INDEX "idx_finance_expenditures_year"
    ON "finance_expenditures"("financial_year");
CREATE INDEX "idx_finance_expenditures_reference"
    ON "finance_expenditures"("transaction_reference");
