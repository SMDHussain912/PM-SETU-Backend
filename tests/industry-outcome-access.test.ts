import test from "node:test";
import assert from "node:assert/strict";
import { buildOutcomeScopeWhere } from "../src/modules/industry-outcomes/industry-outcome.access";
import { ROLE_CODES } from "../src/modules/roles/role.constants";

test("global outcome readers bypass organisation scope filters", () => {
    assert.equal(buildOutcomeScopeWhere([ROLE_CODES.STATE_PMU_ADMIN], []), undefined);
});

test("cluster administrators are restricted to assigned clusters", () => {
    assert.deepEqual(
        buildOutcomeScopeWhere([ROLE_CODES.CLUSTER_ADMIN], [
            { scopeType: "CLUSTER", scopeId: 12 },
            { scopeType: "CLUSTER", scopeId: 19 },
            { scopeType: "ITI", scopeId: 44 },
        ]),
        { OR: [{ clusterId: 12 }, { clusterId: 19 }] },
    );
});

test("Hub and Spoke ITI users are restricted to directly assigned ITIs", () => {
    assert.deepEqual(
        buildOutcomeScopeWhere([ROLE_CODES.HUB_ITI_USER], [
            { scopeType: "ITI", scopeId: 44 },
            { scopeType: "CLUSTER", scopeId: 12 },
        ]),
        { OR: [{ itiId: 44 }] },
    );
    assert.deepEqual(
        buildOutcomeScopeWhere([ROLE_CODES.SPOKE_ITI_USER], [{ scopeType: "ITI", scopeId: 55 }]),
        { OR: [{ itiId: 55 }] },
    );
});

test("scoped users with no compatible assignments receive an impossible filter", () => {
    assert.deepEqual(buildOutcomeScopeWhere([ROLE_CODES.CLUSTER_ADMIN], []), { id: -1 });
    assert.deepEqual(
        buildOutcomeScopeWhere([ROLE_CODES.HUB_ITI_USER], [{ scopeType: "CLUSTER", scopeId: 12 }]),
        { id: -1 },
    );
});
