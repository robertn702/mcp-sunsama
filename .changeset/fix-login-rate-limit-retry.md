---
"mcp-sunsama": patch
---

Add retry with exponential backoff for 429 rate limit errors during login. Both stdio startup auth and HTTP per-request auth now retry up to 3 times (delays: 1s, 5s, 15s) when `SunsamaAuthError` contains "429". Non-429 errors are rethrown immediately.
