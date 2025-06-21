---
"mcp-sunsama": minor
---

Add update-task-notes tool for updating task notes content

- New `update-task-notes` tool supports updating task notes with HTML or Markdown content
- Accepts either `{html: string}` or `{markdown: string}` content format (mutually exclusive)
- Includes optional `limitResponsePayload` parameter for response optimization
- Integrates with Sunsama's collaborative editing system for proper synchronization
- Follows established patterns for tool implementation and error handling
- Updates API documentation, README, and CLAUDE.md with new tool information