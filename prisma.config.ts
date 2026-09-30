import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma CLI configuration (Prisma 7). Used by commands such as
// `prisma migrate dev` / `prisma db push` / `prisma db seed`.
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
        url: env("DATABASE_URL"),
    },
});
