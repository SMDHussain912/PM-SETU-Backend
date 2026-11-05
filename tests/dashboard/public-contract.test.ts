import assert from "node:assert/strict";
import test from "node:test";
import { openApiSpec } from "../../src/docs/swagger";

type Operation = {
    security?: unknown[];
    parameters?: Array<{
        name?: string;
        in?: string;
        required?: boolean;
        schema?: { type?: string; minimum?: number };
    }>;
    responses?: Record<string, {
        description?: string;
        content?: Record<string, {
            schema?: {
                properties?: Record<string, unknown>;
            };
        }>;
    }>;
};

const paths = openApiSpec.paths as Record<string, Record<string, Operation>>;

const dashboardContracts = [
    ["/dashboard/state", "StateMetrics"],
    ["/dashboard/clusters", "ClusterSummary"],
    ["/dashboard/clusters/{id}", "ClusterDashboardResponse"],
    ["/dashboard/finance", "FinanceMetrics"],
    ["/dashboard/training", "TrainingMetrics"],
    ["/dashboard/placements", "PlacementMetrics"],
] as const;

test("public dashboard OpenAPI contract covers all six read-only endpoints", () => {
    for (const [path, responseSchema] of dashboardContracts) {
        const pathItem = paths[path];
        assert.ok(pathItem, `missing OpenAPI path: ${path}`);
        assert.deepEqual(Object.keys(pathItem), ["get"], `${path} must remain read-only`);

        const operation = pathItem.get;
        assert.ok(operation, `${path} must define GET`);
        assert.deepEqual(operation.security, [], `${path} is intentionally public`);
        assert.ok(operation.responses?.["200"], `${path} must document success`);

        const response = operation.responses?.["200"];
        const schemaProperties = response?.content?.["application/json"]?.schema?.properties;
        assert.ok(schemaProperties, `${path} must document the response envelope`);
        assert.ok(
            JSON.stringify(schemaProperties).includes(`#/components/schemas/${responseSchema}`),
            `${path} must reference ${responseSchema}`,
        );
        assert.ok(operation.responses?.["429"], `${path} must document rate limiting`);
        assert.ok(operation.responses?.["500"], `${path} must document server errors`);
    }
});

test("cluster dashboard contract validates a positive integer path parameter", () => {
    const operation = paths["/dashboard/clusters/{id}"]?.get;
    const id = operation?.parameters?.find((parameter) => parameter.name === "id");

    assert.ok(id, "cluster detail must document its id parameter");
    assert.equal(id.in, "path");
    assert.equal(id.required, true);
    assert.equal(id.schema?.type, "integer");
    assert.equal(id.schema?.minimum, 1);
    assert.ok(operation?.responses?.["404"], "cluster detail must document not found");
    assert.ok(operation?.responses?.["422"], "cluster detail must document invalid identifiers");
});
