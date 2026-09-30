import type { Request, Response } from "express";
import { getValidated } from "../../middleware/validate.middleware";
import { sendCreated, sendSuccess } from "../../utils/response";
import type { CreateRoleInput, RoleIdParams, UpdateRoleInput } from "./role.schema";
import * as roleService from "./role.service";

/**
 * Roles module — controller layer (RoadMap.md §20).
 *
 * Thin HTTP adapters: read validated request data, delegate to the service,
 * shape the response with the shared success envelope. No SQL, no business
 * logic. Express 5 forwards rejected async handlers to the central error
 * middleware, so no try/catch is needed.
 */

/** GET /api/v1/admin/roles */
export async function listRoles(_req: Request, res: Response): Promise<Response> {
    const roles = await roleService.listRoles();
    return sendSuccess(res, roles);
}

/** GET /api/v1/admin/roles/:id */
export async function getRoleById(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, RoleIdParams>(res);
    const role = await roleService.getRoleById(params.id);
    return sendSuccess(res, role);
}

/** POST /api/v1/admin/roles */
export async function createRole(_req: Request, res: Response): Promise<Response> {
    const { body } = getValidated<CreateRoleInput>(res);
    const role = await roleService.createRole(body);
    return sendCreated(res, role);
}

/** PATCH /api/v1/admin/roles/:id */
export async function updateRole(_req: Request, res: Response): Promise<Response> {
    const { body, params } = getValidated<UpdateRoleInput, unknown, RoleIdParams>(res);
    const role = await roleService.updateRole(params.id, body);
    return sendSuccess(res, role);
}

/** DELETE /api/v1/admin/roles/:id */
export async function deleteRole(_req: Request, res: Response): Promise<Response> {
    const { params } = getValidated<unknown, unknown, RoleIdParams>(res);
    const role = await roleService.deleteRole(params.id);
    return sendSuccess(res, role);
}

/** GET /api/v1/admin/permissions */
export async function listPermissions(_req: Request, res: Response): Promise<Response> {
    const permissions = await roleService.listPermissions();
    return sendSuccess(res, permissions);
}
