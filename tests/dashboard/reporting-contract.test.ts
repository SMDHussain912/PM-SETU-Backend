import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardContract } from "../../src/modules/dashboard/dashboard.contract";

test("dashboard reporting contract is versioned and distinguishes generation time from data freshness", () => {
    const generatedAt = new Date("2026-11-06T12:00:00.000Z");
    const contract = getDashboardContract(generatedAt);

    assert.equal(contract.contract_version, "1.0.0");
    assert.equal(contract.generated_at, "2026-11-06T12:00:00.000Z");
    assert.deepEqual(contract.reporting_context, {
        data_as_of: null,
        reporting_period: null,
        source_freshness: "NOT_TRACKED",
    });
    assert.ok(contract.metrics.length > 0);

    const ids = contract.metrics.map((metric) => metric.metric_id);
    assert.equal(new Set(ids).size, ids.length, "metric identifiers must be unique");
});

test("dashboard contract keeps unavailable outcomes distinct from zero-valued registry counts", () => {
    const contract = getDashboardContract();
    const byId = new Map(contract.metrics.map((metric) => [metric.metric_id, metric]));

    assert.equal(byId.get("registry.clusters")?.availability, "AVAILABLE");
    assert.equal(byId.get("outcomes.trainees")?.availability, "NOT_AVAILABLE");
    assert.equal(byId.get("industry.engaged")?.availability, "NOT_AVAILABLE");
    assert.equal(byId.get("placements.count")?.availability, "NOT_AVAILABLE");

    for (const id of ["outcomes.trainees", "industry.engaged", "placements.count"]) {
        assert.equal(byId.get(id)?.source, null);
        assert.deepEqual(byId.get(id)?.aggregation_levels, []);
    }
});

test("dashboard contract labels AIP and SIP values as planning indicators, not official finance KPIs", () => {
    const contract = getDashboardContract();
    const byId = new Map(contract.metrics.map((metric) => [metric.metric_id, metric]));

    assert.equal(byId.get("planning.aip_investment")?.classification, "PLANNING_INDICATOR");
    assert.equal(byId.get("planning.sip_proposed_contributions")?.classification, "PLANNING_INDICATOR");
    assert.equal(byId.get("planning.aip_investment")?.official_kpi_code, null);
    assert.equal(byId.get("planning.sip_proposed_contributions")?.official_kpi_code, null);
});

test("official finance KPI entries retain their identifiers and approval gates", () => {
    const contract = getDashboardContract();
    const finance = contract.metrics.filter((metric) => metric.official_kpi_code !== null);

    assert.deepEqual(
        finance.map((metric) => metric.official_kpi_code),
        ["FIN-01", "FIN-02", "FIN-03", "FIN-04", "FIN-05"],
    );
    assert.deepEqual(
        finance.map((metric) => metric.availability),
        ["SOURCE_NOT_CONNECTED", "SOURCE_NOT_CONNECTED", "SOURCE_NOT_CONNECTED", "DEFINITION_PENDING", "DEFINITION_PENDING"],
    );
    assert.ok(finance.every((metric) => metric.source === null));
});
