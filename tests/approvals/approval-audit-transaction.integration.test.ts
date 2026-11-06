import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { prisma, disconnectPrisma } from "../../src/config/database";
import { transitionApprovalWithAudit } from "../../src/modules/approvals/approval.repository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseTest = databaseUrl ? test : test.skip;
const pool = new Pool({ connectionString: databaseUrl });
let successfulApprovalId: number;
let failingApprovalId: number;
let staleApprovalId: number;

async function createPendingApproval(): Promise<number> {
    const result = await pool.query<{ id: number }>(
        "INSERT INTO approvals (entity_type, entity_id, status, updated_at) VALUES ('DOCUMENT', 9001, 'PENDING', NOW()) RETURNING id",
    );
    return result.rows[0].id;
}

test.before(async () => {
    if (!databaseUrl) return;
    await prisma.$connect();
    successfulApprovalId = await createPendingApproval();
    failingApprovalId = await createPendingApproval();
    staleApprovalId = await createPendingApproval();
    await pool.query(`
        CREATE OR REPLACE FUNCTION ci_reject_selected_audit_insert() RETURNS trigger AS $$
        BEGIN
            IF NEW.action = 'CI_FAIL_AUDIT' THEN
                RAISE EXCEPTION 'intentional CI audit failure';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);
    await pool.query("CREATE TRIGGER ci_reject_selected_audit_insert BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION ci_reject_selected_audit_insert()");
});

test.after(async () => {
    if (!databaseUrl) return;
    await pool.query("DROP TRIGGER IF EXISTS ci_reject_selected_audit_insert ON audit_logs");
    await pool.query("DROP FUNCTION IF EXISTS ci_reject_selected_audit_insert()");
    await pool.query("DELETE FROM audit_logs WHERE entity = 'APPROVAL' AND entity_id = ANY($1::int[])", [[successfulApprovalId, failingApprovalId, staleApprovalId].filter(Boolean)]);
    await pool.query("DELETE FROM approvals WHERE id = ANY($1::int[])", [[successfulApprovalId, failingApprovalId, staleApprovalId].filter(Boolean)]);
    await disconnectPrisma();
    await pool.end();
});

databaseTest("approval transition and audit entry commit together", async () => {
    const result = await transitionApprovalWithAudit({
        id: successfulApprovalId,
        expectedStatus: "PENDING",
        newStatus: "SUBMITTED",
        action: "SUBMIT",
        actingUserId: "ci-atomic-actor",
        auditAction: "SUBMIT",
        path: "/api/v1/admin/approvals/ci/submit",
    });
    assert.equal(result?.status, "SUBMITTED");
    const audit = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM audit_logs WHERE entity = 'APPROVAL' AND entity_id = $1 AND action = 'SUBMIT'",
        [successfulApprovalId],
    );
    assert.equal(audit.rows[0].count, "1");
});

databaseTest("audit insert failure rolls back the approval status transition", async () => {
    await assert.rejects(() => transitionApprovalWithAudit({
        id: failingApprovalId,
        expectedStatus: "PENDING",
        newStatus: "SUBMITTED",
        action: "SUBMIT",
        actingUserId: "ci-atomic-actor",
        auditAction: "CI_FAIL_AUDIT",
    }), /intentional CI audit failure/);

    const approval = await pool.query<{ status: string }>(
        "SELECT status FROM approvals WHERE id = $1",
        [failingApprovalId],
    );
    assert.equal(approval.rows[0]?.status, "PENDING");
    const audit = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM audit_logs WHERE entity = 'APPROVAL' AND entity_id = $1",
        [failingApprovalId],
    );
    assert.equal(audit.rows[0].count, "0");
});

databaseTest("optimistic status guard prevents a stale transition from creating an audit row", async () => {
    // Simulate another transaction changing the row after the caller read PENDING.
    await pool.query("UPDATE approvals SET status = 'SUBMITTED', updated_at = NOW() WHERE id = $1", [staleApprovalId]);

    const result = await transitionApprovalWithAudit({
        id: staleApprovalId,
        expectedStatus: "PENDING",
        newStatus: "UNDER_REVIEW",
        action: "REVIEW",
        actingUserId: "ci-atomic-actor",
        auditAction: "REVIEW",
    });
    assert.equal(result, null);
    const audit = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM audit_logs WHERE entity = 'APPROVAL' AND entity_id = $1",
        [staleApprovalId],
    );
    assert.equal(audit.rows[0].count, "0");
});
