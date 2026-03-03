# Changelog

## 1.0.1 (2026-03-03)

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
