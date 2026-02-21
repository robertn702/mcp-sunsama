---
"mcp-sunsama": patch
---

Fix HTTP transport tools always falling through to stdio client. The MCP SDK provides `sessionId` as a string on the `extra` object, not a nested `session` object. `client-resolver` now checks `extra.sessionId` to look up the per-request authenticated client in `SessionManager`.
