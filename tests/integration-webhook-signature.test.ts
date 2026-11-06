import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyIntegrationWebhookSignature } from "../src/modules/integrations/integration.webhook.signature";

const secret = "test-webhook-secret-that-is-at-least-32-bytes";
const body = Buffer.from('{"event":"record.updated","id":"evt-123"}');
const signature = () => "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

test("accepts a valid SHA-256 HMAC over the exact raw body", () => {
  assert.equal(verifyIntegrationWebhookSignature(body, signature(), secret), true);
});

test("rejects a signature generated for different raw bytes", () => {
  const changedBody = Buffer.from('{"event":"record.updated","id":"evt-124"}');
  assert.equal(verifyIntegrationWebhookSignature(changedBody, signature(), secret), false);
});

test("rejects a signature generated with a different secret", () => {
  const otherSecretSignature = "sha256=" + createHmac("sha256", "another-secret-that-is-also-long-enough")
    .update(body).digest("hex");
  assert.equal(verifyIntegrationWebhookSignature(body, otherSecretSignature, secret), false);
});

test("rejects malformed signature encodings without throwing", () => {
  for (const value of ["", "sha256=", "sha256=xyz", "sha256=" + "a".repeat(63), "sha512=" + "a".repeat(64)]) {
    assert.equal(verifyIntegrationWebhookSignature(body, value, secret), false);
  }
});

test("accepts uppercase hexadecimal while preserving the existing header contract", () => {
  assert.equal(verifyIntegrationWebhookSignature(body, signature().toUpperCase().replace("SHA256=", "sha256="), secret), true);
});
