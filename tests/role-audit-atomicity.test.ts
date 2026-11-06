import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("role mutations and their audit entries share one database transaction", () => {
    const service = readFileSync(resolve(process.cwd(), "src/modules/roles/role.service.ts"), "utf8");
    const repository = readFileSync(resolve(process.cwd(), "src/modules/roles/role.repository.ts"), "utf8");

    for (const mutation of ["createRole", "updateRole", "deleteRole"]) {
        const start = service.indexOf(`export async function ${mutation}(`);
        assert.notEqual(start, -1, `Missing ${mutation} service`);
        const next = service.indexOf("\nexport async function ", start + 1);
        const body = service.slice(start, next === -1 ? service.length : next);

        assert.match(body, /return prisma\.\$transaction\(async \(tx\) =>/);
        assert.match(body, /recordAuditEntry\([\s\S]*?\}, tx\)/);
        assert.match(body, /roleRepository\.(?:createRole|updateRole|deleteRole|getRoleById)\([\s\S]*?tx\)/);
    }

    assert.match(repository, /createRole\([\s\S]*?transaction\?: Prisma\.TransactionClient/);
    assert.match(repository, /updateRole\([\s\S]*?transaction\?: Prisma\.TransactionClient/);
    assert.match(repository, /deleteRole\(id: number, transaction\?: Prisma\.TransactionClient\)/);
    assert.match(repository, /getRoleById\(id: number, tx\?: Prisma\.TransactionClient\)/);
});
