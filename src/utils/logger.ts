import { env } from "../config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const SINKS: Record<LogLevel, (message: string, ...rest: unknown[]) => void> = {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
};

const configuredLevel: LogLevel =
    env.logLevel && env.logLevel in LEVELS
        ? (env.logLevel as LogLevel)
        : env.isProduction
          ? "info"
          : "debug";

function log(level: LogLevel, message: string, meta?: unknown): void {
    if (LEVELS[level] < LEVELS[configuredLevel]) {
        return;
    }
    const timestamp = new Date().toISOString();
    if (meta === undefined) {
        SINKS[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        return;
    }
    SINKS[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta);
}

/** Minimal structured console logger (no external dependencies). */
export const logger = {
    debug: (message: string, meta?: unknown) => log("debug", message, meta),
    info: (message: string, meta?: unknown) => log("info", message, meta),
    warn: (message: string, meta?: unknown) => log("warn", message, meta),
    error: (message: string, meta?: unknown) => log("error", message, meta),
};
