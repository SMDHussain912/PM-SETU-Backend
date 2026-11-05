import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import { prisma, disconnectPrisma } from "../../src/config/database";
import * as documentService from "../../src/modules/documents/document.service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let rollbackDocumentId: number;
let successDocumentId: number;

async function createDocument(title: string): Promise<number> {
    const result = await pool.query<{ id: number }>(
        "INSERT INTO documents (title, publish_status, version) VALUES ($1, 'DRAFT', 1) RETURNING id",
        [title],
    );
    return result.rows[0].id;
}

test.before(async () => {
    await prisma.$connect();
    rollbackDocumentId = await createDocument("CI document before failed audit");
    successDocumentId = await createDocument("CI document before successful audit");

    await pool.query(`
        CREATE OR REPLACE FUNCTION ci_reject_document_audit() RETURNS trigger AS $$
        BEGIN
            IF NEW.entity = 'DOCUMENT'
               AND NEW.entity_id = ${rollbackDocumentId}
               AND NEW.action = 'UPDATE' THEN
                RAISE EXCEPTION 'intentional CI document audit failure';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);
    await pool.query(
        "CREATE TRIGGER ci_reject_document_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION ci_reject_document_audit()",
    );
});

test.after(async () => {
    await pool.query("DROP TRIGGER IF EXISTS ci_reject_document_audit ON audit_logs");
    await pool.query("DROP FUNCTION IF EXISTS ci_reject_document_audit()");
    await pool.query(
        "DELETE FROM audit_logs WHERE entity = 'DOCUMENT' AND entity_id = ANY($1::int[])",
        [[rollbackDocumentId, successDocumentId].filter(Boolean)],
    );
    await pool.query(
        "DELETE FROM documents WHERE id = ANY($1::int[])",
        [[rollbackDocumentId, successDocumentId].filter(Boolean)],
    );
    await disconnectPrisma();
    await pool.end();
});

const auditContext = {
    userId: "ci-document-actor",
    ipAddress: "127.0.0.1",
    userAgent: "PM-SETU CI",
    path: "/api/v1/admin/documents",
};

test("document update rolls back when its audit insert fails", async () => {
    await assert.rejects(
        documentService.updateDocument(
            rollbackDocumentId,
            { title: "This update must roll back" },
            auditContext,
        ),
        /intentional CI document audit failure/,
    );

    const result = await pool.query<{ title: string }>(
        "SELECT title FROM documents WHERE id = $1",
        [rollbackDocumentId],
    );
    assert.equal(result.rows[0]?.title, "CI document before failed audit");
});

test("document update and its audit entry commit together", async () => {
    const updated = await documentService.updateDocument(
        successDocumentId,
        { title: "Updated document with audit" },
        auditContext,
    );
    assert.equal(updated.title, "Updated document with audit");

    const audit = await pool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM audit_logs WHERE entity = 'DOCUMENT' AND entity_id = $1 AND action = 'UPDATE'",
        [successDocumentId],
    );
    assert.equal(audit.rows[0]?.count, "1");
});
