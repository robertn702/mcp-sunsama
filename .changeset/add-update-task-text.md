---
"mcp-sunsama": minor
---

Add update-task-text tool for updating task titles/text

Implement new `update-task-text` MCP tool that allows updating the text/title of tasks using the Sunsama API. This tool follows the established patterns for task mutation operations and includes:

- Zod schema validation with comprehensive parameter documentation
- Support for optional recommended stream ID and response payload limiting
- Full test coverage with edge case validation
- Updated API documentation and README