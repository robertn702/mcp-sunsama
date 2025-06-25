---
"mcp-sunsama": minor
---

feat: add update-task-due-date tool for setting and clearing task due dates

- Adds new `update-task-due-date` tool to set or clear task due dates using ISO datetime format or null
- Includes comprehensive parameter validation with Zod schema for taskId, dueDate, and limitResponsePayload
- Supports both setting due dates with ISO datetime strings and clearing due dates with null values
- Adds extensive test coverage with 11 test cases covering valid inputs, error cases, and edge conditions
- Updates API documentation and README with complete tool information
- Follows established patterns for dual transport support (stdio/httpStream) and response optimization