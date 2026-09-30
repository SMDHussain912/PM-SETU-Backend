import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { z, ZodError } from "zod";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { ApiError, sendError } from "../utils/response";

interface PrismaKnownErrorShape {
    code: string;
    meta?: { target?: string[] | string };
}

function isPrismaKnownError(error: unknown): error is PrismaKnownErrorShape {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string" &&
        /^P\d{4}$/.test((error as { code: string }).code)
    );
}

/** 404 for requests that matched no route. */
export function notFoundHandler(req: Request, res: Response): Response {
    return sendError(
        res,
        404,
        `Route not found: ${req.method} ${req.originalUrl}`,
        "ROUTE_NOT_FOUND",
    );
}

/**
 * Central error handler — must be registered last in app.ts.
 * Express 5 forwards both thrown errors and rejected async handlers here
 * automatically, so controllers need no try/catch boilerplate.
 */
export function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
): Response {
    // If the response already started streaming, sending another response
    // would throw ERR_HTTP_HEADERS_SENT and crash the process. Delegate to
    // Express's default handler, which destroys the socket instead.
    if (res.headersSent) {
        _next(error);
        return res;
    }

    // Body-parser errors (malformed JSON, payload too large)
    if (typeof error === "object" && error !== null && "type" in error) {
        const type = (error as { type?: unknown }).type;
        if (type === "entity.parse.failed") {
            return sendError(res, 400, "Malformed JSON body", "MALFORMED_JSON");
        }
        if (type === "entity.too.large") {
            return sendError(res, 413, "Request body too large", "PAYLOAD_TOO_LARGE");
        }
    }

    if (error instanceof ZodError) {
        return sendError(res, 422, "Validation failed", "VALIDATION_ERROR", z.flattenError(error));
    }

    if (error instanceof ApiError) {
        if (error.statusCode >= 500) {
            logger.error(error.message, { path: req.originalUrl, stack: error.stack });
        }
        return sendError(res, error.statusCode, error.message, error.code, error.details);
    }

    if (error instanceof MulterError) {
        const message =
            error.code === "LIMIT_FILE_SIZE"
                ? "Uploaded file is too large"
                : `File upload error: ${error.code ?? "unknown"}`;
        return sendError(res, error.code === "LIMIT_FILE_SIZE" ? 413 : 400, message, "UPLOAD_ERROR");
    }

    if (isPrismaKnownError(error)) {
        switch (error.code) {
            case "P2002":
                return sendError(
                    res,
                    409,
                    "A record with the same unique value already exists",
                    "DUPLICATE_RECORD",
                    error.meta?.target,
                );
            case "P2025":
                return sendError(res, 404, "Record not found", "RECORD_NOT_FOUND");
            case "P2003":
                return sendError(res, 409, "Operation violates a relation constraint", "RELATION_CONSTRAINT");
            default:
                break;
        }
    }

    logger.error("Unhandled error", {
        path: req.originalUrl,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    });

    // Never leak internals in production
    return sendError(
        res,
        500,
        env.isProduction
            ? "Internal server error"
            : error instanceof Error
              ? error.message
              : String(error),
        "INTERNAL_ERROR",
    );
}
