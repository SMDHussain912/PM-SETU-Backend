import assert from "node:assert/strict";
import test from "node:test";
import { openApiSpec } from "../../src/docs/swagger";

test("dashboard training reporting OpenAPI documents concrete response contracts", () => {
    const schemas = openApiSpec.components.schemas as Record<string, any>;
    const paths = openApiSpec.paths as Record<string, any>;

    assert.ok(schemas.TrainingCapacityMetric);
    assert.ok(schemas.TrainingCapacityCoverage);
    assert.ok(schemas.TrainingCapacityReporting);
    assert.ok(schemas.TrainingCapacityItiReporting);

    const stateResponse = paths["/dashboard/training/reporting"].get.responses["200"]
        .content["application/json"].schema;
    const itiResponse = paths["/dashboard/training/itis/{id}"].get.responses["200"]
        .content["application/json"].schema;

    assert.equal(stateResponse.properties.data.$ref, "#/components/schemas/TrainingCapacityReporting");
    assert.equal(itiResponse.properties.data.$ref, "#/components/schemas/TrainingCapacityItiReporting");

    const metric = schemas.TrainingCapacityMetric;
    assert.deepEqual(metric.required, ["metric_id", "classification", "unit", "availability", "value"]);
    assert.deepEqual(metric.properties.availability.enum, ["AVAILABLE", "NOT_AVAILABLE"]);
    assert.equal(metric.properties.value.type, "integer");
    assert.equal(metric.properties.value.nullable, true);
    assert.equal(metric.properties.value.minimum, 0);

    const coverage = schemas.TrainingCapacityCoverage;
    assert.deepEqual(coverage.required, ["total_itis", "itis_with_capacity", "itis_without_capacity"]);
    assert.ok(coverage.properties.itis_without_reportable_cluster);

    const state = schemas.TrainingCapacityReporting;
    assert.deepEqual(state.required, [
        "scope",
        "metric",
        "coverage",
        "without_reportable_cluster",
        "by_cluster",
        "reporting_context",
    ]);
    assert.deepEqual(state.properties.scope.enum, ["STATE"]);
    assert.deepEqual(state.properties.metric.$ref, "#/components/schemas/TrainingCapacityMetric");
    assert.deepEqual(state.properties.coverage.$ref, "#/components/schemas/TrainingCapacityCoverage");

    const unassigned = state.properties.without_reportable_cluster;
    assert.deepEqual(unassigned.required, ["student_capacity", "coverage"]);
    assert.equal(unassigned.properties.student_capacity.nullable, true);
    assert.deepEqual(unassigned.properties.coverage.$ref, "#/components/schemas/TrainingCapacityCoverage");

    const cluster = state.properties.by_cluster.items;
    assert.deepEqual(cluster.required, ["cluster_id", "cluster_name", "student_capacity", "coverage"]);
    assert.equal(cluster.properties.student_capacity.nullable, true);
    assert.deepEqual(cluster.properties.coverage.$ref, "#/components/schemas/TrainingCapacityCoverage");

    const stateContext = state.properties.reporting_context;
    assert.deepEqual(stateContext.required, ["data_as_of", "reporting_period", "source_freshness"]);
    assert.equal(stateContext.properties.data_as_of.nullable, true);
    assert.equal(stateContext.properties.reporting_period.nullable, true);
    assert.deepEqual(stateContext.properties.source_freshness.enum, ["NOT_TRACKED"]);

    const iti = schemas.TrainingCapacityItiReporting;
    assert.deepEqual(iti.required, ["scope", "metric", "reporting_context", "iti"]);
    assert.deepEqual(iti.properties.scope.enum, ["ITI"]);
    assert.deepEqual(iti.properties.metric.$ref, "#/components/schemas/TrainingCapacityMetric");

    const itiContext = iti.properties.reporting_context;
    assert.deepEqual(itiContext.required, ["data_as_of", "reporting_period", "source_freshness"]);
    assert.deepEqual(itiContext.properties.source_freshness.enum, ["NOT_TRACKED"]);

    const itiRecord = iti.properties.iti;
    assert.deepEqual(itiRecord.required, [
        "iti_id",
        "iti_code",
        "iti_name",
        "type",
        "district",
        "cluster_id",
        "cluster_name",
        "student_capacity",
    ]);
    assert.deepEqual(itiRecord.properties.type.enum, ["HUB", "SPOKE"]);
    assert.equal(itiRecord.properties.cluster_id.nullable, true);
    assert.equal(itiRecord.properties.cluster_name.nullable, true);
    assert.equal(itiRecord.properties.student_capacity.nullable, true);
    assert.equal(itiRecord.properties.student_capacity.minimum, 0);
});

test("dashboard finance OpenAPI documents unavailable official financial progress", () => {
    const schemas = openApiSpec.components.schemas as Record<string, any>;
    const finance = schemas.FinanceMetrics;

    assert.ok(finance);
    assert.ok(finance.required.includes("official_financial_progress"));

    const official = finance.properties.official_financial_progress;
    assert.deepEqual(official.required, [
        "status",
        "approved_outlay",
        "funds_released",
        "expenditure",
        "utilisation_percentage",
        "balance",
    ]);
    assert.deepEqual(official.properties.status.enum, ["SOURCE_NOT_CONNECTED"]);
    for (const field of [
        "approved_outlay",
        "funds_released",
        "expenditure",
        "utilisation_percentage",
        "balance",
    ]) {
        assert.equal(official.properties[field].type, "number");
        assert.equal(official.properties[field].nullable, true);
    }
});
