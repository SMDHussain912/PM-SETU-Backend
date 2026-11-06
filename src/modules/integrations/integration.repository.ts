import { prisma } from "../../config/database";
import type { IntegrationSourceInput } from "./integration.schema";
export function list(filters: { enabled?: boolean; system?: string }) {
  return prisma.integrationSource.findMany({ where: { ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }), ...(filters.system ? { system: filters.system } : {}) }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, system: true, transport: true, enabled: true, credentialRef: true, syncIntervalSeconds: true, nextSyncAt: true, createdAt: true, updatedAt: true } });
}
export function create(input: IntegrationSourceInput) {
  return prisma.integrationSource.create({ data: { code: input.code, name: input.name, system: input.system, transport: input.transport, enabled: input.enabled, credentialRef: input.credential_ref ?? null, syncIntervalSeconds: input.sync_interval_seconds ?? null, nextSyncAt: input.enabled && input.sync_interval_seconds ? new Date() : null }, select: { id: true, code: true, name: true, system: true, transport: true, enabled: true, credentialRef: true, syncIntervalSeconds: true, nextSyncAt: true, createdAt: true, updatedAt: true } });
}
export function get(id: number) { return prisma.integrationSource.findUnique({ where: { id } }); }
export function updateEnabled(id: number, enabled: boolean) {
  return prisma.integrationSource.update({ where: { id }, data: { enabled, nextSyncAt: enabled ? new Date() : null }, select: { id: true, code: true, name: true, system: true, transport: true, enabled: true, credentialRef: true, syncIntervalSeconds: true, nextSyncAt: true, updatedAt: true } });
}
export function updateSchedule(id: number, seconds: number | null) {
  return prisma.integrationSource.update({ where: { id }, data: { syncIntervalSeconds: seconds, nextSyncAt: seconds === null ? null : new Date() }, select: { id: true, code: true, name: true, system: true, transport: true, enabled: true, credentialRef: true, syncIntervalSeconds: true, nextSyncAt: true, updatedAt: true } });
}
export function createRun(input: { sourceId: number; status: string; recordsRead: number; recordsCreated: number; recordsUpdated: number; recordsRejected: number; cursor: string | null; errorCode: string | null; errorSummary: string | null; startedAt: Date; completedAt: Date }) {
  return prisma.integrationSyncRun.create({ data: input });
}
export function listRuns(sourceId: number, take = 20) {
  return prisma.integrationSyncRun.findMany({ where: { sourceId }, orderBy: { startedAt: "desc" }, take });
}

export function listCommittedRuns(sourceId: number, take = 1) {
  return prisma.integrationSyncRun.findMany({
    where: { sourceId, status: { in: ["SUCCEEDED", "PARTIAL"] } },
    orderBy: { startedAt: "desc" },
    take,
  });
}

export async function ingestBatch(sourceId: number, records: Array<{ source_record_id: string; source_version?: string | null; occurred_at?: string | null; payload: Record<string, unknown> }>, options: { cursor?: string | null; status?: "SUCCEEDED" | "PARTIAL"; startedAt?: Date } = {}) {
  return prisma.$transaction(async (tx) => {
    let created = 0; let updated = 0;
    for (const record of records) {
      const existing = await tx.integrationRecord.findUnique({ where: { sourceId_sourceRecordId: { sourceId, sourceRecordId: record.source_record_id } }, select: { id: true, sourceVersion: true, payload: true } });
      await tx.integrationRecord.upsert({
        where: { sourceId_sourceRecordId: { sourceId, sourceRecordId: record.source_record_id } },
        create: { sourceId, sourceRecordId: record.source_record_id, sourceVersion: record.source_version ?? null, occurredAt: record.occurred_at ? new Date(record.occurred_at) : null, payload: record.payload as import("../../generated/prisma/client").Prisma.InputJsonValue },
        update: { sourceVersion: record.source_version ?? null, occurredAt: record.occurred_at ? new Date(record.occurred_at) : null, payload: record.payload as import("../../generated/prisma/client").Prisma.InputJsonValue, lastSeenAt: new Date() },
      });
      if (existing) updated++; else created++;
    }
    const now = new Date();
    const run = await tx.integrationSyncRun.create({ data: { sourceId, status: options.status ?? "SUCCEEDED", recordsRead: records.length, recordsCreated: created, recordsUpdated: updated, recordsRejected: 0, cursor: options.cursor ?? null, startedAt: options.startedAt ?? now, completedAt: now } });
    return { run, records_read: records.length, records_created: created, records_updated: updated, records_rejected: 0 };
  });
}


/** Atomically claims due schedules; competing application instances cannot claim the same row. */
export async function claimDueSources() {
  const claimed = await prisma.$queryRaw<Array<{ id: number }>>`
    UPDATE "integration_sources"
    SET "next_sync_at" = NOW() + ("sync_interval_seconds" * INTERVAL '1 second')
    WHERE "enabled" = TRUE
      AND "sync_interval_seconds" IS NOT NULL
      AND ("next_sync_at" IS NULL OR "next_sync_at" <= NOW())
    RETURNING "id"
  `;
  if (!claimed.length) return [];
  return prisma.integrationSource.findMany({
    where: { id: { in: claimed.map((row) => row.id) }, enabled: true },
    orderBy: { id: "asc" },
  });
}
