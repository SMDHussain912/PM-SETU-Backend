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
