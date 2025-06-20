---
"mcp-sunsama": minor
---

Add get-archived-tasks tool with enhanced pagination

- Implement get-archived-tasks tool to access archived task history
- Add smart pagination with limit+1 pattern to determine if more results exist
- Include pagination metadata (hasMore flag, nextOffset, count) for LLM context
- Default limit set to 100 for optimal performance
- Response format includes TSV data with pagination header
- Update documentation in README.md and CLAUDE.md