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

    const metric = schemas.TrainingCapacityMetric as any;
    assert.equal(metric.properties.value.nullable, true);
    assert.deepEqual(metric.properties.availability.enum, ["AVAILABLE", "NOT_AVAILABLE"]);

    const context = (schemas.TrainingCapacityReporting as any).properties.reporting_context;
    assert.deepEqual(context.properties.source_freshness.enum, ["NOT_TRACKED"]);
});
