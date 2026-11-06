import type { IntegrationAdapter, IntegrationAdapterRegistry } from "./integration.types";
import { INTEGRATION_SYSTEMS } from "./integration.types";

const adapters = new Map<string, IntegrationAdapter>();

export const integrationAdapterRegistry: IntegrationAdapterRegistry = {
  get: (sourceCode) => adapters.get(sourceCode),
};

/**
 * Register reviewed adapters with fixed approved endpoints; never accept arbitrary URLs from admin input.
 * Store an immutable snapshot so later mutation of the caller's object cannot silently replace its behaviour.
 */
export function registerIntegrationAdapter(sourceCode: string, adapter: IntegrationAdapter): void {
  if (!/^[A-Z][A-Z0-9_]{1,59}$/.test(sourceCode)) {
    throw new Error("Invalid integration source code");
  }
  if (adapters.has(sourceCode)) {
    throw new Error(`Adapter already registered for ${sourceCode}`);
  }
  if (!adapter || typeof adapter !== "object") {
    throw new Error("Invalid integration adapter");
  }
  if (!(INTEGRATION_SYSTEMS as readonly string[]).includes(adapter.system)) {
    throw new Error("Invalid integration adapter system");
  }
  if (typeof adapter.fetchPage !== "function") {
    throw new Error("Integration adapter must implement fetchPage");
  }

  adapters.set(sourceCode, Object.freeze({
    system: adapter.system,
    fetchPage: adapter.fetchPage.bind(adapter),
  }));
}

export function unregisterIntegrationAdapter(sourceCode: string): void {
  adapters.delete(sourceCode);
}
