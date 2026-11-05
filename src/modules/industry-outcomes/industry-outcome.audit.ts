export type OutcomeAuditSnapshot = {
    id: number;
    outcomeType: string;
    sourceSystem: string;
    sourceRecordId: string | null;
    clusterId: number | null;
    itiId: number | null;
    employerName: string | null;
    eventDate: Date | null;
    reviewStatus: string;
};

export function toOutcomeAuditSnapshot(record: OutcomeAuditSnapshot): OutcomeAuditSnapshot {
    return {
        id: record.id,
        outcomeType: record.outcomeType,
        sourceSystem: record.sourceSystem,
        sourceRecordId: record.sourceRecordId,
        clusterId: record.clusterId,
        itiId: record.itiId,
        employerName: record.employerName,
        eventDate: record.eventDate,
        reviewStatus: record.reviewStatus,
    };
}

export type OutcomeAuditHistoryEntry = {
    id: number;
    user_id: string;
    action: string;
    old_value: unknown;
    new_value: unknown;
    timestamp: string;
};

const SENSITIVE_OUTCOME_AUDIT_KEYS = new Set([
    "participantRef",
    "participant_ref",
    "evidenceRef",
    "evidence_ref",
    "payload",
    "reviewNote",
    "review_note",
]);

function redactOutcomeAuditValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(redactOutcomeAuditValue);
    if (value === null || typeof value !== "object" || value instanceof Date) return value;
    const safe: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        if (!SENSITIVE_OUTCOME_AUDIT_KEYS.has(key)) {
            safe[key] = redactOutcomeAuditValue(nested);
        }
    }
    return safe;
}

export function toOutcomeAuditHistoryEntry(entry: OutcomeAuditHistoryEntry): OutcomeAuditHistoryEntry {
    return {
        id: entry.id,
        user_id: entry.user_id,
        action: entry.action,
        old_value: redactOutcomeAuditValue(entry.old_value),
        new_value: redactOutcomeAuditValue(entry.new_value),
        timestamp: entry.timestamp,
    };
}
