import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI configuration (Prisma 7). Keep CLI migrations pointed at the
// dedicated test database whenever tests are being run. Never fall back to the
// development DATABASE_URL in test mode.
const isTest = process.env.NODE_ENV === "test";
const databaseUrl = isTest
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        isTest
            ? "TEST_DATABASE_URL is required when NODE_ENV=test; refusing to use DATABASE_URL."
            : "DATABASE_URL is required for Prisma CLI commands.",
    );
}

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
        // Prisma 7 reads the seed command from here (not from package.json).
        // prisma/seed.ts holds structural reference data only — see the policy
        // note at the top of that file before adding anything to it.
        seed: "tsx prisma/seed.ts",
    },
    datasource: {
        url: databaseUrl,
    },
});
