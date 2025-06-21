---
"mcp-sunsama": minor
---

Refactor update-task-notes schema to use XOR pattern for content parameters

- Replace nested content object with separate html and markdown parameters
- Implement XOR validation ensuring exactly one content type is provided
- Add comprehensive test coverage for the new schema pattern
- Update tool implementation to handle simplified parameter structure
- Update documentation across README.md, CLAUDE.md, and API docs