# Contributing to mcp-sunsama

Thank you for your interest in contributing to the Sunsama MCP Server! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/mcp-sunsama.git
   cd mcp-sunsama
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Sunsama credentials for testing
   ```

## Development Workflow

### Branch Naming Convention

Use the format `{type}/{short-name}` where `{type}` follows conventional commit naming:
- `feat/` - New features
- `fix/` - Bug fixes
- `chore/` - Maintenance tasks
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or fixes
- `ci/` - CI/CD changes

Example: `feat/add-task-labels`

### Making Changes

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes following the code style and conventions

3. Run tests and type checking:
   ```bash
   bun test
   bun run typecheck
   ```

4. Build the project to ensure it compiles:
   ```bash
   bun run build
   ```

5. Create a changeset for your changes (if needed):
   ```bash
   bun run changeset
   ```
   Follow the prompts to describe your changes.

   **When to create a changeset:**
   - ✅ New user-facing features or tools
   - ✅ Bug fixes that affect npm package users
   - ✅ API changes or breaking changes
   - ✅ Dependency updates that change behavior

   **When NOT to create a changeset:**
   - ❌ Infrastructure/deployment changes (CI/CD, Docker, Smithery config)
   - ❌ Internal refactoring with no behavior changes
   - ❌ Documentation updates
   - ❌ Development tooling changes

6. Commit your changes using conventional commit format:
   ```bash
   git add .
   git commit -m "feat: add support for task labels"
   ```

7. Push your branch and create a pull request

## Code Style and Conventions

### TypeScript Guidelines
- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use Zod schemas for all tool parameters and responses
- Follow the existing modular architecture patterns

### Architecture Patterns
- Tools should be organized by resource type (user, task, stream)
- Use the `createToolWrapper` utility for consistent error handling
- Apply response optimization (filtering and trimming) for large datasets
- Follow the dual transport pattern for stdio/httpStream compatibility

### Testing
- Write tests for new Zod schemas in `src/schemas.test.ts`
- Ensure all existing tests pass before submitting PR
- Test both stdio and httpStream transports when applicable

## Testing Your Changes

### Unit Tests
```bash
bun test                 # Run all tests
bun test:watch          # Run tests in watch mode
```

### Integration Testing
```bash
# Test with MCP Inspector
bun run inspect

# Test stdio transport directly
echo '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"1.0.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | bun src/main.ts

# Test compiled output
bun run build
node dist/main.js
```

### Testing with Raycast
1. Build the project: `bun run build`
2. Add to Raycast MCP configuration:
   ```json
   {
     "mcpServers": {
       "sunsama-dev": {
         "command": "node",
         "args": ["/path/to/your/mcp-sunsama/dist/main.js"],
         "env": {
           "SUNSAMA_EMAIL": "your-email",
           "SUNSAMA_PASSWORD": "your-password"
         }
       }
     }
   }
   ```
3. Test in Raycast using `@mcp` mentions

## For Maintainers

### Release Process

This project uses [changesets](https://github.com/changesets/changesets) for version management and npm releases.

#### Prerequisites
- npm authentication configured (`npm login`)
- Write access to the main branch
- All tests passing on main branch

#### Creating a Release

1. **Preparation**
   ```bash
   git checkout main
   git pull
   bun test              # Ensure all tests pass
   bun run typecheck     # Check for TypeScript errors
   bun run build         # Verify clean build
   ```

2. **Version Update**
   ```bash
   bun run version       # Apply changesets and update package.json
   ```

   **IMPORTANT**: After this command, manually update the version in `src/constants.ts` to match `package.json`:
   ```typescript
   export const VERSION = "X.Y.Z";  // <-- Update to match package.json
   ```

3. **Pre-Release Validation**
   ```bash
   bun run typecheck     # Ensure no TypeScript errors
   bun test             # Verify all tests pass
   bun run build        # Ensure clean build
   ```

4. **Commit Version Changes**
   ```bash
   git add .
   git commit -m "chore: release version $(cat package.json | grep '"version"' | cut -d'"' -f4)"
   ```
   Verify the commit includes:
   - `package.json` - version bump
   - `CHANGELOG.md` - generated changelog
   - Removed changeset files from `.changeset/`

5. **Publish to NPM**
   ```bash
   bun run release      # Builds and publishes to npm
   ```
   This command runs `bun run build && changeset publish`

6. **Push Changes**
   ```bash
   git push             # Push version commit
   git push --tags      # Push version tags
   ```

7. **Verify Release**
   - Check npm: https://www.npmjs.com/package/mcp-sunsama
   - Test installation: `npx mcp-sunsama@latest`
   - Verify GitHub release tag appears

#### Version Synchronization

**IMPORTANT**: When updating the version, you must update it in TWO places:
1. `package.json` - The npm package version
2. `src/constants.ts` - The `VERSION` constant

This ensures the MCP server reports the correct version to clients during the handshake.

#### Troubleshooting Releases

- **npm publish fails**: Check `npm whoami` and ensure you're logged in
- **Version conflict**: Run `npm view mcp-sunsama versions` to check existing versions
- **Build fails**: Fix TypeScript/build errors before attempting release
- **Changeset issues**: Ensure all changesets are committed before running `version`

### Dependency Updates

When updating dependencies, especially FastMCP:
1. Update the dependency: `bun add fastmcp@X.Y.Z`
2. Run full test suite: `bun test`
3. Test with MCP Inspector: `bun run inspect`
4. Test stdio transport functionality
5. Create a changeset describing the update

## Questions or Issues?

- Open an issue on [GitHub](https://github.com/robertn702/mcp-sunsama/issues)
- Check existing issues before creating a new one
- Provide reproduction steps for bugs
- Include your environment details (OS, Node version, Bun version)

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.