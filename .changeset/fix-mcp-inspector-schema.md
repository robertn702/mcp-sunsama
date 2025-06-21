---
"mcp-sunsama": patch
---

Fix MCP Inspector compatibility for update-task-notes schema

- Replace ZodIntersection (.and()) with single z.object() using .refine() for XOR validation
- Ensure schema generates proper JSON Schema with "type": "object" for MCP Inspector
- Add clear parameter descriptions indicating mutual exclusivity
- Maintain same validation behavior while fixing compatibility issues
- Update documentation to reflect schema architecture improvements