---
"mcp-sunsama": patch
---

Eliminate any types in shared tool infrastructure. ToolConfig is now generic over the Zod schema so tool execute functions receive properly typed args. ToolContext.client is typed as SunsamaClient and session as unknown, removing the catch-all index signature.
