import assert from "node:assert/strict";
import test from "node:test";
import { assertDedicatedTestDatabaseUrl } from "../helpers/test-database";
import { prisma } from "../../src/config/database";
import { recordAuditEntry } from "../../src/modules/audit/audit.service";

test("workflow writes roll back when the transaction-scoped audit insert fails", {
    skip: !process.env.TEST_DATABASE_URL,
}, async () => {
    assertDedicatedTestDatabaseUrl(process.env.TEST_DATABASE_URL);
    await prisma.$executeRaw`DROP TABLE IF EXISTS public.ci_workflow_atomicity_probe`;

    await assert.rejects(
        prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
                CREATE TABLE public.ci_workflow_atomicity_probe (
                    id integer PRIMARY KEY
                )
            `;
            await tx.$executeRaw`
                INSERT INTO public.ci_workflow_atomicity_probe (id) VALUES (1)
            `;

            // audit_logs.user_id is NOT NULL. Deliberately violate that
            // constraint to prove the enclosing business transaction aborts.
            await recordAuditEntry({
                userId: null as unknown as string,
                action: "TEST",
                entity: "WORKFLOW_ATOMICITY_PROBE",
                entityId: 1,
                oldValue: null,
                newValue: { status: "WRITTEN" },
                approvalStatus: null,
                context: {},
            }, tx);
        }),
    );

    const rows = await prisma.$queryRaw<{ table_name: string | null }[]>`
        SELECT to_regclass('public.ci_workflow_atomicity_probe')::text AS table_name
    `;
    assert.equal(rows[0]?.table_name, null, "business write should roll back with audit failure");
});
