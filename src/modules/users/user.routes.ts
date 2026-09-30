import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/rbac.middleware";
import { validate } from "../../middleware/validate.middleware";
import * as userController from "./user.controller";
import { USER_READ_ROLES, USER_WRITE_ROLES } from "../roles/role.constants";
import {
    createUserSchema,
    updateUserRolesSchema,
    updateUserSchema,
    updateUserStatusSchema,
    userIdParamsSchema,
    userListQuerySchema,
} from "./user.schema";

/**
 * Users module — routes (RoadMap.md §19).
 *
 * Guard chain per route registration (§27): requireAuth → requireRoles →
 * validate → controller. All /admin/users routes are guarded at router level
 * by requireAuth; reads additionally require USER_READ_ROLES and writes
 * require USER_WRITE_ROLES (both INFERRED defaults in role.constants.ts).
 * Mounted under /api/v1/admin/users by src/routes/index.ts.
 */

const userRouter = Router();

userRouter.use(requireAuth);
userRouter.use(requireRoles(...USER_READ_ROLES));

userRouter.get("/", validate({ query: userListQuerySchema }), userController.listUsers);

userRouter.post(
    "/",
    requireRoles(...USER_WRITE_ROLES),
    validate({ body: createUserSchema }),
    userController.createUser,
);

userRouter.get(
    "/:id",
    validate({ params: userIdParamsSchema }),
    userController.getUserById,
);

userRouter.patch(
    "/:id",
    requireRoles(...USER_WRITE_ROLES),
    validate({ params: userIdParamsSchema, body: updateUserSchema }),
    userController.updateUser,
);

userRouter.patch(
    "/:id/status",
    requireRoles(...USER_WRITE_ROLES),
    validate({ params: userIdParamsSchema, body: updateUserStatusSchema }),
    userController.updateUserStatus,
);

userRouter.patch(
    "/:id/roles",
    requireRoles(...USER_WRITE_ROLES),
    validate({ params: userIdParamsSchema, body: updateUserRolesSchema }),
    userController.updateUserRoles,
);

userRouter.delete(
    "/:id",
    requireRoles(...USER_WRITE_ROLES),
    validate({ params: userIdParamsSchema }),
    userController.deleteUser,
);

export default userRouter;
