import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify the exact request bytes using the existing sha256=<hex> signature
 * format. The caller is responsible for resolving and validating the secret.
 */
export function verifyIntegrationWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  const supplied = signature.match(/^sha256=([a-f0-9]{64})$/i)?.[1];
  if (!supplied) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(supplied, "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}
