---
description: Upgrade sunsama-api and add missing MCP tools
model: claude-opus-4-6
allowed-tools: Bash(bun:*), Bash(npm:*), Bash(cat:*), Bash(ls:*), Read, Write, Edit, Glob, Grep
---

Upgrade the sunsama-api dependency to the latest version and ensure all new endpoints are wrapped as MCP tools.

## Steps

1. **Check current vs latest version**:
   ```bash
   cat package.json | grep sunsama-api
   npm view sunsama-api version
   ```
   - If already on latest, inform user and stop

2. **Upgrade the dependency**:
   ```bash
   bun add sunsama-api@latest
   ```

3. **Verify build passes**:
   ```bash
   bun run typecheck
   bun test
   ```
   - If either fails, stop and report the issue

4. **Analyze new API methods**:
   - Read `node_modules/sunsama-api/dist/types/client/index.d.ts` to find the method class hierarchy
   - Read each method class file to enumerate all public methods on `SunsamaClient`
   - Compare against existing tools in `src/tools/` to find unwrapped methods
   - Report: "Found X new methods not wrapped as MCP tools: [list]"

5. **For each unwrapped method**:
   - Read the method signature and JSDoc from the sunsama-api type definitions
   - Read the corresponding types from `node_modules/sunsama-api/dist/types/types/api.d.ts`
   - Add the appropriate Zod schema to `src/schemas.ts` following existing patterns
   - Add the tool implementation to the appropriate file in `src/tools/`:
     - User operations → `user-tools.ts`
     - Task operations → `task-tools.ts`
     - Stream operations → `stream-tools.ts`
     - Calendar operations → `calendar-tools.ts`
   - Update `src/tools/index.ts` if a new tools file was created

6. **Verify new tools work**:
   ```bash
   bun run typecheck
   bun test
   ```

7. **Create changeset**:
   - If only dependency bump (no new tools): patch changeset
   - If new tools added: minor changeset
   - Write changeset to `.changeset/` with descriptive summary

8. **Report summary**:
   - Previous version → new version
   - New methods found
   - Tools added (if any)
   - Changeset created

## Notes

- Follow existing patterns in `src/tools/` for tool structure
- Use `withTransportClient` wrapper for all tools
- Prefer `formatJsonResponse` for single objects, `formatTsvResponse` for arrays
- Don't use `as` type assertions — if needed, request schema exports from sunsama-api
- Run typecheck after each file modification to catch errors early
