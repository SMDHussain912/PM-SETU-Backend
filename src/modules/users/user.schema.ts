import { z } from "zod";
import { paginationQuerySchema } from "../../utils/pagination";

/**
 * Users module request schemas (RoadMap.md §19).
 *
 * All admin-user endpoints go through requireAuth + requireRoles (see
 * user.routes.ts) and the shared validate() middleware.
 */

/** GET/PATCH/DELETE /admin/users/:id */
export const userIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/** Shared optional email — empty string is normalized to null (clears it). */
const optionalEmail = z
    .union([z.email().max(254), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional();

/**
 * GET /admin/users — pagination plus optional §19 filters.
 * The `role` filter matches a role CODE (role.constants.ts), consistent with
 * JWT/RBAC claims. `status`/`search`/`role` filters are INFERRED (RoadMap
 * defines no filter list for users).
 */
export const userListQuerySchema = paginationQuerySchema.extend({
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    role: z.string().trim().min(1).max(50).optional(),
    search: z.string().trim().min(1).max(100).optional(),
});

/**
 * POST /admin/users — administrative creation. The password is hashed in the
 * service layer (src/utils/password.ts) before it ever reaches SQL; the
 * minimum length (8) is an INFERRED policy, TO CONFIRM. At least one role
 * is required so a created account is always functional.
 */
export const createUserSchema = z.object({
    username: z.string().trim().min(3).max(50),
    full_name: z.string().trim().min(1).max(200),
    email: optionalEmail,
    password: z.string().min(8).max(128),
    role_ids: z.array(z.number().int().positive()).min(1).max(20),
});

/**
 * PATCH /admin/users/:id — profile update only (full_name/email). Passwords
 * are handled exclusively by POST /auth/change-password (self-service).
 */
export const updateUserSchema = z
    .object({
        full_name: z.string().trim().min(1).max(200).optional(),
        email: optionalEmail,
    })
    .refine((data) => data.full_name !== undefined || data.email !== undefined, {
        message: "At least one field is required",
    });

/** PATCH /admin/users/:id/status */
export const updateUserStatusSchema = z.object({
    status: z.enum(["ACTIVE", "INACTIVE"]),
});

/** PATCH /admin/users/:id/roles — replaces the full set of assignments. */
export const updateUserRolesSchema = z.object({
    role_ids: z.array(z.number().int().positive()).min(1).max(20),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;
