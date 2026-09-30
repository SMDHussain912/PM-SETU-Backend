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
} from "./user.schema";
import * as userService from "./user.service";

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
export async function createUser(_req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateUserInput>(res);
    const user = await userService.createUser(body);
    return sendCreated(res, user);
}

/** PATCH /api/v1/admin/users/:id — profile update only. */
export async function updateUser(_req: Request, res: Response): Promise<Response> {
    const { body, params } = getValidated<UpdateUserInput, unknown, UserIdParams>(res);
    const user = await userService.updateUser(params.id, body);
    return sendSuccess(res, user);
}

/** PATCH /api/v1/admin/users/:id/status — activate/deactivate. */
export async function updateUserStatus(
    _req: Request,
    res: Response,
): Promise<Response> {
    const { body, params } = getValidated<UpdateUserStatusInput, unknown, UserIdParams>(res);
    const user = await userService.updateUserStatus(params.id, body);
    return sendSuccess(res, user);
}

/** PATCH /api/v1/admin/users/:id/roles — replace role assignments. */
export async function updateUserRoles(_req: Request, res: Response): Promise<Response> {
    const { body, params } = getValidated<UpdateUserRolesInput, unknown, UserIdParams>(res);
    const user = await userService.updateUserRoles(params.id, body);
    return sendSuccess(res, user);
}

/** DELETE /api/v1/admin/users/:id — soft delete (deactivate). */
export async function deleteUser(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, UserIdParams>(res);
    const user = await userService.deactivateUser(params.id);
    return sendSuccess(res, user);
}
