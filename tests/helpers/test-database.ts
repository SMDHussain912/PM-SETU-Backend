/** Guards destructive PostgreSQL tests against non-test databases. */
export function assertDedicatedTestDatabaseUrl(
    value: string | undefined,
    variableName = "TEST_DATABASE_URL",
): asserts value is string {
    if (!value) {
        throw new Error(`${variableName} is required for this database integration test`);
    }
    if (process.env.NODE_ENV !== "test") {
        throw new Error("Database integration tests require NODE_ENV=test");
    }

    let databaseName: string;
    try {
        const url = new URL(value);
        if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
            throw new Error("unsupported protocol");
        }
        databaseName = decodeURIComponent(url.pathname.slice(1));
    } catch {
        throw new Error(`${variableName} must be a valid PostgreSQL URL`);
    }

    if (!/(?:^|[-_])test$/i.test(databaseName)) {
        throw new Error(
            `Refusing destructive fixtures: ${variableName} database name must end in -test or _test`,
        );
    }
}
