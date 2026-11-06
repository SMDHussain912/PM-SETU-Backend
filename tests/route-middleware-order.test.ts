import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const protectedRouteFiles = [
    { path: "src/modules/academics/academic.routes.ts", expectedRoutes: 6 },
    { path: "src/modules/approvals/approval.routes.ts", expectedRoutes: 7 },
    { path: "src/modules/industry-outcomes/industry-outcome.routes.ts", expectedRoutes: 7 },
    { path: "src/modules/integrations/integration.routes.ts", expectedRoutes: 7 },
];

test("protected module routes authorize before validating request input", () => {
    for (const file of protectedRouteFiles) {
        const source = readFileSync(resolve(process.cwd(), file.path), "utf8");
        const routeCalls = [...source.matchAll(/\b(?:router|approvalRouter)\.(?:get|post|patch|put|delete)\([\s\S]*?\);/g)];

        assert.equal(
            routeCalls.length,
            file.expectedRoutes,
            `${file.path}: route inventory changed; review this test when adding/removing endpoints`,
        );

        for (const [index, match] of routeCalls.entries()) {
            const route = match[0];
            const authorizationIndex = route.indexOf("requireRoles(");
            const validationIndex = route.indexOf("validate(");

            assert.notEqual(
                authorizationIndex,
                -1,
                `${file.path} route #${index + 1} is missing an explicit RBAC guard`,
            );

            if (validationIndex !== -1) {
                assert.ok(
                    authorizationIndex < validationIndex,
                    `${file.path} route #${index + 1} validates before authorization`,
                );
            }

            const bodyParserIndex = route.indexOf("express.text(");
            if (bodyParserIndex !== -1) {
                assert.ok(
                    authorizationIndex < bodyParserIndex,
                    `${file.path} route #${index + 1} parses a CSV body before authorization`,
                );
            }
        }
    }
});

const scopedRouteFiles = [
    { path: "src/modules/aips/aip.routes.ts", expectedRoutes: 5 },
    { path: "src/modules/clusters/cluster.routes.ts", expectedRoutes: 5 },
    { path: "src/modules/itis/iti.routes.ts", expectedRoutes: 6 },
    { path: "src/modules/sips/sip.routes.ts", expectedRoutes: 6 },
    { path: "src/modules/spvs/spv.routes.ts", expectedRoutes: 6 },
    { path: "src/modules/aips/aip-workflow.routes.ts", expectedRoutes: 7 },
    { path: "src/modules/clusters/cluster-workflow.routes.ts", expectedRoutes: 7 },
    { path: "src/modules/itis/iti-workflow.routes.ts", expectedRoutes: 6 },
    { path: "src/modules/spvs/spv-workflow.routes.ts", expectedRoutes: 7 },
];

test("resource-scope authorization runs before request validation", () => {
    for (const file of scopedRouteFiles) {
        const source = readFileSync(resolve(process.cwd(), file.path), "utf8");
        const routeCalls = [...source.matchAll(/\\b[A-Za-z_$][\\w$]*\\.(?:get|post|patch|put|delete)\\([\\s\\S]*?\\);/g)];

        assert.equal(
            routeCalls.length,
            file.expectedRoutes,
            `${file.path}: route inventory changed; review this test when adding/removing endpoints`,
        );

        for (const [index, match] of routeCalls.entries()) {
            const route = match[0];
            const scopeIndex = route.indexOf("requireResourceScope(");
            const validationIndex = route.indexOf("validate(");
            const reassignmentIndex = route.indexOf("preventClusterAdminReassignment(");

            if (scopeIndex !== -1 && validationIndex !== -1) {
                assert.ok(
                    scopeIndex < validationIndex,
                    `${file.path} route #${index + 1} validates before resource-scope authorization`,
                );
            }

            if (reassignmentIndex !== -1 && validationIndex !== -1) {
                assert.ok(
                    reassignmentIndex < validationIndex,
                    `${file.path} route #${index + 1} validates before cluster reassignment authorization`,
                );
            }
        }
    }
});
