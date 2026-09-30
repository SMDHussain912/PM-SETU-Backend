import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

if (!env.databaseUrl) {
    throw new Error(
        'DATABASE_URL is not set. Add it to your .env file, e.g. DATABASE_URL="postgresql://user:password@localhost:5432/pm_setu?schema=public"',
    );
}

// Prisma 7 requires a driver adapter for direct database connections.
// See: https://pris.ly/d/prisma7-client-config
// Cache the client on globalThis so hot reloads (tsx watch) reuse the same
// PrismaClient instead of opening a new connection pool on every restart.
// See: https://pris.ly/d/prisma-client-best-practices
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter: new PrismaPg({ connectionString: env.databaseUrl }),
        log: env.isProduction ? ["error"] : ["query", "warn", "error"],
    });

if (!env.isProduction) {
    globalForPrisma.prisma = prisma;
}

// Prisma connects lazily on the first query. These helpers exist for server
// startup/shutdown flows and health checks. No business queries belong here.
export async function connectPrisma(): Promise<void> {
    await prisma.$connect();
}

export async function disconnectPrisma(): Promise<void> {
    await prisma.$disconnect();
}

