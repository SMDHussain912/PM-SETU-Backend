import type { Response } from "express";

export interface ApiErrorOptions {
    message: string;
    statusCode?: number;
    code?: string;
    details?: unknown;
}

/**
 * Operational error. Throw this anywhere in middleware/services and the
 * central error middleware converts it into the standard error envelope.
 */
export class ApiError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: unknown;

    constructor({
        message,
        statusCode = 500,
        code = "INTERNAL_ERROR",
        details,
    }: ApiErrorOptions) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

export interface SuccessEnvelope<T = unknown> {
    success: true;
    data: T;
    meta?: unknown;
}

export interface ErrorEnvelope {
    success: false;
    error: {
        message: string;
        code: string;
        details?: unknown;
    };
}

export function sendSuccess<T>(
    res: Response,
    data: T,
    meta?: unknown,
    statusCode = 200,
): Response {
    const body: SuccessEnvelope<T> = { success: true, data };
    if (meta !== undefined) {
        body.meta = meta;
    }
    return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T): Response {
    return sendSuccess(res, data, undefined, 201);
}

export function sendError(
    res: Response,
    statusCode: number,
    message: string,
    code = "ERROR",
    details?: unknown,
): Response {
    const body: ErrorEnvelope = {
        success: false,
        error: { message, code },
    };
    if (details !== undefined) {
        body.error.details = details;
    }
    return res.status(statusCode).json(body);
}
