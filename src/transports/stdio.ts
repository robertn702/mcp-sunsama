import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeStdioAuth } from "../auth/stdio.js";

export async function setupStdioTransport(server: McpServer) {
  // Initialize global authentication
  await initializeStdioAuth();

  // Create and connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Stdio transport initialized');
}
