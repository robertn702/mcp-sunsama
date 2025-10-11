---
"mcp-sunsama": minor
---

Add HTTP transport support with session management and comprehensive test suite

- Implement HTTP Stream transport alongside existing stdio transport
- Add dual-layer session caching (client cache + session manager)
- Implement TTL-based session management with configurable timeouts
- Add comprehensive unit test suite (251 tests)
- Add integration test suite for authenticated flows
- Reorganize tests into standard __tests__ directory structure
- Add TypeScript types for better type safety in tests
