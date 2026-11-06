import type { Response } from "express";

/**
 * Prevent browsers from MIME-sniffing downloaded documents. Downloads are
 * always sent as attachments by the controller; this header is defense in
 * depth for clients that handle the response unexpectedly.
 */
export function applyDocumentDownloadSecurityHeaders(
    response: Pick<Response, "setHeader">,
): void {
    response.setHeader("X-Content-Type-Options", "nosniff");
}
