import test from "node:test";
import assert from "node:assert/strict";
import { integrationSourcePublicSelect } from "../src/modules/integrations/integration.repository";

test("public integration source projection is an explicit allowlist without credential references", () => {
  assert.deepEqual(integrationSourcePublicSelect, {
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
  });
  assert.equal("credentialRef" in integrationSourcePublicSelect, false);
  assert.equal("credential_ref" in integrationSourcePublicSelect, false);
});
