import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import type {
  JSONRPCResponse,
  JSONRPCError,
  ListToolsResult,
  CallToolResult
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Integration Tests for HTTP Transport
 *
 * These tests require real Sunsama credentials and will be skipped if
 * SUNSAMA_EMAIL and SUNSAMA_PASSWORD are not set in environment.
 *
 * Run these tests locally with: bun test:integration
 * They should NOT run in CI/CD pipelines.
 */

// Server info type (not provided by MCP SDK)
interface ServerInfo {
  name: string;
  transport: string;
  version: string;
  activeSessions: number;
}

const SUNSAMA_EMAIL = process.env.SUNSAMA_EMAIL;
const SUNSAMA_PASSWORD = process.env.SUNSAMA_PASSWORD;
const TEST_PORT = process.env.TEST_PORT || "3099";
const BASE_URL = `http://localhost:${TEST_PORT}`;

const shouldRunIntegrationTests = Boolean(SUNSAMA_EMAIL && SUNSAMA_PASSWORD);

// Helper to create Basic Auth header
function createAuthHeader(email: string, password: string): string {
  return `Basic ${Buffer.from(`${email}:${password}`).toString("base64")}`;
}

// Type-safe response interface for tests
interface McpError {
  code: number;
  message: string;
  data?: unknown;
}

interface McpResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: McpError;
}

