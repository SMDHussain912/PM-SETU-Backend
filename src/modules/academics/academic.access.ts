import type { Prisma } from "../../generated/prisma/client";
import { ROLE_CODES } from "../roles/role.constants";

const GLOBAL_ROLES = [ROLE_CODES.SUPER_ADMIN, ROLE_CODES.STATE_PMU_ADMIN, ROLE_CODES.DET_CONTENT_ADMIN, ROLE_CODES.APPROVING_AUTHORITY];
export type AcademicAssignment = { scopeType: string; scopeId: number };

export function buildAcademicScopeWhere(roles: string[], assignments: AcademicAssignment[]): Prisma.AcademicSourceRecordWhereInput | undefined {
    if (roles.some((role) => GLOBAL_ROLES.includes(role as (typeof GLOBAL_ROLES)[number]))) return undefined;
    const branches: Prisma.AcademicSourceRecordWhereInput[] = [];
    if (roles.includes(ROLE_CODES.CLUSTER_ADMIN)) {
        branches.push(...assignments.filter((a) => a.scopeType === "CLUSTER").map((a) => ({ clusterId: a.scopeId })));
    }
    if (roles.includes(ROLE_CODES.HUB_ITI_USER) || roles.includes(ROLE_CODES.SPOKE_ITI_USER)) {
        branches.push(...assignments.filter((a) => a.scopeType === "ITI").map((a) => ({ itiId: a.scopeId })));
    }
    return branches.length ? { OR: branches } : { id: -1 };
}
