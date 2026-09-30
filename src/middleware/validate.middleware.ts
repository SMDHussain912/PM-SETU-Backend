import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodType } from "zod";
import { ApiError } from "../utils/response";

export interface ValidationSchemas<TBody, TQuery, TParams> {
    body?: ZodType<TBody>;
    query?: ZodType<TQuery>;
    params?: ZodType<TParams>;
}

export interface ValidatedData<TBody = unknown, TQuery = unknown, TParams = unknown> {
    body: TBody;
    query: TQuery;
    params: TParams;
}

export interface ValidatedLocals<TBody = unknown, TQuery = unknown, TParams = unknown> {
    validated: ValidatedData<TBody, TQuery, TParams>;
}

/**
 * Zod validation middleware. Usage in routes:
 *   router.post("/things", validate({ body: createThingSchema }), controller);
 *
 * Express 5 note: `req.query` is a getter-only property, so parsed query and
 * params are exposed via res.locals.validated — read them in controllers with
 * getValidated(res). The parsed body is also assigned back to req.body.
 */
export const validate =
    <TBody, TQuery, TParams>({
        body,
        query,
        params,
    }: ValidationSchemas<TBody, TQuery, TParams>) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const parsedBody = body ? body.safeParse(req.body) : undefined;
        const parsedQuery = query ? query.safeParse(req.query) : undefined;
        const parsedParams = params ? params.safeParse(req.params) : undefined;

        const failures: ZodError[] = [];
        if (parsedBody && !parsedBody.success) failures.push(parsedBody.error);
        if (parsedQuery && !parsedQuery.success) failures.push(parsedQuery.error);
        if (parsedParams && !parsedParams.success) failures.push(parsedParams.error);

        if (failures.length > 0) {
            const details: Record<string, string[]> = {};
            for (const failure of failures) {
                for (const issue of failure.issues) {
                    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
                    (details[key] ??= []).push(issue.message);
                }
            }
            next(
                new ApiError({
                    message: "Validation failed",
                    statusCode: 422,
                    code: "VALIDATION_ERROR",
                    details,
                }),
            );
            return;
        }

        const validated: ValidatedData<TBody, TQuery, TParams> = {
            body: parsedBody?.success ? parsedBody.data : (req.body as TBody),
            query: parsedQuery?.success ? parsedQuery.data : (req.query as TQuery),
            params: parsedParams?.success ? parsedParams.data : (req.params as TParams),
        };

        if (parsedBody?.success) {
            req.body = parsedBody.data;
        }
        (res.locals as ValidatedLocals<TBody, TQuery, TParams>).validated = validated;

        next();
    };

/** Reads the parsed request data inside controllers. */
export function getValidated<
    TBody = unknown,
    TQuery = unknown,
    TParams = unknown,
>(res: Response): ValidatedData<TBody, TQuery, TParams> {
    return (res.locals as ValidatedLocals<TBody, TQuery, TParams>).validated;
}
