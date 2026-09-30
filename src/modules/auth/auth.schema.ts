import { z } from "zod";

/**
 * Auth module request schemas (RoadMap.md §18). Passed through the shared
 * validate() middleware (src/middleware/validate.middleware.ts).
 *
 * The password minimum length (8) is an INFERRED policy, TO CONFIRM — it
 * mirrors the users module /admin/users password rule so both entry points
 * stay consistent.
 */

/** POST /api/v1/auth/login */
export const loginBodySchema = z.object({
    username: z.string().trim().min(1).max(50),
    password: z.string().min(1).max(128),
});

/** POST /api/v1/auth/change-password (authenticated). */
export const changePasswordBodySchema = z.object({
    current_password: z.string().min(1).max(128),
    new_password: z.string().min(8).max(128),
});

export type LoginInput = z.infer<typeof loginBodySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordBodySchema>;
