import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/config/database";
import { recordFailedLogin } from "../src/modules/auth/auth.repository";
import { assertDedicatedTestDatabaseUrl } from "./helpers/test-database";

const databaseUrl = process.env.PM_SETU_TEST_DATABASE_URL;

test("PostgreSQL atomically counts concurrent failed logins and applies lockout", {
    skip: !databaseUrl ? "Set PM_SETU_TEST_DATABASE_URL to a dedicated migrated test database" : false,
}, async () => {
    if (!databaseUrl) return;
    assertDedicatedTestDatabaseUrl(databaseUrl, "PM_SETU_TEST_DATABASE_URL");
    assert.equal(process.env.TEST_DATABASE_URL, databaseUrl);

    const username = `auth_lockout_race_${randomUUID().replace(/-/g, "")}`;
    let userId: number | undefined;

    try {
        const inserted = await prisma.$queryRaw<Array<{ id: number }>>`
            INSERT INTO users (
                username, password_hash, full_name, email, status,
                failed_login_attempts, locked_until, updated_at
            )
            VALUES (${username}, 'test-only-not-a-real-password-hash', ${username},
                    NULL, 'ACTIVE', 0, NULL, NOW())
            RETURNING id
        `;
        userId = inserted[0]?.id;
        assert.ok(userId);

        const lockUntil = new Date(Date.now() + 120_000);
        await Promise.all(
            Array.from({ length: 4 }, () =>
                recordFailedLogin(userId!, 5, lockUntil),
            ),
        );

        let state = await prisma.$queryRaw<Array<{
            failed_login_attempts: number;
            locked_until: Date | null;
        }>>`
            SELECT failed_login_attempts, locked_until
            FROM users WHERE id = ${userId}
        `;
        assert.equal(state[0]?.failed_login_attempts, 4);
        assert.equal(state[0]?.locked_until, null);

        await Promise.all(
            Array.from({ length: 12 }, () =>
                recordFailedLogin(userId!, 5, lockUntil),
            ),
        );

        state = await prisma.$queryRaw<Array<{
            failed_login_attempts: number;
            locked_until: Date | null;
        }>>`
            SELECT failed_login_attempts, locked_until
            FROM users WHERE id = ${userId}
        `;
        assert.equal(state[0]?.failed_login_attempts, 0);
        assert.ok(state[0]?.locked_until instanceof Date);
        assert.ok(state[0].locked_until.getTime() > Date.now());
    } finally {
        if (userId !== undefined) {
            await prisma.$executeRaw`DELETE FROM users WHERE id = ${userId}`.catch(() => undefined);
        }
    }
});
