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
