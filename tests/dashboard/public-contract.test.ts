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

const paths = openApiSpec.paths as unknown as Record<string, Record<string, Operation>>;

const dashboardContracts = [
    ["/dashboard/contract", "DashboardContractResponse"],
    ["/dashboard/state", "StateMetrics"],
    ["/dashboard/clusters", "ClusterSummary"],
    ["/dashboard/clusters/{id}", "ClusterDashboardResponse"],
    ["/dashboard/finance", "FinanceMetrics"],
    ["/dashboard/training", "TrainingMetrics"],
    ["/dashboard/placements", "PlacementMetrics"],
] as const;

test("public dashboard OpenAPI contract covers all seven read-only endpoints", () => {
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

test("dashboard OpenAPI schemas mark every emitted top-level field as required", () => {
    const schemas = openApiSpec.components.schemas as unknown as Record<string, { required?: string[] }>;
    const expected: Record<string, string[]> = {
        DashboardContractResponse: ["contract_version", "generated_at", "reporting_context", "metrics"],
        DashboardMetricContract: ["metric_id", "label", "classification", "unit", "source", "availability", "aggregation_levels", "notes", "official_kpi_code"],
        StateMetrics: ["clusters", "hub_itis", "spoke_itis", "aips", "spvs", "sips_submitted", "sips_approved", "investment", "trainees", "industries_engaged"],
        ClusterSummary: ["id", "name", "district", "sector", "hub_itis", "spoke_itis", "aips", "spvs", "investment"],
        ClusterDashboardResponse: ["cluster", "metrics", "itis", "aips"],
        FinanceMetrics: ["total_investment", "total_sip_proposed", "total_sip_infrastructure", "total_sip_equipment", "total_sip_training", "total_sip_industry", "total_sip_government", "by_cluster"],
        TrainingMetrics: ["total_student_capacity", "by_cluster", "by_iti_type"],
        PlacementMetrics: ["message"],
    };

    for (const [name, fields] of Object.entries(expected)) {
        assert.deepEqual(schemas[name]?.required, fields, `${name} required fields must match its emitted response`);
    }
});
