/**
 * Match only the public signed-webhook route before Express mounts the router.
 * Ordinary JSON API requests do not need a retained raw-body copy.
 */
export function isIntegrationWebhookRequestPath(requestPath: string): boolean {
  const pathname = requestPath.split("?", 1)[0];
  return /^\/api\/v1\/integrations\/webhooks\/[1-9]\d*\/?$/.test(pathname);
}
