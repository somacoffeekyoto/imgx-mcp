# Changelog

## 1.5.0 (2026-03-05)

### Added

- **User config `projectRoot`** — `imgx config set project-root /path/to/project` to set the project root in user config. Stored in `~/.config/imgx/config.json` or `%APPDATA%\imgx\config.json`. Applies to all MCP clients and CLI on this machine. Used as a fallback when auto-detection (MCP roots, `.imgxrc`) does not work.
- **CLI `project-root` config key** — `imgx config set project-root` and `imgx config get project-root`
- 3 new tests (total: 84 tests)

### Project root detection

Three ways to set the project root:

1. **Client env var** (per-client, highest priority) — `IMGX_PROJECT_ROOT` in the MCP client config (e.g. `claude_desktop_config.json`)
2. **Auto-detection** — MCP roots or `.imgxrc` upward search from CWD. Works on CLI and Claude Code. Does not work on Claude Desktop.
3. **imgx user config** (shared across all clients) — `imgx config set project-root /path/to/project`

## 1.4.1 (2026-03-04)

### Fixed

- **MCP roots detection race condition** — `listRoots()` was called immediately after `server.connect()`, before the MCP initialization handshake completed. The request failed silently, causing `setProjectRoot()` to never execute and images to save to the fallback `~/Pictures/imgx/` instead of `<project-root>/.imgx/`. Now uses `oninitialized` callback to wait for handshake completion and checks `roots` capability before requesting.

## 1.4.0 (2026-03-04)

### Added

- **Sequential file naming for edit chains** — `edit_last` now generates sequential filenames based on the origin file: `cover.png` → `cover-1.png` → `cover-2.png`. Default UUID-based names follow the same pattern: `imgx-a1b2c3d4.png` → `imgx-a1b2c3d4-1.png`
- **File deletion on undo + re-edit** — When editing after undo, spliced (abandoned) entries' files are deleted from disk, preventing orphaned images
- **Session base info tracking** — `Session` now stores `baseName`, `baseExt`, `baseDir` to maintain file identity across the edit chain
- **`getSessionChainNumber()` API** — returns the next sequential number for chained edits
- **`getSessionBaseInfo()` / `setSessionBaseInfo()` API** — read/write the origin file identity on the active session
- 15 new tests (total: 81 tests)

### Changed

- **`saveImage()` signature** — new optional `isChained` parameter for sequential naming (backward compatible, defaults to falsy)
- Legacy sessions without `baseName` fall back to UUID naming when `isChained` is true

## 1.3.0 (2026-03-04)

### Added

- **Session-based `clear_history`** — MCP `clear_history` tool accepts optional `session_id` parameter to clear a single session instead of all sessions
- **Managed path protection** — MCP `clear_history` with `delete_files` only deletes files inside managed directories (`.imgx/` or `~/Pictures/imgx/`); files saved to custom output paths are never deleted
- **`clearSession()` API** — new function to remove a single session from history
- **`isManagedPath()` API** — determines whether a file path is inside a managed directory
- **CLI `history clear <session-id>`** — clear a specific session from CLI (errors on `--all` + session ID combo)
- **Uninstall cleanup documentation** — README uninstall section now documents data that `npm uninstall` does not remove
- 7 new tests for `clearSession` and `isManagedPath` (total: 66 tests)

### Changed

- **`historyDir()` exported** — previously private, now available for managed path detection
- **MCP `clear_history` response** — now includes `skippedFiles` count for files outside managed directories

## 1.2.0 (2026-03-04)

### Added

- **MCP roots-based project detection** — MCP server now calls `listRoots()` after connection to get the client's workspace directory, making project-scoped history work without `.imgxrc` when used via Claude Code and other MCP clients
- **`setProjectRoot()` API** — allows MCP server (or other integrations) to set the project root programmatically
- **Project-scoped default output** — when a project root is detected, default output directory is `<project-root>/.imgx/` instead of `~/Pictures/imgx`
- 5 new tests for MCP root detection and project-scoped default output (total: 59 tests)

### Changed

- **Project root resolution priority** — `IMGX_PROJECT_ROOT` env var > MCP roots (`setProjectRoot`) > `.imgxrc` upward search (CLI fallback)
- **`fallbackOutputDir()`** — configured `outputDir` is now resolved via `resolveProjectPath()` for correct relative path handling
- **`resetProjectRootCache()`** — now also clears the MCP root value

