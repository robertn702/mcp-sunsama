---
"mcp-sunsama": patch
---

Fix HTTP transport returning 401 for all errors instead of only authentication failures. Non-auth errors (transport failures, unexpected exceptions) now correctly return 500.
