import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendCreated, sendSuccess } from "../../utils/response";
import type {
    CreateUserInput,
    UpdateUserInput,
    UpdateUserRolesInput,
    UpdateUserStatusInput,
    UserIdParams,
    UserListQuery,
    UserScopesInput,
} from "./user.schema";
import * as userService from "./user.service";
import { getAuditContext } from "../audit/audit.context";

/**
 * Users module — controller layer (RoadMap.md §19).
 *
 * Thin HTTP adapters: read validated request data, delegate to the service,
 * shape the response with the shared success envelope. No SQL, no business
 * logic. Express 5 forwards rejected async handlers to the central error
 * middleware, so no try/catch is needed.
 */

/** GET /api/v1/admin/users — paginated, filterable list. */
export async function listUsers(_req: Request, res: Response): Promise<Response> {
    const { query } = getValidated<unknown, UserListQuery>(res);
    const { items, meta } = await userService.listUsers(query);
    return sendSuccess(res, items, meta);
}

/** GET /api/v1/admin/users/:id */
export async function getUserById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, UserIdParams>(res);
    const user = await userService.getUserById(params.id);
    return sendSuccess(res, user);
}

/** POST /api/v1/admin/users — administrative user creation (no self-reg). */
export async function createUser(req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateUserInput>(res);
    const user = await userService.createUser(body, req.user?.id ?? '', req.user?.roles ?? [], getAuditContext(req));
    return sendCreated(res, user);
}

/** PATCH /api/v1/admin/users/:id — profile update only. */
export async function updateUser(req: Request, res: Response): Promise<Response> {
    const { body, params } = getValidated<UpdateUserInput, unknown, UserIdParams>(res);
    const user = await userService.updateUser(params.id, body, req.user?.id ?? '', req.user?.roles ?? [], getAuditContext(req));
    return sendSuccess(res, user);
}

/** PATCH /api/v1/admin/users/:id/status — activate/deactivate. */
export async function updateUserStatus(
    req: Request,
    res: Response,
): Promise<Response> {
    const { body, params } = getValidated<UpdateUserStatusInput, unknown, UserIdParams>(res);
    const user = await userService.updateUserStatus(params.id, body, req.user?.id ?? '', req.user?.roles ?? [], getAuditContext(req));
    return sendSuccess(res, user);
}

/** PATCH /api/v1/admin/users/:id/roles — replace role assignments. */
export async function updateUserRoles(req: Request, res: Response): Promise<Response> {
    const { body, params } = getValidated<UpdateUserRolesInput, unknown, UserIdParams>(res);
    const user = await userService.updateUserRoles(params.id, body, req.user?.id ?? '', req.user?.roles ?? []);
    return sendSuccess(res, user);
}

/** DELETE /api/v1/admin/users/:id — soft delete (deactivate). */
export async function deleteUser(req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, UserIdParams>(res);
    const user = await userService.deactivateUser(params.id, req.user?.id ?? '', req.user?.roles ?? []);
    return sendSuccess(res, user);
}


/** GET /admin/users/:id/scopes — organisation scopes for an official account. */
export async function getUserScopes(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, UserIdParams>(res);
    const scopes = await userService.getUserScopes(params.id);
    return sendSuccess(res, scopes);
}

/** PUT /admin/users/:id/scopes — replace all organisation scope grants. */
export async function replaceUserScopes(req: Request, res: Response): Promise<Response> {
    const { params, body } = getValidated<UserScopesInput, unknown, UserIdParams>(res);
    const scopes = await userService.replaceUserScopes(
        params.id,
        body,
        req.user?.id ?? "",
        req.user?.roles ?? [],
        getAuditContext(req),
    );
    return sendSuccess(res, scopes);
}
