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

export function toOutcomeAuditHistoryEntry(entry: OutcomeAuditHistoryEntry): OutcomeAuditHistoryEntry {
    return {
        id: entry.id,
        user_id: entry.user_id,
        action: entry.action,
        old_value: entry.old_value,
        new_value: entry.new_value,
        timestamp: entry.timestamp,
    };
}
