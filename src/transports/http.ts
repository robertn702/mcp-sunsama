import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { authenticateHttpRequest } from "../auth/http.js";
import type { TransportConfig } from "../config/transport.js";

// Session storage shared with client-resolver
export const httpSessionDataMap = new Map<string, any>();

export async function setupHttpTransport(
  server: McpServer,
  config: Extract<TransportConfig, { transportType: "http" }>
) {
  const app = express();

  // CORS with MCP-required headers
  app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Mcp-Session-Id',
      'Last-Event-ID'
    ],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  }));

  app.use(express.json({ limit: '4mb' }));

  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'mcp-sunsama',
      version: '0.15.0',
      transport: 'http'
    });
  });

  // MCP endpoint
  app.post(config.httpStream.endpoint, async (req, res) => {
    let sessionId: string | undefined;

    try {
      // Authenticate and create session-scoped client
      const authHeader = req.headers['authorization'];
      const sessionData = await authenticateHttpRequest(
        Array.isArray(authHeader) ? authHeader[0] : authHeader
      );

      // Create transport with session management
      const transport = new StreamableHTTPServerTransport({
        enableDnsRebindingProtection: true,
        allowedHosts: ['127.0.0.1', 'localhost', `127.0.0.1:${config.httpStream.port}`, `localhost:${config.httpStream.port}`],
        sessionIdGenerator: () => {
          // Generate unique session ID for this request
          sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          httpSessionDataMap.set(sessionId, sessionData);
          return sessionId;
        }
      });

      // Handle request
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('HTTP transport error:', error);

      if (!res.headersSent) {
        res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Authentication failed'
          },
          id: null
        });
      }
    } finally {
      // Cleanup session data after request
      if (sessionId) {
        httpSessionDataMap.delete(sessionId);
      }
    }
  });

  const { port } = config.httpStream;

  return new Promise<void>((resolve, reject) => {
    app.listen(port, () => {
      console.error(`HTTP transport listening on port ${port}`);
      console.error(`MCP endpoint: http://localhost:${port}${config.httpStream.endpoint}`);
      resolve();
    }).on('error', reject);
  });
}
