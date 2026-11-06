import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { updateStatusPreservingSuperAdmin } from "../src/modules/users/user.repository";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL serializes concurrent deactivation of the last two Super Admins", {
    skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
    if (!databaseUrl) return;
    assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");
    assert.equal(process.env.TEST_DATABASE_URL, databaseUrl);

    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
    const suffix = randomUUID().replace(/-/g, "");
    const usernames = [`super_admin_race_a_${suffix}`, `super_admin_race_b_${suffix}`];
    const userIds: number[] = [];
    let roleId: number | undefined;
    let createdRole = false;

    try {
        await client.$connect();
        const existing = await client.$queryRaw<Array<{ total: number }>>`
            SELECT COUNT(DISTINCT u.id)::int AS total
            FROM users u JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE u.status = 'ACTIVE' AND r.code = 'super_admin'
        `;
        assert.equal(existing[0]?.total ?? 0, 0, "test database must not contain active Super Admin fixtures");

        const inserted = await client.$queryRaw<Array<{ id: number }>>`
            INSERT INTO roles (code, name, description, is_system)
            VALUES ('super_admin', 'Super Administrator', 'Concurrency test fixture', TRUE)
            ON CONFLICT (code) DO NOTHING RETURNING id
        `;
        createdRole = inserted.length === 1;
        const roles = await client.$queryRaw<Array<{ id: number }>>`
            SELECT id FROM roles WHERE code = 'super_admin'
        `;
        assert.ok(roles[0]);
        roleId = roles[0].id;

        for (const username of usernames) {
            const rows = await client.$queryRaw<Array<{ id: number }>>`
                INSERT INTO users (username, password_hash, full_name, email, status, updated_at)
                VALUES (${username}, 'test-only-not-a-real-password-hash', ${username}, NULL, 'ACTIVE', NOW())
                RETURNING id
            `;
            const id = rows[0].id;
            userIds.push(id);
            await client.$executeRaw`
                INSERT INTO user_roles (user_id, role_id) VALUES (${id}, ${roleId})
            `;
        }

        const outcomes = await Promise.allSettled(
            userIds.map((id) => updateStatusPreservingSuperAdmin(id, "INACTIVE")),
        );
        assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
        const rejected = outcomes.filter((result): result is PromiseRejectedResult => result.status === "rejected");
        assert.equal(rejected.length, 1);
        assert.equal(rejected[0].reason?.code, "LAST_SUPER_ADMIN");

        const remaining = await client.$queryRaw<Array<{ total: number }>>`
            SELECT COUNT(DISTINCT u.id)::int AS total
            FROM users u JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE u.status = 'ACTIVE' AND r.code = 'super_admin'
        `;
        assert.equal(remaining[0]?.total, 1);
    } finally {
        await client.$executeRaw`
            DELETE FROM users WHERE username = ${usernames[0]} OR username = ${usernames[1]}
        `.catch(() => undefined);
        if (createdRole && roleId !== undefined) {
            await client.$executeRaw`DELETE FROM roles WHERE id = ${roleId}`.catch(() => undefined);
        }
        await client.$disconnect();
    }
});
