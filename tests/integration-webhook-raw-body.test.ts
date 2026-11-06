import test from "node:test";
import assert from "node:assert/strict";
import { isIntegrationWebhookRequestPath } from "../src/modules/integrations/integration.webhook.raw-body";

test("matches integration webhook endpoint paths", () => {
  assert.equal(isIntegrationWebhookRequestPath("/api/v1/integrations/webhooks/1"), true);
  assert.equal(isIntegrationWebhookRequestPath("/api/v1/integrations/webhooks/42?source=test"), true);
  assert.equal(isIntegrationWebhookRequestPath("/api/v1/integrations/webhooks/42/"), true);
});

test("does not match ordinary API paths or malformed webhook paths", () => {
  assert.equal(isIntegrationWebhookRequestPath("/api/v1/integrations/1/ingest"), false);
  assert.equal(isIntegrationWebhookRequestPath("/api/v1/integrations/webhooks"), false);
  assert.equal(isIntegrationWebhookRequestPath("/api/v1/integrations/webhooks/0"), false);
  assert.equal(isIntegrationWebhookRequestPath("/api/v1/integrations/webhooks/not-a-number"), false);
  assert.equal(isIntegrationWebhookRequestPath("/api/v1/integrations/webhooks/2/extra"), false);
});
