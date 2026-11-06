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
        assert.match(body, /prisma\\.\\$transaction\\(async \\(tx\\) =>/);
        assert.match(body, /recordAuditEntry\\([\\s\\S]*?\\}, tx\\)/);
    }

    assert.match(repository, /createUser\\([\\s\\S]*?db\\?: Prisma\\.TransactionClient/);
    assert.match(repository, /updateUser\\([\\s\\S]*?db: Prisma\\.TransactionClient \\| typeof prisma/);
    assert.match(repository, /updateStatusPreservingSuperAdmin\\([\\s\\S]*?db\\?: Prisma\\.TransactionClient/);
    assert.match(repository, /replaceUserRoles\\(userId: number, roleIds: number\\[\\], db\\?: Prisma\\.TransactionClient/);
    assert.match(repository, /replaceUserScopes\\([\\s\\S]*?db\\?: Prisma\\.TransactionClient/);
    assert.match(repository, /getUserById\\(id: number, db: Prisma\\.TransactionClient/);
});
