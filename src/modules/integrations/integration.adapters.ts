import type { IntegrationAdapter, IntegrationAdapterRegistry } from "./integration.types";
const adapters = new Map<string, IntegrationAdapter>();
export const integrationAdapterRegistry: IntegrationAdapterRegistry = { get: (sourceCode) => adapters.get(sourceCode) };
/** Register reviewed adapters with fixed approved endpoints; never accept arbitrary URLs from admin input. */
export function registerIntegrationAdapter(sourceCode: string, adapter: IntegrationAdapter): void {
  if (!/^[A-Z][A-Z0-9_]{1,59}$/.test(sourceCode)) throw new Error("Invalid integration source code");
  if (adapters.has(sourceCode)) throw new Error(`Adapter already registered for ${sourceCode}`);
  adapters.set(sourceCode, adapter);
}
export function unregisterIntegrationAdapter(sourceCode: string): void { adapters.delete(sourceCode); }
