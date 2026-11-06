export const INTEGRATION_SYSTEMS = ["DET_MIS", "ITI_MIS", "STUDENT_MIS", "TRAINING_MIS", "APPRENTICESHIP", "PLACEMENT_MIS", "FINANCE_MIS", "AP_GOVERNMENT", "DGT_MSDE", "GIS", "SMS", "EMAIL"] as const;
export type IntegrationSystem = typeof INTEGRATION_SYSTEMS[number];
export const INTEGRATION_PULL_TRANSPORTS = ["REST", "SFTP"] as const;
export type IntegrationTransport = "REST" | "SFTP" | "CSV_UPLOAD" | "WEBHOOK";
export function isIntegrationPullTransport(transport: string): transport is typeof INTEGRATION_PULL_TRANSPORTS[number] {
  return (INTEGRATION_PULL_TRANSPORTS as readonly string[]).includes(transport);
}
export type IntegrationRunStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "PARTIAL" | "FAILED";
export interface IntegrationRecord {
  source_record_id: string;
  source_version?: string | null;
  occurred_at?: string | null;
  payload: Record<string, unknown>;
}
export interface IntegrationPage { records: IntegrationRecord[]; nextCursor?: string | null; hasMore: boolean; }
export interface IntegrationAdapterContext { sourceCode: string; cursor?: string | null; since?: string | null; }
export interface IntegrationAdapter { readonly system: IntegrationSystem; fetchPage(context: IntegrationAdapterContext): Promise<IntegrationPage>; }
export interface IntegrationAdapterRegistry { get(sourceCode: string): IntegrationAdapter | undefined; }
