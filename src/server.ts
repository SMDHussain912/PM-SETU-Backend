import app from "./app";
import { env } from "./config/env";
import { disconnectPrisma } from "./config/database";
import { logger } from "./utils/logger";

const server = app.listen(env.port, () => {
    logger.info(
        `PM SETU AP backend listening on port ${env.port} (${env.nodeEnv})`,
    );
});

server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
        logger.error(`Port ${env.port} is already in use.`);
        process.exit(1);
    }
    logger.error("Server error", error);
    process.exit(1);
});

// Graceful shutdown: stop accepting new connections, close the server, then
// disconnect Prisma before exiting. Forces exit if connections hang.
const SHUTDOWN_TIMEOUT_MS = 10_000;

function shutdown(signal: string): void {
    logger.info(`${signal} received, shutting down...`);

    const forceExitTimer = setTimeout(() => {
        logger.error("Forcing shutdown: connections did not close in time.");
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    // Speed up shutdown: drop idle keep-alive connections immediately while
    // letting in-flight requests finish.
    server.closeIdleConnections();

    server.close(async () => {
        clearTimeout(forceExitTimer);
        try {
            await disconnectPrisma();
            logger.info("Shutdown complete.");
            process.exit(0);
        } catch (error) {
            logger.error("Error during shutdown", error);
            process.exit(1);
        }
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", reason);
});

process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception, exiting.", error);
    process.exit(1);
});