## 1.1.1 (2026-03-04)

### Added

- **`CLAUDE.md`** — Project instructions for Claude Code (release flow reference, dev commands, architecture overview, project config)
- **`RELEASING.md` full rewrite** — 4-step checklist expanded to 11-step mandatory release flow covering test, version update, build, publish, MCP verification, app-division-ops docs, and public distribution

### Fixed

- **Plugin/registry version sync** — `server.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.cursor-plugin/plugin.json` were stuck at v1.0.4; now updated to match the actual release version

## 1.1.0 (2026-03-04)

### Added

- **Project-scoped history** — When `.imgxrc` exists, history is saved to `<project-root>/.imgx/output-history.json` instead of the global `%APPDATA%/imgx/` (or `~/.config/imgx/`). Each project gets its own independent edit history. Falls back to global when no `.imgxrc` is found
- **`findProjectRoot()`** — Walks up from CWD to find `.imgxrc`, with `IMGX_PROJECT_ROOT` env var override and result caching
- **`resolveProjectPath()`** — Resolves relative paths against the project root (or CWD if no project)
- **`clearGlobalHistory()`** — Explicitly clears the global history store, separate from project history
- **CLI `history clear --all`** — Clears both project and global history with mandatory interactive confirmation (cannot be skipped with `--yes`)
- 17 new tests for project root detection, project-scoped history, and path resolution (total: 54 tests)

### Changed

- **`clear_history` (MCP)** now scopes to the current project automatically
- **Relative path resolution** — `saveImage()`, `readImageAsBase64()`, `fallbackOutputDir()`, and OpenAI `edit()` now resolve relative paths against the project root instead of the MCP server's CWD
- **`loadProjectConfig()`** uses `findProjectRoot()` to locate `.imgxrc` from ancestor directories, not just CWD

## 1.0.4 (2026-03-03)

### Added

- **Skill ZIP for Claude Desktop** — `dist/image-generation-skill.zip` for uploading via Settings > Profile > Customize > Skills. Included in npm package under `dist/`
- **`build:skill-zip` npm script** — `python scripts/build-skill-zip.py` generates the ZIP with forward-slash paths and ZIP_DEFLATED compression

## 1.0.3 (2026-03-03)

### Fixed

- **`clear_history` directory removal** — `rmSync()` does not remove directories; replaced with `rmdirSync()` in both MCP server and CLI to correctly remove empty session directories after file deletion

## 1.0.2 (2026-03-03)

### Fixed

- **v1.0.1 published with stale bundles** — `npm run bundle` (esbuild) was not run before `npm publish`, so v1.0.1 contained old `dist/mcp.bundle.js`. v1.0.2 is the correct release with session outputDir inheritance fix

## 1.0.1 (2026-03-03) [YANKED — published with stale bundles]

### Fixed

- **`edit_last` now inherits session `output_dir`** — When `generate_image` specifies `output_dir`, subsequent `edit_last` calls without explicit `output_dir` now output to the same directory. Previously, `edit_last` always fell back to the default (`~/Pictures/imgx`), causing session images to scatter across two locations
- **`clear_history` now removes empty session directories** — MCP `clear_history` with `delete_files: true` now removes empty `s-XXXXXXXX/` directories after deleting image files, matching CLI `history clear` behavior

### Added

- `outputDir` field on `Session` type — stores the output directory used when creating a session
- `getActiveSessionOutputDir()` export — returns the active session's output directory for fallback resolution
- 6 new tests for session `outputDir` storage and `getActiveSessionOutputDir()` behavior (total: 37 tests)

## 1.0.0 (2026-03-03)

### Added

- **Session-based undo/redo** — N-step undo and redo within editing sessions. Each `generate` starts a new session; `edit --last` appends to the active session. Up to 10 entries per session with root protection
- **Edit history** — Full session history with metadata (prompt, provider, model, operation, timestamps). View with `imgx history` or `edit_history` MCP tool
- **Session management** — Switch between sessions (`imgx history switch <id>` / `switch_session`), clear history with optional file deletion (`imgx history clear` / `clear_history`)
- **Session directories** — Image output organized by session ID under the output directory (`~/Pictures/imgx/<session-id>/`)
- **Output directory migration** — `imgx config set output-dir` now offers to move existing files and updates all history paths
- **6 new MCP tools** — `undo_edit`, `redo_edit`, `edit_history`, `switch_session`, `clear_history`, `set_output_dir`
- **3 new CLI commands** — `imgx undo`, `imgx redo`, `imgx history` (with `switch` and `clear` subcommands)
- **Test framework** — Vitest introduced with 31 tests covering history and storage modules

