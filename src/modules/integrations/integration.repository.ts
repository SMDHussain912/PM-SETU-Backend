import { prisma } from "../../config/database";
import type { IntegrationSourceInput } from "./integration.schema";
import type { Prisma } from "../../generated/prisma/client";
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

type ScheduledRunInput = { status: string; recordsRead: number; recordsCreated: number; recordsUpdated: number; recordsRejected: number; cursor: string | null; errorCode: string | null; errorSummary: string | null; startedAt: Date; completedAt: Date };

/**
 * Lock the source row and verify the fencing token inside the same transaction
 * that commits scheduler output. A reclaiming worker must wait for this lock,
 * and a stale token cannot write after ownership changes.
 */
async function lockValidSourceClaim(tx: Prisma.TransactionClient, sourceId: number, claimToken: string): Promise<void> {
  const owned = await tx.$queryRaw<Array<{ id: number }>>`
    SELECT "id"
    FROM "integration_sources"
    WHERE "id" = ${sourceId}
      AND "claim_token" = ${claimToken}::uuid
      AND "claim_expires_at" > NOW()
      AND "enabled" = TRUE
    FOR UPDATE
  `;
  if (owned.length !== 1) throw new Error("SCHEDULER_LEASE_LOST");
}

export async function createScheduledRun(sourceId: number, claimToken: string, input: ScheduledRunInput) {
  return prisma.$transaction(async (tx) => {
    await lockValidSourceClaim(tx, sourceId, claimToken);
    return tx.integrationSyncRun.create({ data: { sourceId, ...input } });
  });
}

export async function ingestBatch(sourceId: number, records: Array<{ source_record_id: string; source_version?: string | null; occurred_at?: string | null; payload: Record<string, unknown> }>, options: { cursor?: string | null; status?: "SUCCEEDED" | "PARTIAL"; startedAt?: Date; claimToken?: string } = {}) {
  return prisma.$transaction(async (tx) => {
    if (options.claimToken) await lockValidSourceClaim(tx, sourceId, options.claimToken);
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


/** Atomically claims due schedules or reclaims leases abandoned by crashed workers. */
export async function claimDueSources(client: typeof prisma = prisma) {
  // Claim a bounded batch in due-time order. SKIP LOCKED lets other
  // application instances claim different rows without waiting on this batch.
  const claimed = await client.$queryRaw<Array<{ id: number; claim_token: string }>>`
    WITH due_sources AS (
      SELECT "id"
      FROM "integration_sources"
      WHERE "enabled" = TRUE
        AND "sync_interval_seconds" IS NOT NULL
        AND (
          ("claim_token" IS NULL AND ("next_sync_at" IS NULL OR "next_sync_at" <= NOW()))
          OR ("claim_token" IS NOT NULL AND ("claim_expires_at" IS NULL OR "claim_expires_at" <= NOW()))
        )
      ORDER BY "next_sync_at" ASC NULLS FIRST, "id" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 10
    )
    UPDATE "integration_sources" AS source
    SET
      "claim_token" = gen_random_uuid(),
      "claim_expires_at" = NOW() + INTERVAL '15 minutes',
      "next_sync_at" = NOW() + (source."sync_interval_seconds" * INTERVAL '1 second')
    FROM due_sources
    WHERE source."id" = due_sources."id"
    RETURNING source."id", source."claim_token"
  `;
  if (!claimed.length) return [];
  const sources = await client.integrationSource.findMany({
    where: { id: { in: claimed.map((row) => row.id) }, enabled: true },
    orderBy: { id: "asc" },
  });
  const tokens = new Map(claimed.map((row) => [row.id, row.claim_token]));
  return sources.flatMap((source) => {
    const claimToken = tokens.get(source.id);
    return claimToken ? [{ ...source, claimToken }] : [];
  });
}

/** Extend a lease only when the caller still owns it. */
export async function renewSourceClaim(sourceId: number, claimToken: string): Promise<boolean> {
  const result = await prisma.integrationSource.updateMany({
    where: { id: sourceId, claimToken, claimExpiresAt: { gt: new Date() }, enabled: true },
    data: { claimExpiresAt: new Date(Date.now() + 15 * 60 * 1000) },
  });
  return result.count === 1;
}

/** Release only the lease owned by this execution; stale workers cannot clear a newer claim. */
export async function releaseSourceClaim(sourceId: number, claimToken: string): Promise<void> {
  await prisma.integrationSource.updateMany({
    where: { id: sourceId, claimToken },
    data: { claimToken: null, claimExpiresAt: null },
  });
}
