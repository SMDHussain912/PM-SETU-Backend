import * as repo from "./integration.repository";

type FailureRepository = Pick<typeof repo, "listCommittedRuns" | "createScheduledRun">;

/**
 * Persist a scheduler-level failure only while this worker can still verify
 * that its claim has not been rejected or made uncertain by a renewal error.
 */
export async function persistScheduledFailureIfOwned(
  sourceId: number,
  claimToken: string,
  ownershipUncertain: boolean,
  repository: FailureRepository = repo,
): Promise<boolean> {
  if (ownershipUncertain) return false;

  const committed = await repository.listCommittedRuns(sourceId, 1);
  await repository.createScheduledRun(sourceId, claimToken, {
    status: "FAILED",
    recordsRead: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsRejected: 0,
    cursor: committed[0]?.cursor ?? null,
    errorCode: "ADAPTER_EXECUTION_FAILED",
    errorSummary: "Scheduled adapter execution failed; inspect protected application logs",
    startedAt: new Date(),
    completedAt: new Date(),
  });
  return true;
}
