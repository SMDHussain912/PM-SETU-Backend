import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendSuccess } from "../../utils/response";
import type { GovernanceListQuery, MemberIdParams } from "./governance.schema";
import * as governanceService from "./governance.service";

/**
 * Governance module — HTTP layer (RoadMap.md §11).
 *
 * Thin adapters only: read the validated request data, call the service and
 * shape the response with the shared success envelope. No SQL and no
 * business logic here. Express 5 forwards rejected async handlers to the
 * central error middleware (src/middleware/error.middleware.ts), so no
 * try/catch is needed.
 */

/**
 * GET /api/v1/governance and GET /api/v1/governance/members — paginated
 * directory list. §11 lists both endpoints without defining a distinct
 * behaviour for the root path, so the same handler serves both (alias).
 * TO CONFIRM whether /governance should later become a grouped overview.
 */
export async function listGovernanceMembers(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, GovernanceListQuery>(res);
    const { items, meta } = await governanceService.listGovernanceMembers(query);
    return sendSuccess(res, items, meta);
}

/** GET /api/v1/governance/members/:id — single member (404 via service). */
export async function getGovernanceMemberById(
    _req: Request,
    res: Response,
): Promise<Response> {
    const { params } = getValidated<unknown, unknown, MemberIdParams>(res);
    const member = await governanceService.getGovernanceMemberById(params.id);
    return sendSuccess(res, member);
}