// Helper to make MCP requests with properly typed responses
async function mcpRequest(method: string, params: any = {}, auth?: string): Promise<McpResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
  };

  if (auth) {
    headers["Authorization"] = auth;
  }

  const response = await fetch(`${BASE_URL}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: Math.floor(Math.random() * 10000),
    }),
  });

  return response.json() as Promise<McpResponse>;
}

describe.skipIf(!shouldRunIntegrationTests)("HTTP Transport Integration Tests", () => {
  beforeAll(() => {
    console.log("\n🔧 Integration Test Setup");
    console.log("═".repeat(50));
    console.log(`Test server: ${BASE_URL}`);
    console.log(`Using credentials: ${SUNSAMA_EMAIL}`);
    console.log("Note: Server must be running separately on port", TEST_PORT);
    console.log("═".repeat(50) + "\n");
  });

  afterAll(() => {
    console.log("\n✅ Integration tests completed\n");
  });

  describe("Server Health", () => {
    test("should return server info", async () => {
      const response = await fetch(`${BASE_URL}/`);
      const data = await response.json() as ServerInfo;

      expect(response.status).toBe(200);
      expect(data.name).toBe("mcp-sunsama");
      expect(data.transport).toBe("http");
      expect(data).toHaveProperty("activeSessions");
      expect(data).toHaveProperty("version");
    });
  });

  describe("Authentication", () => {
    test("should authenticate with valid credentials", async () => {
      const auth = createAuthHeader(SUNSAMA_EMAIL!, SUNSAMA_PASSWORD!);
      const result = await mcpRequest("tools/list", {}, auth);

      expect(result.error).toBeUndefined();
      expect(result.result).toBeDefined();
      expect(result.result.tools).toBeArray();
      expect(result.result.tools.length).toBeGreaterThan(0);
    });

    test("should reject invalid credentials", async () => {
      const auth = createAuthHeader("wrong@example.com", "wrongpassword");
      const result = await mcpRequest("tools/list", {}, auth);

      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe(-32000);
      expect(result.error!.message).toContain("Authentication failed");
    });

    test("should reject missing authorization", async () => {
      const result = await mcpRequest("tools/list", {});

      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe(-32000);
    });
  });

  describe("Session Caching", () => {
    test("should cache authenticated sessions", async () => {
      const auth = createAuthHeader(SUNSAMA_EMAIL!, SUNSAMA_PASSWORD!);

      // First request - creates session
      const result1 = await mcpRequest("tools/call", {
        name: "get-user",
        arguments: {},
      }, auth);

      expect(result1.error).toBeUndefined();
      expect(result1.result).toBeDefined();

      // Second request - should use cached session
      const result2 = await mcpRequest("tools/call", {
        name: "get-user",
        arguments: {},
      }, auth);

      expect(result2.error).toBeUndefined();
      expect(result2.result).toBeDefined();

      // Both should return the same user
      const user1 = JSON.parse(result1.result.content[0].text);
      const user2 = JSON.parse(result2.result.content[0].text);

      expect(user1._id).toBe(user2._id);
      expect(user1.email).toBe(user2.email);
    });

    test("should create separate sessions for different credentials", async () => {
      if (!process.env.SUNSAMA_EMAIL_2 || !process.env.SUNSAMA_PASSWORD_2) {
        console.log("⏭️  Skipping multiple user test (SUNSAMA_EMAIL_2 not set)");
        return;
      }

      const auth1 = createAuthHeader(SUNSAMA_EMAIL!, SUNSAMA_PASSWORD!);
      const auth2 = createAuthHeader(
        process.env.SUNSAMA_EMAIL_2,
        process.env.SUNSAMA_PASSWORD_2
      );

      const result1 = await mcpRequest("tools/call", {
        name: "get-user",
        arguments: {},
      }, auth1);

      const result2 = await mcpRequest("tools/call", {
        name: "get-user",
        arguments: {},
      }, auth2);

      expect(result1.error).toBeUndefined();
      expect(result2.error).toBeUndefined();

      const user1 = JSON.parse(result1.result.content[0].text);
      const user2 = JSON.parse(result2.result.content[0].text);

      // Should be different users
      expect(user1.email).not.toBe(user2.email);
    });
  });

  describe("Tool Execution", () => {
    const auth = createAuthHeader(SUNSAMA_EMAIL!, SUNSAMA_PASSWORD!);

    test("should execute get-user tool", async () => {
      const result = await mcpRequest("tools/call", {
        name: "get-user",
        arguments: {},
      }, auth);

      expect(result.error).toBeUndefined();
      expect(result.result.content).toBeArray();
      expect(result.result.content[0].type).toBe("text");

      const user = JSON.parse(result.result.content[0].text);
      expect(user).toHaveProperty("_id");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("profile");
      expect(user.email).toBe(SUNSAMA_EMAIL);
    });

    test("should execute get-streams tool", async () => {
      const result = await mcpRequest("tools/call", {
        name: "get-streams",
        arguments: {},
      }, auth);

      expect(result.error).toBeUndefined();
      expect(result.result.content).toBeArray();

      const response = result.result.content[0].text;
      // Response should be TSV format
      expect(response).toContain("\t"); // TSV uses tabs
    });

    test("should execute get-tasks-backlog tool", async () => {
      const result = await mcpRequest("tools/call", {
        name: "get-tasks-backlog",
        arguments: {},
      }, auth);

      expect(result.error).toBeUndefined();
      expect(result.result.content).toBeArray();

      const response = result.result.content[0].text;
      // Response should be TSV format
      expect(typeof response).toBe("string");
    });

    test("should execute get-tasks-by-day tool", async () => {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      const result = await mcpRequest("tools/call", {
        name: "get-tasks-by-day",
        arguments: {
          day: today,
          completionFilter: "all",
        },
      }, auth);

      expect(result.error).toBeUndefined();
      expect(result.result.content).toBeArray();

      const response = result.result.content[0].text;
      expect(typeof response).toBe("string");
    });

    test("should handle tool errors gracefully", async () => {
      const result = await mcpRequest("tools/call", {
        name: "get-task-by-id",
        arguments: {
          taskId: "non-existent-task-id-12345",
        },
      }, auth);

      // Should return an error or empty result, not crash
      expect(result).toBeDefined();
    });
  });

  describe("Concurrent Requests", () => {
    test("should handle multiple concurrent requests", async () => {
      const auth = createAuthHeader(SUNSAMA_EMAIL!, SUNSAMA_PASSWORD!);

      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        mcpRequest("tools/call", {
          name: "get-user",
          arguments: {},
        }, auth)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.error).toBeUndefined();
        expect(result.result).toBeDefined();
      });

      // All should return the same user
      const users = results.map((r) => JSON.parse(r.result.content[0].text));
      const firstUserId = users[0]._id;

      users.forEach((user) => {
        expect(user._id).toBe(firstUserId);
      });
    });

    test("should handle concurrent requests with different credentials", async () => {
      if (!process.env.SUNSAMA_EMAIL_2 || !process.env.SUNSAMA_PASSWORD_2) {
        console.log("⏭️  Skipping concurrent multi-user test");
        return;
      }

      const auth1 = createAuthHeader(SUNSAMA_EMAIL!, SUNSAMA_PASSWORD!);
      const auth2 = createAuthHeader(
        process.env.SUNSAMA_EMAIL_2,
        process.env.SUNSAMA_PASSWORD_2
      );

      // 5 requests for each user, interleaved
      const promises = Array.from({ length: 10 }, (_, i) =>
        mcpRequest("tools/call", {
          name: "get-user",
          arguments: {},
        }, i % 2 === 0 ? auth1 : auth2)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.error).toBeUndefined();
      });

      // Check that we got two different users
      const users = results.map((r) => JSON.parse(r.result.content[0].text));
      const uniqueEmails = new Set(users.map((u) => u.email));

      expect(uniqueEmails.size).toBe(2);
    });
  });

  describe("Error Recovery", () => {
    test("should recover from transient failures", async () => {
      const auth = createAuthHeader(SUNSAMA_EMAIL!, SUNSAMA_PASSWORD!);

      // Make a valid request
      const result1 = await mcpRequest("tools/call", {
        name: "get-user",
        arguments: {},
      }, auth);

      expect(result1.error).toBeUndefined();

      // Make an invalid request
      const result2 = await mcpRequest("tools/call", {
        name: "invalid-tool-name",
        arguments: {},
      }, auth);

      expect(result2.error).toBeDefined();

      // Make another valid request - should still work
      const result3 = await mcpRequest("tools/call", {
        name: "get-user",
        arguments: {},
      }, auth);

      expect(result3.error).toBeUndefined();
    });
  });
});

// Print helpful message if tests are skipped
if (!shouldRunIntegrationTests) {
  console.log("\n" + "⏭️".repeat(25));
  console.log("⏭️  Integration tests SKIPPED");
  console.log("⏭️");
  console.log("⏭️  To run integration tests:");
  console.log("⏭️  1. Set SUNSAMA_EMAIL and SUNSAMA_PASSWORD in .env");
  console.log("⏭️  2. Start server: TRANSPORT_MODE=http PORT=3099 bun dev");
  console.log("⏭️  3. Run tests: bun test:integration");
  console.log("⏭️");
  console.log("⏭️".repeat(25) + "\n");
}
