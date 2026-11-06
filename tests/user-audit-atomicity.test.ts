import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("user mutations and audit inserts share one transaction", () => {
    const service = readFileSync(resolve(process.cwd(), "src/modules/users/user.service.ts"), "utf8");
    const repository = readFileSync(resolve(process.cwd(), "src/modules/users/user.repository.ts"), "utf8");

    for (const mutation of ["createUser", "updateUser", "updateUserStatus", "updateUserRoles", "deactivateUser", "replaceUserScopes"]) {
        const start = service.indexOf(`export async function ${mutation}(`);
        assert.notEqual(start, -1, `Missing ${mutation} service`);
        const next = service.indexOf("\nexport async function ", start + 1);
        const body = service.slice(start, next === -1 ? service.length : next);
        assert.ok(body.includes("prisma.$transaction(async (tx) =>"), `${mutation} must own a transaction`);
        assert.ok(body.includes("}, tx)"), `${mutation} must pass the transaction to audit logging`);
        assert.ok(body.includes("recordAuditEntry("), `${mutation} must write an audit entry`);
    }

    for (const signature of [
        "db?: Prisma.TransactionClient",
        "db: Prisma.TransactionClient | typeof prisma",
        "id: number, db: Prisma.TransactionClient",
        "userId: number, roleIds: number[], db?: Prisma.TransactionClient",
    ]) assert.ok(repository.includes(signature), `Missing transaction-aware repository signature: ${signature}`);
});
