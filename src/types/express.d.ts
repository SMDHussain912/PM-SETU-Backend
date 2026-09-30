// Type augmentation for Express requests.
// `req.user` is populated by middleware/auth.middleware.ts after JWT
// verification and consumed by middleware/rbac.middleware.ts.

export interface AuthUser {
    id: string;
    roles?: string[];
    permissions?: string[];
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
