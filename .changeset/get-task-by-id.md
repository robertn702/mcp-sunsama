---
"mcp-sunsama": minor
---

Add get-task-by-id tool for retrieving specific tasks by their unique identifier

- Add `get-task-by-id` MCP tool that retrieves a specific task by its ID
- Add `getTaskByIdSchema` with taskId parameter validation
- Return complete task object if found, null if not found
- Follow standard tool patterns for authentication, error handling, and logging
- Update documentation in README.md and CLAUDE.md
- Maintain consistent JSON response format for single object retrieval