import test from "node:test";
import assert from "node:assert/strict";
import { applyDocumentDownloadSecurityHeaders } from "../src/modules/documents/document.download";

test("document downloads disable browser MIME sniffing", () => {
    const headers = new Map<string, string>();
    applyDocumentDownloadSecurityHeaders({
        setHeader(name: string, value: string | number | readonly string[]) {
            headers.set(name.toLowerCase(), String(value));
            return this;
        },
    } as never);

    assert.equal(headers.get("x-content-type-options"), "nosniff");
});
