import { prisma } from "../../config/database";
import type { IntegrationSourceInput } from "./integration.schema";
import type { Prisma } from "../../generated/prisma/client";

/**
 * Explicit allowlist for integration source API projections.
 * Keep credentialRef out of every public source response; internal secret
 * resolution must use repo.get() instead.
 */
export const integrationSourcePublicSelect = {
  id: true,
  code: true,
  name: true,
  system: true,
  transport: true,
  enabled: true,
  syncIntervalSeconds: true,
  nextSyncAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function list(filters: { enabled?: boolean; system?: string }) {
  return prisma.integrationSource.findMany({ where: { ...(filters.enabled === undefined ? {} : { enabled: filters.enabled }), ...(filters.system ? { system: filters.system } : {}) }, orderBy: { code: "asc" }, select: integrationSourcePublicSelect });
}
export function create(input: IntegrationSourceInput, client: typeof prisma = prisma) {
  return client.$transaction(async (tx) => {
    const source = await tx.integrationSource.create({
      data: {
        code: input.code,
        name: input.name,
        system: input.system,
        transport: input.transport,
        enabled: input.enabled,
        credentialRef: input.credential_ref ?? null,
        syncIntervalSeconds: input.sync_interval_seconds ?? null,
        nextSyncAt: null,
      },
      select: { id: true },
    });
    if (input.enabled && input.sync_interval_seconds != null) {
      // Keep initial schedule eligibility on the same clock as scheduler claims.
      await tx.$executeRaw`
        UPDATE "integration_sources"
        SET "next_sync_at" = NOW(), "updated_at" = NOW()
        WHERE "id" = ${source.id}
      `;
    }
    return tx.integrationSource.findUniqueOrThrow({
      where: { id: source.id },
      select: integrationSourcePublicSelect,
    });
  });
}
export function get(id: number) { return prisma.integrationSource.findUnique({ where: { id } }); }
export function updateEnabled(id: number, enabled: boolean, client: typeof prisma = prisma) {
  return client.$transaction(async (tx) => {
    // Use the database clock for scheduler eligibility; claim and lease
    // predicates also use PostgreSQL NOW().
    await tx.$executeRaw`
      UPDATE "integration_sources"
      SET
        "enabled" = ${enabled},
        "next_sync_at" = CASE WHEN ${enabled} THEN NOW() ELSE NULL END,
        "claim_token" = CASE WHEN ${enabled} THEN "claim_token" ELSE NULL END,
        "claim_expires_at" = CASE WHEN ${enabled} THEN "claim_expires_at" ELSE NULL END,
        "updated_at" = NOW()
      WHERE "id" = ${id}
    `;
    return tx.integrationSource.findUniqueOrThrow({
      where: { id },
      select: integrationSourcePublicSelect,
    });
  });
}
export function updateSchedule(id: number, seconds: number | null, client: typeof prisma = prisma) {
  return client.$transaction(async (tx) => {
    // A schedule change becomes due according to the same database clock used
    // by claimDueSources(). Removing it also revokes any active scheduler lease.
    await tx.$executeRaw`
      UPDATE "integration_sources"
      SET
        "sync_interval_seconds" = ${seconds}::integer,
        "next_sync_at" = CASE WHEN ${seconds}::integer IS NULL THEN NULL ELSE NOW() END,
        "claim_token" = CASE WHEN ${seconds}::integer IS NULL THEN NULL ELSE "claim_token" END,
        "claim_expires_at" = CASE WHEN ${seconds}::integer IS NULL THEN NULL ELSE "claim_expires_at" END,
        "updated_at" = NOW()
      WHERE "id" = ${id}
    `;
    return tx.integrationSource.findUniqueOrThrow({
      where: { id },
      select: integrationSourcePublicSelect,
    });
  });
}
export function createRun(input: { sourceId: number; status: string; recordsRead: number; recordsCreated: number; recordsUpdated: number; recordsRejected: number; cursor: string | null; errorCode: string | null; errorSummary: string | null; startedAt: Date; completedAt: Date }) {
  return prisma.integrationSyncRun.create({ data: input });
}
/**
 * Public run-history projection. Provider cursors are opaque checkpoint state
 * and must remain available only through listCommittedRuns() internally.
 */
export const integrationRunPublicSelect = {
  id: true,
  sourceId: true,
  status: true,
  recordsRead: true,
  recordsCreated: true,
  recordsUpdated: true,
  recordsRejected: true,
  errorCode: true,
  errorSummary: true,
  startedAt: true,
  completedAt: true,
} as const;

export function listRuns(sourceId: number, take = 20) {
  return prisma.integrationSyncRun.findMany({ where: { sourceId }, orderBy: { startedAt: "desc" }, take, select: integrationRunPublicSelect });
}

export function listCommittedRuns(sourceId: number, take = 1, client: typeof prisma = prisma) {
  return client.integrationSyncRun.findMany({
    where: { sourceId, runOrigin: { in: ["SCHEDULED", "LEGACY"] }, status: { in: ["SUCCEEDED", "PARTIAL"] } },
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

/** Serialize manual ingestion against source disable/delete operations. */
async function lockEnabledSource(tx: Prisma.TransactionClient, sourceId: number): Promise<void> {
  const enabled = await tx.$queryRaw<Array<{ id: number }>>`
    SELECT "id"
    FROM "integration_sources"
    WHERE "id" = ${sourceId}
      AND "enabled" = TRUE
    FOR UPDATE
  `;
  if (enabled.length !== 1) throw new Error("INTEGRATION_SOURCE_NOT_ENABLED");
}

export async function createScheduledRun(sourceId: number, claimToken: string, input: ScheduledRunInput, client: typeof prisma = prisma) {
  return client.$transaction(async (tx) => {
    await lockValidSourceClaim(tx, sourceId, claimToken);
    return tx.integrationSyncRun.create({ data: { sourceId, runOrigin: "SCHEDULED", ...input } });
  });
}

export async function ingestBatch(sourceId: number, records: Array<{ source_record_id: string; source_version?: string | null; occurred_at?: string | null; payload: Record<string, unknown> }>, options: { cursor?: string | null; status?: "SUCCEEDED" | "PARTIAL"; startedAt?: Date; claimToken?: string } = {}, client: typeof prisma = prisma) {
  return client.$transaction(async (tx) => {
    if (options.claimToken) await lockValidSourceClaim(tx, sourceId, options.claimToken);
    else await lockEnabledSource(tx, sourceId);
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
    const run = await tx.integrationSyncRun.create({ data: { sourceId, status: options.status ?? "SUCCEEDED", recordsRead: records.length, recordsCreated: created, recordsUpdated: updated, recordsRejected: 0, cursor: options.cursor ?? null, runOrigin: options.claimToken ? "SCHEDULED" : "MANUAL", startedAt: options.startedAt ?? now, completedAt: now } });
    return { run, records_read: records.length, records_created: created, records_updated: updated, records_rejected: 0 };
  });
}


export async function createManualRun(sourceId: number, input: ScheduledRunInput, client: typeof prisma = prisma) {
  return client.$transaction(async (tx) => {
    await lockEnabledSource(tx, sourceId);
    return tx.integrationSyncRun.create({ data: { sourceId, runOrigin: "MANUAL", ...input } });
  });
}

/** Atomically claims due schedules or reclaims leases abandoned by crashed workers. */
export async function claimDueSources(client: typeof prisma = prisma, sourceIds?: number[]) {
  const sourceIdFilter = sourceIds ?? null;
  // Claim a bounded batch in due-time order. SKIP LOCKED lets other
  // application instances claim different rows without waiting on this batch.
  const claimed = await client.$queryRaw<Array<{ id: number; claim_token: string }>>`
    WITH due_sources AS (
      SELECT "id"
      FROM "integration_sources"
      WHERE "enabled" = TRUE
        AND "transport" IN ('REST', 'SFTP')
        AND "sync_interval_seconds" IS NOT NULL
        AND (${sourceIdFilter}::int[] IS NULL OR "id" = ANY(${sourceIdFilter}::int[]))
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
export async function renewSourceClaim(sourceId: number, claimToken: string, client: typeof prisma = prisma): Promise<boolean> {
  // Use PostgreSQL time for both the expiry predicate and extension. Claiming
  // and transaction fencing also use NOW(), so app-server clock drift cannot
  // make heartbeat ownership disagree with the database.
  const renewed = await client.$queryRaw<Array<{ id: number }>>`
    UPDATE "integration_sources"
    SET "claim_expires_at" = NOW() + INTERVAL '15 minutes'
    WHERE "id" = ${sourceId}
      AND "claim_token" = ${claimToken}::uuid
      AND "claim_expires_at" > NOW()
      AND "enabled" = TRUE
    RETURNING "id"
  `;
  return renewed.length === 1;
}

/** Release only the lease owned by this execution; stale workers cannot clear a newer claim. */
export async function releaseSourceClaim(sourceId: number, claimToken: string, client: typeof prisma = prisma): Promise<void> {
  await client.integrationSource.updateMany({
    where: { id: sourceId, claimToken },
    data: { claimToken: null, claimExpiresAt: null },
  });
}
