import { z } from "zod";

/**
 * Roles module request schemas (RoadMap.md §20).
 *
 * GET endpoints validate only the path parameter; POST/PATCH validate the
 * body through the shared validate() middleware
 * (src/middleware/validate.middleware.ts).
 */

/** Shared "optional long description" — empty string is normalized to null. */
const optionalDescription = z
    .union([z.string().trim().min(1).max(500), z.literal("")])
    .transform((value) => (value === "" ? null : value))
    .optional();

/** GET /admin/roles/:id, PATCH, DELETE */
export const roleIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

/**
 * POST /admin/roles — custom role creation.
 * `code` is restricted to lower_snake_case slugs matching the documented
 * role-code convention (role.constants.ts). `permission_ids` default to []
 * so a role can be created without permissions.
 */
export const createRoleSchema = z.object({
    code: z
        .string()
        .trim()
        .min(3)
        .max(50)
        .regex(/^[a-z][a-z0-9_]*$/, "Role code must be lowercase snake_case"),
    name: z.string().trim().min(1).max(100),
    description: optionalDescription,
    permission_ids: z.array(z.number().int().positive()).min(0).max(100).default([]),
});

/**
 * PATCH /admin/roles/:id — role update. `code` and `is_system` are immutable
 * (JWT/authorization depend on stable codes). When `permission_ids` is
 * provided, role→permission mappings are replaced atomically.
 */
export const updateRoleSchema = z
    .object({
        name: z.string().trim().min(1).max(100).optional(),
        description: optionalDescription,
        permission_ids: z.array(z.number().int().positive()).min(0).max(100).optional(),
    })
    .refine(
        (data) =>
            data.name !== undefined ||
            data.description !== undefined ||
            data.permission_ids !== undefined,
        { message: "At least one field is required" },
    );

export type RoleIdParams = z.infer<typeof roleIdParamsSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
