import test from "node:test";
import assert from "node:assert/strict";
import {
  captureIntegrationWebhookRawBody,
  isIntegrationWebhookRequestPath,
} from "../src/modules/integrations/integration.webhook.raw-body";

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

test("captures an exact independent raw-body copy for webhook requests", () => {
  const original = Buffer.from('{"records":[{"source_record_id":"a"}]}');
  const request: { url?: string; rawBody?: Buffer } = {
    url: "/api/v1/integrations/webhooks/42?delivery=1",
  };

  captureIntegrationWebhookRawBody(request, original);

  assert.deepEqual(request.rawBody, original);
  assert.notEqual(request.rawBody, original);
  original[0] = 0x20;
  assert.equal(request.rawBody?.toString(), '{"records":[{"source_record_id":"a"}]}');
});

test("does not retain raw bodies for ordinary requests or missing URLs", () => {
  const body = Buffer.from('{"ok":true}');
  const ordinary = { url: "/api/v1/users/me" };
  const missing = {};

  captureIntegrationWebhookRawBody(ordinary, body);
  captureIntegrationWebhookRawBody(missing, body);

  assert.equal("rawBody" in ordinary, false);
  assert.equal("rawBody" in missing, false);
});
