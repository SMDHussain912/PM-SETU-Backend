import test from "node:test";
import assert from "node:assert/strict";
import {
  integrationAdapterRegistry,
  registerIntegrationAdapter,
  unregisterIntegrationAdapter,
} from "../src/modules/integrations/integration.adapters";
import type { IntegrationAdapter } from "../src/modules/integrations/integration.types";

test("registers a reviewed adapter and returns it by source code", () => {
  const adapter: IntegrationAdapter = {
    system: "STUDENT_MIS",
    async fetchPage() {
      return { records: [], hasMore: false };
    },
  };

  registerIntegrationAdapter("STUDENT_MIS_PRIMARY", adapter);
  try {
    assert.equal(integrationAdapterRegistry.get("STUDENT_MIS_PRIMARY")?.system, "STUDENT_MIS");
    assert.deepEqual(
      await integrationAdapterRegistry.get("STUDENT_MIS_PRIMARY")?.fetchPage({ sourceCode: "STUDENT_MIS_PRIMARY" }),
      { records: [], hasMore: false },
    );
  } finally {
    unregisterIntegrationAdapter("STUDENT_MIS_PRIMARY");
  }
});

test("rejects invalid source codes and duplicate registrations", () => {
  const adapter: IntegrationAdapter = {
    system: "STUDENT_MIS",
    async fetchPage() { return { records: [], hasMore: false }; },
  };

  assert.throws(() => registerIntegrationAdapter("student-mis", adapter), /Invalid integration source code/);
  registerIntegrationAdapter("STUDENT_MIS_DUPLICATE", adapter);
  try {
    assert.throws(
      () => registerIntegrationAdapter("STUDENT_MIS_DUPLICATE", adapter),
      /already registered/,
    );
  } finally {
    unregisterIntegrationAdapter("STUDENT_MIS_DUPLICATE");
  }
});

test("rejects adapters without a supported system or fetchPage function at runtime", () => {
  assert.throws(
    () => registerIntegrationAdapter("INVALID_SYSTEM", {
      system: "UNKNOWN_SYSTEM",
      fetchPage: async () => ({ records: [], hasMore: false }),
    } as unknown as IntegrationAdapter),
    /Invalid integration adapter system/,
  );
  assert.throws(
    () => registerIntegrationAdapter("MISSING_FETCH_PAGE", {
      system: "STUDENT_MIS",
    } as unknown as IntegrationAdapter),
    /must implement fetchPage/,
  );
});

test("registration snapshots adapter behaviour against later caller mutation", async () => {
  const originalFetch = async () => ({ records: [], hasMore: false });
  const replacementFetch = async () => ({
    records: [{ source_record_id: "unexpected", payload: {} }],
    hasMore: false,
  });
  const mutable = {
    system: "STUDENT_MIS" as const,
    fetchPage: originalFetch,
  };

  registerIntegrationAdapter("STUDENT_MIS_IMMUTABLE", mutable);
  try {
    mutable.fetchPage = replacementFetch;
    mutable.system = "TRAINING_MIS";

    const registered = integrationAdapterRegistry.get("STUDENT_MIS_IMMUTABLE");
    assert.equal(registered?.system, "STUDENT_MIS");
    assert.deepEqual(
      await registered?.fetchPage({ sourceCode: "STUDENT_MIS_IMMUTABLE" }),
      { records: [], hasMore: false },
    );
  } finally {
    unregisterIntegrationAdapter("STUDENT_MIS_IMMUTABLE");
  }
});
