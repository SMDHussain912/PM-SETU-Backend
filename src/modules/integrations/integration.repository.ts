import { prisma } from "../../config/database";
import type { IntegrationSourceInput } from "./integration.schema";
export function list(filters: { enabled?: boolean; system?: string }) {
  return prisma.integrationSource.findMany({ where: { ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }), ...(filters.system ? { system: filters.system } : {}) }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, system: true, transport: true, enabled: true, credentialRef: true, createdAt: true, updatedAt: true } });
}
export function create(input: IntegrationSourceInput) {
  return prisma.integrationSource.create({ data: { code: input.code, name: input.name, system: input.system, transport: input.transport, enabled: input.enabled, credentialRef: input.credential_ref ?? null }, select: { id: true, code: true, name: true, system: true, transport: true, enabled: true, credentialRef: true, createdAt: true, updatedAt: true } });
}
export function get(id: number) { return prisma.integrationSource.findUnique({ where: { id } }); }
export function updateEnabled(id: number, enabled: boolean) {
  return prisma.integrationSource.update({ where: { id }, data: { enabled }, select: { id: true, code: true, name: true, system: true, transport: true, enabled: true, credentialRef: true, updatedAt: true } });
}
export function createRun(input: { sourceId: number; status: string; recordsRead: number; recordsCreated: number; recordsUpdated: number; recordsRejected: number; cursor: string | null; errorCode: string | null; errorSummary: string | null; startedAt: Date; completedAt: Date }) {
  return prisma.integrationSyncRun.create({ data: input });
}
export function listRuns(sourceId: number, take = 20) {
  return prisma.integrationSyncRun.findMany({ where: { sourceId }, orderBy: { startedAt: "desc" }, take });
}
