import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type { SearchQuery } from "./search.schema";
import * as searchService from "./search.service";

/**
 * Search module — controller layer.
 *
 * Thin HTTP adapter: parse validated input, delegate to the service, return
 * the standard envelope. No SQL, no business logic. No try/catch — Express 5
 * forwards rejected async handlers to the central error middleware.
 */

export async function search(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, SearchQuery>(res);
    const result = await searchService.search(query);
    return sendSuccess(res, result);
}
