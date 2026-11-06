/**
 * Match only the public signed-webhook route before Express mounts the router.
 * Ordinary JSON API requests do not need a retained raw-body copy.
 */
export function isIntegrationWebhookRequestPath(requestPath: string): boolean {
  const pathname = requestPath.split("?", 1)[0];
  return /^\/api\/v1\/integrations\/webhooks\/[1-9]\d*\/?$/.test(pathname);
}

type RawBodyCaptureRequest = {
  url?: string;
  rawBody?: Buffer;
};

/**
 * Express JSON-parser verify callback: retain the exact bytes only for signed
 * integration webhooks. The optional URL guard matches Node's IncomingMessage
 * typing and makes missing URLs a safe no-op.
 */
export function captureIntegrationWebhookRawBody(
  request: RawBodyCaptureRequest,
  body: Buffer,
): void {
  if (typeof request.url !== "string" || !isIntegrationWebhookRequestPath(request.url)) {
    return;
  }

  request.rawBody = Buffer.from(body);
}
