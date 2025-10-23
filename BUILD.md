# Build Pipeline Documentation

This document describes the build pipeline and distribution setup for the Vertex AI MCP Server.

## Overview

The project is configured to support multiple installation methods, with a focus on ease of use via `npx` directly from GitHub.

## Installation Methods

### 1. NPX from GitHub (Recommended)

Users can run the server directly from GitHub without cloning or installing:

```bash
npx -y github:mnthe/vertex-mcp-server
```

This method:
- ✅ Always uses the latest version from the repository
- ✅ No installation required
- ✅ No local storage needed
- ✅ Automatic dependency resolution

### 2. Global Installation (Future - when published to npm)

```bash
npm install -g vertex-mcp-server
vertex-mcp-server
```

### 3. Local Development

```bash
git clone https://github.com/mnthe/vertex-mcp-server.git
cd vertex-mcp-server
npm install
npm run build
node build/index.js
```

## Build Configuration

### package.json Configuration

**Key Fields:**
- `"type": "module"` - Uses ES modules
- `"main": "./build/index.js"` - Entry point
- `"bin": { "vertex-mcp-server": "./build/index.js" }` - CLI executable
- `"files": ["build", "README.md", "LICENSE", ".env.example"]` - Included in package

**Scripts:**
- `build` - Compiles TypeScript to JavaScript
- `prepare` - Runs automatically on `npm install` (builds the project)
- `prepublishOnly` - Runs before publishing to npm (ensures fresh build)
- `watch` - Development mode with auto-rebuild
- `dev` - Run TypeScript directly with tsx
- `start` - Run the built JavaScript
- `clean` - Remove build directory

### TypeScript Configuration

**tsconfig.json:**
- Target: ES2022
- Module: Node16 (ESM with .js extensions)
- Output: `./build` directory
- Source maps enabled for debugging
- Type declarations generated

### Build Output

The build process creates:
```
build/
├── index.js (entry point with shebang)
├── index.d.ts (TypeScript definitions)
├── *.js.map (source maps)
├── agents/ (compiled agent logic)
├── config/ (compiled configuration)
├── handlers/ (compiled tool handlers)
├── managers/ (compiled state managers)
├── schemas/ (compiled validation)
├── server/ (compiled MCP server)
├── services/ (compiled Vertex AI service)
└── types/ (compiled type definitions)
```

**Total size:** ~104 KB unpacked, ~28 KB packaged

## Continuous Integration

### Build Workflow (.github/workflows/build.yml)

**Triggers:**
- Push to main, develop, or copilot/** branches
- Pull requests to main or develop

**Matrix Testing:**
- Node.js versions: 18.x, 20.x, 22.x
- Verifies build on multiple Node versions

**Steps:**
1. Checkout code
2. Setup Node.js with caching
3. Install dependencies with `npm ci`
4. Build with `npm run build`
5. Verify build artifacts exist and are executable
6. Test package structure with `npm pack --dry-run`
7. Upload build artifacts (Node 20.x only)

### Release Workflow (.github/workflows/release.yml)

**Triggers:**
- Push of version tags (v*.*.*)

**Steps:**
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies
4. Build project
5. Create package tarball with `npm pack`
6. Create GitHub release with:
   - Package tarball attached
   - Auto-generated release notes
   - Semantic version from tag

## Version Management

### Creating a Release

1. Update version in package.json:
   ```bash
   npm version patch|minor|major
   ```

2. Push tags:
   ```bash
   git push origin main --tags
   ```

3. GitHub Actions automatically:
   - Builds the project
   - Creates package tarball
   - Creates GitHub release
   - Attaches tarball to release

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Git Configuration

### .gitignore

The build directory is **committed to the repository** to support `npx` usage directly from GitHub.

```gitignore
# Build output (committed for npx support)
# build/
```

This is intentionally different from typical Node.js projects where build output is gitignored. Committing the build output allows:
- Direct execution via `npx github:mnthe/vertex-mcp-server`
- No build step required for users
- Faster installation time

### Files Included in Package

When published to npm, the package includes:
- `build/` - All compiled JavaScript
- `README.md` - Documentation
- `LICENSE` - License information
- `.env.example` - Configuration template

Source files (`src/`) are not included in the npm package to reduce size.

## Local Development Workflow

### Initial Setup
```bash
npm install
npm run build
```

### Development with Auto-Rebuild
```bash
npm run watch
```

### Development with Hot Reload
```bash
npm run dev
```

### Testing the Build
```bash
npm run build
node build/index.js
```

### Package Testing
```bash
npm pack --dry-run  # See what would be packaged
npm pack            # Create actual tarball
```

### Clean Build
```bash
npm run clean
npm run build
```

## Troubleshooting

### Build Fails

**Issue:** TypeScript compilation errors
```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### npx Fails to Run

**Issue:** `npx github:mnthe/vertex-mcp-server` doesn't work

**Possible causes:**
1. Build directory not committed to repository
   - Solution: Ensure `build/` is in git
2. Dependencies not installed
   - Solution: Check package.json has all dependencies
3. Shebang missing from entry point
   - Solution: Verify `#!/usr/bin/env node` in build/index.js

### Build Output Missing

**Issue:** `build/` directory empty or missing files

```bash
# Check TypeScript configuration
cat tsconfig.json

# Clean and rebuild
npm run clean
npm run build

# Verify output
ls -la build/
```

## Security Considerations

### Dependency Management

- All dependencies are checked via GitHub Advisory Database
- `npm audit` run in CI/CD pipeline
- CodeQL security scanning enabled
- No credentials or secrets in code

### Build Artifacts

- Build output is committed but sanitized
- No environment variables or secrets in build
- Source maps included for debugging
- Type definitions for IDE support

## Performance

### Build Times

- Initial build: ~3-5 seconds
- Incremental rebuild: ~1-2 seconds
- CI/CD build: ~30-45 seconds (includes install)

### Package Size

- Unpacked: 104 KB
- Tarball: 28 KB
- Dependencies: ~50 MB (not included in package)
- Total install: ~50 MB

## Future Improvements

### Planned Enhancements

1. **Automated Testing**
   - Unit tests for all modules
   - Integration tests for MCP protocol
   - End-to-end tests with Vertex AI

2. **Code Quality**
   - ESLint configuration
   - Prettier formatting
   - Pre-commit hooks

3. **Documentation**
   - API documentation generation
   - Interactive examples
   - Video tutorials

4. **Distribution**
   - Publish to npm registry
   - Docker container support
   - Pre-built binaries with pkg

5. **Monitoring**
   - Build metrics tracking
   - Bundle size monitoring
   - Performance benchmarks

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [npm Documentation](https://docs.npmjs.com/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