### Changed

- `saveLastOutput` / `loadLastOutput` replaced by session-based `pushHistory` / `getActiveEntry`
- `last-output.json` replaced by `output-history.json` (no backward compatibility)
- `edit -i <image>` now creates a new session (external image starts a new chain)
- `edit --last` / `edit_last` appends to the active session at cursor position

### Removed

- `last-output.json` — replaced by `output-history.json`
- `saveLastOutput()` / `loadLastOutput()` functions from config module

## 0.9.1 (2026-03-02)

### Added

- **Skill included in npm package** — `skills/image-generation/SKILL.md` and `references/providers.md` now ship with the npm package, making it easier to install the Claude Code skill

### Changed

- README restructured: Skill section moved after Quick Start, Plugin section moved to bottom
- Skill install instructions added (npm copy, curl from GitHub, manual placement)
- SKILL.md: added missing MCP parameters (`output_format`, `output_dir`, `model`, `provider` on edit tools)
- SKILL.md: CLI fallback updated from plugin path to `npx imgx-mcp`
- providers.md: OpenAI `OUTPUT_FORMAT` corrected from CLI-only to MCP `output_format` parameter
- npm keywords: added `skill`, `claude-code`

## 0.9.0 (2026-02-28)

### Changed

- **Renamed from `imgx-cli` to `imgx-mcp`** — reflects primary value as an MCP server for AI coding agents (Claude Code, Codex CLI, Cursor, etc.). CLI command remains `imgx`. npm package is now `imgx-mcp`.
- Updated tagline: "AI image generation and editing for Claude Code, Codex CLI, and MCP-compatible AI agents"
- All plugin manifests, registry entries, and documentation updated to `imgx-mcp`

### Migration

- `npm install -g imgx-mcp` (replaces `imgx-cli`)
- MCP config: `--package=imgx-mcp` (replaces `--package=imgx-cli`)
- Claude Code plugin: `somacoffeekyoto/imgx-mcp` (replaces `somacoffeekyoto/imgx-cli`)
- GitHub repo: `somacoffeekyoto/imgx-mcp` (auto-redirect from old URL)

## 0.8.1 (2026-02-27)

### Changed

- Remove MCP inline preview size guard — always include base64 image data in MCP responses regardless of size. MCP clients that support `type: "image"` content (e.g. Claude Desktop) will display inline; others will use the file path from the text content. Gemini-generated images (~900KB raw, ~1.2MB base64) exceed Claude Desktop's 1MB limit but the file path fallback ensures usability.

## 0.8.0 (2026-02-27)

### Fixed

