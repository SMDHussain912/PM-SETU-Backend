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
    ["/dashboard/clusters", "ClustersDashboardResponse"],
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

test("dashboard aggregate item schemas require every emitted field", () => {
    const schemas = openApiSpec.components.schemas as unknown as Record<string, {
        properties?: Record<string, { items?: { required?: string[] } }>;
    }>;
    assert.deepEqual(
        schemas.FinanceMetrics?.properties?.by_cluster?.items?.required,
        ["cluster_id", "cluster_name", "investment", "sip_proposed"],
    );
    assert.deepEqual(
        schemas.TrainingMetrics?.properties?.by_cluster?.items?.required,
        ["cluster_id", "cluster_name", "student_capacity", "iti_count"],
    );
});

test("dashboard OpenAPI schemas mark every emitted top-level field as required", () => {
    const schemas = openApiSpec.components.schemas as unknown as Record<string, { required?: string[] }>;
    const expected: Record<string, string[]> = {
        DashboardContractResponse: ["contract_version", "generated_at", "reporting_context", "metrics"],
        DashboardMetricContract: ["metric_id", "label", "classification", "unit", "source", "availability", "aggregation_levels", "notes", "official_kpi_code"],
        StateMetrics: ["clusters", "hub_itis", "spoke_itis", "aips", "spvs", "sips_submitted", "sips_approved", "investment", "trainees", "industries_engaged"],
        ClusterSummary: ["id", "name", "district", "sector", "hub_itis", "spoke_itis", "aips", "spvs", "investment"],
        ClusterDashboardResponse: ["cluster", "metrics", "itis", "aips"],
        FinanceMetrics: ["official_financial_progress", "total_investment", "total_sip_proposed", "total_sip_infrastructure", "total_sip_equipment", "total_sip_training", "total_sip_industry", "total_sip_government", "by_cluster"],
        TrainingMetrics: ["total_student_capacity", "by_cluster", "by_iti_type"],
        PlacementMetrics: ["message"],
    };

    for (const [name, fields] of Object.entries(expected)) {
        assert.deepEqual(schemas[name]?.required, fields, `${name} required fields must match its emitted response`);
    }
});


test("new training reporting endpoints remain public and read-only", () => {
    for (const path of ["/dashboard/training/reporting", "/dashboard/training/itis/{id}"]) {
        const pathItem = paths[path];
        assert.ok(pathItem, `missing OpenAPI path: ${path}`);
        assert.deepEqual(Object.keys(pathItem), ["get"]);
        const operation = pathItem.get;
        assert.deepEqual(operation?.security, []);
        assert.ok(operation?.responses?.["200"]);
        assert.ok(operation?.responses?.["429"]);
        assert.ok(operation?.responses?.["500"]);
    }

    const itiOperation = paths["/dashboard/training/itis/{id}"]?.get;
    assert.ok(itiOperation?.responses?.["404"]);
    assert.ok(itiOperation?.responses?.["422"]);
});

test("dashboard contract OpenAPI schema advertises the current additive version", () => {
    const schemas = openApiSpec.components.schemas as unknown as Record<string, {
        properties?: Record<string, { example?: string }>;
    }>;
    assert.equal(
        schemas.DashboardContractResponse?.properties?.contract_version?.example,
        "1.1.0",
    );
});
