export const INTEGRATION_SYSTEMS = ["DET_MIS", "ITI_MIS", "STUDENT_MIS", "TRAINING_MIS", "APPRENTICESHIP", "PLACEMENT_MIS", "FINANCE_MIS", "AP_GOVERNMENT", "DGT_MSDE", "GIS", "SMS", "EMAIL"] as const;
export type IntegrationSystem = typeof INTEGRATION_SYSTEMS[number];
export type IntegrationTransport = "REST" | "SFTP" | "CSV_UPLOAD" | "WEBHOOK";
export type IntegrationRunStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "PARTIAL" | "FAILED";
export interface IntegrationRecord { sourceRecordId: string; sourceVersion?: string | null; occurredAt?: string | null; payload: Record<string, unknown>; }
export interface IntegrationPage { records: IntegrationRecord[]; nextCursor?: string | null; hasMore: boolean; }
export interface IntegrationAdapterContext { sourceCode: string; cursor?: string | null; since?: string | null; }
export interface IntegrationAdapter { readonly system: IntegrationSystem; fetchPage(context: IntegrationAdapterContext): Promise<IntegrationPage>; }
/** Adapter implementations must obtain credentials from deployment secrets, never database fields or API request bodies. */
export interface IntegrationAdapterRegistry { get(sourceCode: string): IntegrationAdapter | undefined; }
