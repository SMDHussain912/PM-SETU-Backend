export interface CommittedIntegrationCheckpoint {
  cursor: string | null;
  completedAt: Date;
}

/** Only a committed page may advance the upstream time checkpoint. */
export function selectCommittedCheckpoint<T extends { status: string; cursor: string | null; completedAt: Date }>(runs: readonly T[]): T | null {
  return runs.find((run) => run.status === "SUCCEEDED" || run.status === "PARTIAL") ?? null;
}
