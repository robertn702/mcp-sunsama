---
"mcp-sunsama": patch
---

Fix update-task-notes tool failing with MCP error -32603. Removed Zod `.refine()` from schema which was causing MCP SDK to fail parsing the tool parameters. XOR validation between html/markdown is now handled at runtime.

