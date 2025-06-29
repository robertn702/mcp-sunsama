---
"mcp-sunsama": minor
---

feat: add update-task-stream tool for task stream/channel assignment

Add new `update-task-stream` tool that allows updating the stream/channel assignment for existing Sunsama tasks. This tool provides the ability to:

- Assign tasks to one or more streams/channels
- Clear stream assignments by providing an empty array
- Set a recommended stream ID for the task
- Control response payload size with limitResponsePayload option

The tool follows the established patterns for parameter validation, error handling, and response formatting. Includes comprehensive test coverage and updated documentation.