- **MCP inline preview size guard** — images exceeding ~780KB base64 (Claude Desktop's 1MB tool result limit) are now gracefully skipped from inline preview. Full-quality images are always saved to disk. Previously, oversized images caused silent display failures in Claude Desktop.

## 0.7.1 (2026-02-27)

### Fixed

- Remove `MULTIPLE_OUTPUTS` capability from Gemini provider — `gemini-3-pro-image-preview` does not support `candidateCount`, causing errors when `count > 1`

## 0.7.0 (2026-02-27)

### Added

- **Output format selection** — `--format` flag (CLI) and `output_format` parameter (MCP) to choose between `png`, `jpeg`, or `webp` output. Currently supported by OpenAI provider (`gpt-image-1`). Gemini provider outputs PNG regardless of format setting.
- `OUTPUT_FORMAT` capability added to provider capability system

## 0.6.2 (2026-02-27)

### Added

- **Image preview in MCP responses** — MCP tool results now include inline image data (base64) alongside file paths. Claude Desktop and other MCP clients can display generated/edited images directly without opening files manually.

## 0.6.1 (2026-02-27)

### Fixed

- Default output directory changed from process cwd to `~/Pictures/imgx` — fixes images being saved to AppData when used via MCP (Claude Desktop, etc.)

## 0.6.0 (2026-02-27)

### Added

- **OpenAI provider** — `gpt-image-1` model with generate and edit support
  - Native `fetch` implementation (no `openai` npm dependency)
  - Aspect ratio mapping to OpenAI size strings, resolution mapping to quality parameter
  - Manual multipart/form-data construction for Node 18 compatibility
- `OPENAI_API_KEY` environment variable support
- `--provider` flag for `imgx config set api-key` — manage API keys per provider
  - `imgx config set api-key <key> --provider openai`
  - `imgx config list` now shows all configured provider keys

### Changed

- CLI and MCP server now initialize both Gemini and OpenAI providers at startup
- `imgx providers` and error messages updated for multi-provider context
- Help text updated with OpenAI provider info and env var

## 0.5.2 (2026-02-26)

### Fixed

- `imgx-mcp` bin: added missing shebang (`#!/usr/bin/env node`) — fixes `npx imgx-mcp` and Claude Desktop MCP integration on all platforms

### Changed

- README: add Claude Desktop MCP configuration (Windows `cmd /c` + macOS/Linux)
- README: switch all MCP config examples from local `node` path to `npx`
- README: replace "Version updates" with full release checklist (version bump → build → publish → verify)

## 0.5.1 (2026-02-26)

### Added

- Published to npm (`npm install -g imgx-cli` / `npx imgx`)
- `mcpName` field for MCP Registry integration
- `server.json` for MCP Registry publishing

### Changed

- README: added Claude Desktop MCP configuration section with output directory note
- README: added Google AI Studio link for API key setup, MCP env section note

## 0.5.0 (2026-02-26)

### Added

- `edit_last` MCP tool — edit the last generated/edited image via MCP without specifying input path
- `imgx init` command — create `.imgxrc` project config template in current directory
- MCP server now tracks last output (shared with CLI `--last` flag)

## 0.4.0 (2026-02-26)

### Added

- `--last` (`-l`) flag for `edit` command — use the previous output as input automatically
  - Works with both `generate` and `edit` outputs
  - Enables iterative editing without manually specifying file paths
- `.imgxrc` project config — place in project directory for project-level defaults
  - Supports `defaults.model`, `defaults.outputDir`, `defaults.aspectRatio`, `defaults.resolution`, `defaults.provider`
  - Shared via Git (no API keys — use `imgx config set api-key` or env vars)

### Changed

- Settings resolution expanded to 5 layers: CLI flags → env vars → `.imgxrc` → user config → provider defaults

## 0.3.0 (2026-02-26)

### Added

- `imgx config` command — manage API keys and default settings via config file
  - `config set api-key <key>` — save Gemini API key (no more manual environment variable setup)
  - `config set model|provider|output-dir|aspect-ratio|resolution <value>` — set defaults
  - `config list` — show all settings
  - `config get <key>` — show a specific setting (API key is masked)
  - `config path` — show config file location
- Config file at `~/.config/imgx/config.json` (Linux/macOS) or `%APPDATA%\imgx\config.json` (Windows)
- Settings resolution: CLI flags → environment variables → config file → provider defaults
- Uninstall instructions in README (plugin, npm, MCP, config cleanup)

### Changed

- API key resolution: environment variable → config file (env var still takes precedence)
- Default model, provider, output-dir, aspect-ratio, resolution are now configurable via `imgx config set`

## 0.2.0 (2026-02-26)

### Added

- MCP server (`dist/mcp.bundle.js`) — exposes `generate_image`, `edit_image`, `list_providers` tools via Model Context Protocol stdio transport
- Works with Gemini CLI, Codex CLI, Antigravity, Cursor, Windsurf, Continue.dev, Cline, Zed, and any MCP-compatible tool
- `.mcp.json` updated with actual server config for Claude Code plugin auto-registration
- `imgx-mcp` bin command for direct MCP server execution

## 0.1.0 (2026-02-26)

Initial release.

### Features

- `generate` command: text-to-image generation
- `edit` command: image editing with text instructions
- `providers` command: list available providers
- `capabilities` command: show provider capabilities
- Gemini provider with 6 capabilities (generate, edit, aspect ratio, resolution, reference images, person control)
- Capability-based provider abstraction (model-independent core + model-dependent providers)
- JSON output for scripting and tool integration
- Single-file esbuild bundle

### Distribution

- Claude Code plugin: `somacoffeekyoto/imgx-cli` marketplace with `image-generation` skill
- npm package name reserved: `imgx-cli` (publish pending)
