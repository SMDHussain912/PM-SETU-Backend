import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validate.middleware";
import * as roleController from "./role.controller";
import { ROLE_READ_ROLES, ROLE_WRITE_ROLES } from "./role.constants";
import {
    createRoleSchema,
    roleIdParamsSchema,
    updateRoleSchema,
} from "./role.schema";

/**
 * Roles module — routes (RoadMap.md §20).
 *
 * Guard chain per Route registration (§27): requireAuth → requireRoles →
 * validate → controller. Reads require ROLE_READ_ROLES, writes require
 * ROLE_WRITE_ROLES (both defined in role.constants.ts, INFERRED defaults).
 * `GET /permissions` lives on a separate router mounted at
 * /api/v1/admin/permissions so it cannot be shadowed by `/:id`.
 */

const roleRouter = Router();

// Every role-admin route is authenticated and read-guarded first.
roleRouter.use(requireAuth);
roleRouter.use(requireRoles(...ROLE_READ_ROLES));

roleRouter.get("/", roleController.listRoles);

roleRouter.post(
    "/",
    requireRoles(...ROLE_WRITE_ROLES),
    validate({ body: createRoleSchema }),
    roleController.createRole,
);

roleRouter.get(
    "/:id",
    validate({ params: roleIdParamsSchema }),
    roleController.getRoleById,
);

roleRouter.patch(
    "/:id",
    requireRoles(...ROLE_WRITE_ROLES),
    validate({ params: roleIdParamsSchema, body: updateRoleSchema }),
    roleController.updateRole,
);

roleRouter.delete(
    "/:id",
    requireRoles(...ROLE_WRITE_ROLES),
    validate({ params: roleIdParamsSchema }),
    roleController.deleteRole,
);

/** GET /api/v1/admin/permissions (separate mount — cannot collide with /:id). */
const permissionRouter = Router();

permissionRouter.use(requireAuth);
permissionRouter.use(requireRoles(...ROLE_READ_ROLES));

permissionRouter.get("/", roleController.listPermissions);

export default roleRouter;
export { permissionRouter };
