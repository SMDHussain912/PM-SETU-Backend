/**
 * Users module types — administrative user management only.
 * Password hashes never appear in API response types.
 */
export type UserStatus = "ACTIVE" | "INACTIVE";

export interface User {
    id: number;
    username: string;
    full_name: string;
    email: string | null;
    status: UserStatus;
    created_at: Date;
}

export interface AssignedRole {
    id: number;
    code: string;
    name: string;
}

export interface UserWithRoles extends User {
    roles: AssignedRole[];
}

export interface UserListFilters {
    status?: UserStatus;
    role?: string;
    search?: string;
    page: number;
    pageSize: number;
}
