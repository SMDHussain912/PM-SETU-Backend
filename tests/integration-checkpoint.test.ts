import test from "node:test";
import assert from "node:assert/strict";
import { selectCommittedCheckpoint } from "../src/modules/integrations/integration.checkpoint";

const committedAt = new Date("2026-11-05T10:00:00.000Z");
const failedAt = new Date("2026-11-05T11:00:00.000Z");

test("failed attempts do not replace the last committed cursor or since timestamp", () => {
  const checkpoint = selectCommittedCheckpoint([
    { status: "FAILED", cursor: "uncommitted-cursor", completedAt: failedAt },
    { status: "PARTIAL", cursor: "committed-cursor", completedAt: committedAt },
  ]);
  assert.deepEqual(checkpoint, { status: "PARTIAL", cursor: "committed-cursor", completedAt: committedAt });
});

test("a successful empty-page checkpoint is retained even with a null cursor", () => {
  const checkpoint = selectCommittedCheckpoint([
    { status: "SUCCEEDED", cursor: null, completedAt: committedAt },
    { status: "FAILED", cursor: "old-cursor", completedAt: failedAt },
  ]);
  assert.equal(checkpoint?.cursor, null);
  assert.equal(checkpoint?.completedAt, committedAt);
});

test("returns null when no page has been committed", () => {
  assert.equal(selectCommittedCheckpoint([{ status: "FAILED", cursor: null, completedAt: failedAt }]), null);
});
