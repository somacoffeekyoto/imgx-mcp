# CLAUDE.md — imgx-mcp

## Overview

AI image generation and editing — CLI + MCP server. v1.1.1.

## Release flow

All steps in `RELEASING.md` are mandatory. The flow covers:
imgx-mcp (test → version update → build → publish) → app-division-ops docs → public distribution.

## Development commands

```bash
npm test                # Vitest — 54 tests (config 11 + history 37 + storage 6)
npm run bundle          # tsc + esbuild → dist/cli.bundle.js + dist/mcp.bundle.js
npm run build:skill-zip # Python script → dist/image-generation-skill.zip
```

## Architecture

CLI and MCP are two entry points sharing the same core:

```
CLI (argument parsing, output formatting)    MCP Server (tool definitions, stdio)
 ↓                                            ↓
Core
 ├─ Capability enum        ← model-independent feature definitions
 ├─ ImageProvider interface ← provider contract
 ├─ Provider Registry      ← registration and lookup
 ├─ Storage                ← file I/O (session ID directory support)
 └─ History                ← session management, undo/redo, history
 ↓
Provider (model-specific)
 ├─ Gemini  ← @google/genai
 └─ OpenAI  ← native fetch (no npm dependency)
```

Adding a new provider requires no changes to the CLI or MCP layers.

## Project configuration

- **`.imgxrc`** — Project-level defaults (output dir, provider, model, aspect ratio, resolution). Searched from CWD upward. Shareable via git (no API keys).
- **Project-scoped history** — When `.imgxrc` is detected, history is stored at `<project-root>/.imgx/output-history.json` (isolated per project).
- **Config resolution order** — CLI flags → environment variables → `.imgxrc` → user config → provider defaults.

## Version files (7 locations)

1. `package.json`
2. `server.json` (2 places)
3. `src/cli/index.ts`
4. `src/mcp/server.ts`
5. `.claude-plugin/plugin.json`
6. `.claude-plugin/marketplace.json`
7. `.cursor-plugin/plugin.json`

## Key directories

```
src/core/       # Shared business logic (config, history, storage, providers)
src/cli/        # CLI entry point and commands
src/mcp/        # MCP server entry point and tool definitions
src/providers/  # Provider implementations (gemini/, openai/)
skills/         # Claude Code Skill (SKILL.md + references)
dist/           # Built bundles + Skill ZIP (committed to git)
tests/          # Vitest test suites
```
