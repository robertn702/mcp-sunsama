import { describe, test, expect } from "bun:test";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

/**
 * Extracts all public instance method names from sunsama-api client .d.ts files.
 * Scans both base.d.ts and the methods/ subdirectory.
 * Skips private, protected, static, and abstract members.
 */
async function getSunsamaClientMethods(): Promise<Set<string>> {
  const clientDir = join(
    import.meta.dir,
    "../../../node_modules/sunsama-api/dist/types/client",
  );

  const methodsDir = join(clientDir, "methods");

  const methodFiles = (await readdir(methodsDir))
    .filter((f) => f.endsWith(".d.ts"))
    .map((f) => join(methodsDir, f));

  const allFiles = [join(clientDir, "base.d.ts"), ...methodFiles];

  const methods = new Set<string>();

  for (const file of allFiles) {
    const content = await readFile(file, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      // Skip comment lines (JSDoc, inline comments)
      const trimmed = line.trim();
      if (trimmed.startsWith("*") || trimmed.startsWith("//")) continue;

      // Skip private, protected, static, abstract, and constructor declarations
      if (
        trimmed.startsWith("private ") ||
        trimmed.startsWith("protected ") ||
        trimmed.startsWith("static ") ||
        trimmed.startsWith("abstract ") ||
        trimmed.startsWith("constructor")
      ) continue;

      // Match a public instance method: 4 spaces indent + camelCase name + (
      const match = line.match(/^    ([a-z][a-zA-Z]+)\(/);
      if (match) {
        methods.add(match[1]);
      }
    }
  }

  return methods;
}

/**
 * Extracts all SunsamaClient methods called in the MCP tool implementations
 * by scanning for `context.client.<methodName>` patterns.
 */
async function getWrappedMethods(): Promise<Set<string>> {
  const toolsDir = join(import.meta.dir, "../../../src/tools");

  const files = (await readdir(toolsDir)).filter(
    (f) => f.endsWith(".ts") && f !== "shared.ts" && f !== "index.ts",
  );

  const methods = new Set<string>();
  const callPattern = /context\.client\.([a-zA-Z]+)\(/g;

  for (const file of files) {
    const content = await readFile(join(toolsDir, file), "utf-8");
    let match;
    while ((match = callPattern.exec(content)) !== null) {
      methods.add(match[1]);
    }
  }

  return methods;
}

/**
 * Methods intentionally not exposed as MCP tools.
 * Add to this list with a comment explaining why.
 */
const INTENTIONALLY_EXCLUDED = new Set([
  "getConfig",            // Client configuration — not useful as a standalone tool
  "getSessionToken",      // Internal auth plumbing — session managed by the transport layer
  "isAuthenticated",      // Auth checked at the transport layer, not exposed to LLMs
  "login",                // Auth handled at startup (stdio) or per-request (HTTP)
  "logout",               // Lifecycle managed by the server transport
  "getUserTimezone",      // Used internally by tools (e.g. get-tasks-by-day) — not useful standalone
]);

describe("sunsama-api coverage", () => {
  test("all public SunsamaClient methods are wrapped as MCP tools or explicitly excluded", async () => {
    const clientMethods = await getSunsamaClientMethods();
    const wrappedMethods = await getWrappedMethods();

    const unwrapped = [...clientMethods].filter(
      (m) => !wrappedMethods.has(m) && !INTENTIONALLY_EXCLUDED.has(m),
    );

    if (unwrapped.length > 0) {
      console.error(
        "\nUnwrapped SunsamaClient methods (add a tool or add to INTENTIONALLY_EXCLUDED):\n" +
          unwrapped.map((m) => `  - ${m}`).join("\n"),
      );
    }

    expect(unwrapped).toEqual([]);
  });

  test("INTENTIONALLY_EXCLUDED list contains only real SunsamaClient methods", async () => {
    const clientMethods = await getSunsamaClientMethods();

    const stale = [...INTENTIONALLY_EXCLUDED].filter(
      (m) => !clientMethods.has(m),
    );

    if (stale.length > 0) {
      console.error(
        "\nStale entries in INTENTIONALLY_EXCLUDED (method no longer exists in sunsama-api):\n" +
          stale.map((m) => `  - ${m}`).join("\n"),
      );
    }

    expect(stale).toEqual([]);
  });
});
