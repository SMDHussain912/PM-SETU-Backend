import type { Prisma } from "../../generated/prisma/client";
import { ROLE_CODES } from "../roles/role.constants";

export type OutcomeScopeAssignment = { scopeType: string; scopeId: number };

const GLOBAL_READ_ROLES = [
    ROLE_CODES.SUPER_ADMIN,
    ROLE_CODES.STATE_PMU_ADMIN,
    ROLE_CODES.DET_CONTENT_ADMIN,
    ROLE_CODES.APPROVING_AUTHORITY,
];

export function buildOutcomeScopeWhere(
    roles: string[],
    assignments: OutcomeScopeAssignment[],
): Prisma.IndustryOutcomeRecordWhereInput | undefined {
    if (roles.some((role) => GLOBAL_READ_ROLES.includes(role as (typeof GLOBAL_READ_ROLES)[number]))) {
        return undefined;
    }

    const allowedTypes = new Set<string>();
    if (roles.includes(ROLE_CODES.CLUSTER_ADMIN)) allowedTypes.add("CLUSTER");
    if (roles.includes(ROLE_CODES.HUB_ITI_USER) || roles.includes(ROLE_CODES.SPOKE_ITI_USER)) allowedTypes.add("ITI");

    const branches = assignments
        .filter((assignment) => allowedTypes.has(assignment.scopeType))
        .map((assignment) => assignment.scopeType === "CLUSTER"
            ? { clusterId: assignment.scopeId }
            : { itiId: assignment.scopeId });

    return branches.length > 0 ? { OR: branches } : { id: -1 };
}
