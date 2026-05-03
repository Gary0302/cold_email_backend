/**
 * Placeholder for Apollo MCP wiring.
 *
 * The Vercel AI SDK v6 removed the built-in `experimental_createMCPClient` that
 * v5 shipped. To plug an MCP server in here we'd need to:
 *   1. Add `@modelcontextprotocol/sdk` (already available on npm at 1.29+).
 *   2. Open an SSE transport to APOLLO_MCP_URL.
 *   3. Translate each MCP tool descriptor into the AI SDK's `tool({ ... })`
 *      shape so it can be merged into `streamText({ tools })`.
 *
 * For the MVP we ship the `apollo_search_contacts` REST tool in tools.ts
 * instead — it works today, deploys clean to Vercel, and avoids debugging
 * MCP transports on hack day. Swap to MCP post-MVP if/when Apollo's hosted
 * MCP endpoint is publicly available.
 */
export async function getApolloMCPTools(): Promise<Record<string, never>> {
  return {};
}
