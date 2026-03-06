# imgx-mcp

AI image generation and editing MCP server. Works with Claude Code, Gemini CLI, Cursor, Windsurf, and any MCP-compatible tool.

Generate images from text, edit existing images with text instructions, iterate on results — all from your AI coding environment.

## Quick start

Add to your tool's MCP config (`.mcp.json`, `settings.json`, etc.):

```json
{
  "mcpServers": {
    "imgx": {
      "command": "npx",
      "args": ["--package=imgx-mcp", "-y", "imgx-mcp"],
      "env": { "GEMINI_API_KEY": "your-key" }
    }
  }
}
```

That's it. Your AI agent can now generate and edit images.

> **Windows**: Replace `"command": "npx"` with `"command": "cmd"` and prepend `"/c"` to the args array.

## Skill (Claude Code)

For Claude Code users, imgx-mcp includes an `image-generation` skill — a guided prompt that teaches Claude how to use the MCP tools effectively. With the skill installed, type `/image-generation` to start a guided workflow.

### Install the skill

Copy the skill directory from the npm package or GitHub repository to your project:

```bash
# From npm (after npx has cached the package)
cp -r $(npm root -g)/imgx-mcp/skills .claude/skills

# Or from the GitHub repository
curl -sL https://raw.githubusercontent.com/somacoffeekyoto/imgx-mcp/main/skills/image-generation/SKILL.md \
  -o .claude/skills/image-generation/SKILL.md --create-dirs
curl -sL https://raw.githubusercontent.com/somacoffeekyoto/imgx-mcp/main/skills/image-generation/references/providers.md \
  -o .claude/skills/image-generation/references/providers.md --create-dirs
```

Or place skill files manually:

```
your-project/
  .mcp.json                              ← MCP server config (Quick start above)
  .claude/
    skills/
      image-generation/
        SKILL.md                         ← skill prompt
        references/
          providers.md                   ← provider reference
```

The skill files are included in the [npm package](https://www.npmjs.com/package/imgx-mcp) under `skills/` and in the [GitHub repository](https://github.com/somacoffeekyoto/imgx-mcp/tree/main/skills/image-generation).

> **Personal skill** (all projects): Place in `~/.claude/skills/image-generation/` instead of `.claude/skills/`.

### Claude Desktop

Claude Desktop supports skills via ZIP upload:

1. Download [`image-generation-skill.zip`](dist/image-generation-skill.zip) from the repository (or find it in the [npm package](https://www.npmjs.com/package/imgx-mcp) under `dist/`)
2. In Claude Desktop: **Settings > Profile > Customize > Skills > Add Skill**
3. Upload the ZIP

> Update the skill by re-downloading and re-uploading the ZIP after new releases.

### What the skill does

The skill guides Claude Code through image workflows: blog covers, iterative editing, provider comparison, icon generation. It knows the MCP tool parameters and best practices, so you get better results with less effort.

### MCP server vs Skill

| | MCP server | Skill |
|---|---|---|
| What it does | Exposes image tools to AI agents | Guided prompt for using the tools |
| Works with | Any MCP-compatible tool | Claude Code, Claude Desktop |
| Install | Add to `.mcp.json` | Copy skill files to project |
| Team sharing | Commit `.mcp.json` to repo | Commit `.claude/skills/` to repo |

**Recommended**: Set up the MCP server (Quick start) + install the skill if you use Claude Code.

## MCP tools

| Tool | Description |
|------|-------------|
| `generate_image` | Generate an image from a text prompt |
| `edit_image` | Edit an existing image with text instructions |
| `edit_last` | Edit the last generated/edited image (no input path needed) |
| `undo_edit` | Undo the last edit, reverting to the previous image in the session |
| `redo_edit` | Redo a previously undone edit |
| `edit_history` | Show all sessions and their edit history with metadata |
| `switch_session` | Switch to a different editing session |
| `clear_history` | Clear project history (optionally delete image files) |
| `set_output_dir` | Change the default output directory (optionally move existing files) |
| `list_providers` | List available providers and capabilities |

The `.imgx/` directory holds both edit history and default image output. Its location depends on project root detection:

| Project root | `.imgx/` location | History |
|---|---|---|
| Detected | `<project-root>/.imgx/` | `<project-root>/.imgx/output-history.json` |
| Not detected | `~/Pictures/imgx/` (images only) | `~/.config/imgx/output-history.json` (global) |

All clients that resolve to the same project root share the same history. Each session gets its own subdirectory. File paths are returned in the response. Inline image preview is included in MCP responses (base64).

### Iterative editing

The `edit_last` tool uses the output of the previous `generate_image` or `edit_image` call as input. This enables a conversational workflow:

```
"Generate a coffee shop interior" → generate_image
"Make the lighting warmer"        → edit_last
"Add a person reading a book"     → edit_last
```

No need to specify file paths between steps.

### Session management

Each `generate_image` call starts a new session. Subsequent `edit_last` calls are added to the same session, forming an edit chain. Each session has its own output directory.

**Undo / Redo** — Step backward and forward through the edit chain:

```
generate → edit_last → edit_last → edit_last
                                    ↑ current
                       ← undo_edit
                       ↑ current
                            redo_edit →
                                    ↑ current
```

After undo, calling `edit_last` branches from the current position (abandoned entries and their files are deleted from disk).

**File naming** — `edit_last` generates sequential filenames based on the origin file:

```
generate_image             → cover.png
edit_last                  → cover-1.png
edit_last                  → cover-2.png

generate_image (no output) → imgx-a1b2c3d4.png
edit_last                  → imgx-a1b2c3d4-1.png
```

**Session switching** — Use `edit_history` to see all sessions, then `switch_session` to resume a previous session. The `edit_last` tool will use the current position in the switched session.

**Output directory** — `edit_last` inherits the output directory from the session. If `generate_image` was called with `output_dir`, all subsequent `edit_last` calls in that session output to the same directory. The `output_dir` path is recorded as session metadata in `output-history.json`. This only affects where image files are saved — history always stays in `.imgx/` (or the global config directory).

## API key setup

Set up at least one provider:

**Gemini** — get a key from [Google AI Studio](https://aistudio.google.com/apikey) (free tier available):

```bash
imgx config set api-key YOUR_GEMINI_API_KEY --provider gemini
```

**OpenAI** — get a key from [OpenAI Platform](https://platform.openai.com/api-keys):

```bash
imgx config set api-key YOUR_OPENAI_API_KEY --provider openai
```

Keys are stored in `~/.config/imgx/config.json` (Linux/macOS) or `%APPDATA%\imgx\config.json` (Windows). Alternatively, pass keys via the `env` section in your MCP config, or set environment variables:

```bash
export GEMINI_API_KEY="your-api-key"
export OPENAI_API_KEY="your-api-key"
```

Only include the API keys for providers you want to use. At least one is required.

## MCP configuration by tool

### Claude Code

`.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "imgx": {
      "command": "npx",
      "args": ["--package=imgx-mcp", "-y", "imgx-mcp"],
      "env": { "GEMINI_API_KEY": "your-key", "OPENAI_API_KEY": "your-key" }
    }
  }
}
```

### Gemini CLI

`~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "imgx": {
      "command": "npx",
      "args": ["--package=imgx-mcp", "-y", "imgx-mcp"],
      "env": { "GEMINI_API_KEY": "your-key", "OPENAI_API_KEY": "your-key" }
    }
  }
}
```

### Claude Desktop

`claude_desktop_config.json`:

macOS / Linux:

```json
{
  "mcpServers": {
    "imgx": {
      "command": "npx",
      "args": ["--package=imgx-mcp", "-y", "imgx-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-key",
        "OPENAI_API_KEY": "your-key",
        "IMGX_PROJECT_ROOT": ""
      }
    }
  }
}
```

Windows:

```json
{
  "mcpServers": {
    "imgx": {
      "command": "cmd",
      "args": ["/c", "npx", "--package=imgx-mcp", "-y", "imgx-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-key",
        "OPENAI_API_KEY": "your-key",
        "IMGX_PROJECT_ROOT": ""
      }
    }
  }
}
```

`IMGX_PROJECT_ROOT` — Set to your project path to save images inside the project (e.g. `"C:\\Users\\you\\my-project"`). Leave empty to use the global default (`~/Pictures/imgx`).

Config file location: `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS). After editing, restart Claude Desktop.

> **Note:** Claude Desktop does not support auto-detection (MCP roots / CWD-based `.imgxrc` search). Use `IMGX_PROJECT_ROOT` in the config above (per-client), or run `imgx config set project-root /path/to/project` (shared across all clients).

### Codex CLI

`.codex/config.toml`:

```toml
[mcp_servers.imgx]
command = "npx"
args = ["--package=imgx-mcp", "-y", "imgx-mcp"]
env = { GEMINI_API_KEY = "your-key", OPENAI_API_KEY = "your-key" }
```

### Other tools

The same `npx` pattern works with Cursor, Windsurf, Continue.dev, Cline, Zed, and other MCP-compatible tools. On Windows, use `cmd /c npx` instead of `npx` directly.

## Providers

| Provider | Models | Capabilities |
|----------|--------|-------------|
| Gemini | `gemini-3-pro-image-preview` (Nano Banana Pro), `gemini-3.1-flash-image-preview` (Nano Banana 2) | Generate, edit, aspect ratio (14 ratios), resolution (1K/2K/4K), reference images, person control |
| OpenAI | `gpt-image-1` | Generate, edit, aspect ratio, multi-output, output format (PNG/JPEG/WebP) |

## Architecture

imgx separates **model-independent** and **model-dependent** concerns:

```
MCP server (tool definitions, stdio transport)    CLI (argument parsing, output formatting)
 ↓                                                 ↓
Core (Capability enum, ImageProvider interface, provider registry, file I/O, history)
 ↓
Provider (model-specific API calls, capability declarations)
```

MCP server and CLI are two entry points into the same core. Both call the same provider functions.

Each provider declares its supported capabilities. Adding a new provider means implementing the `ImageProvider` interface and registering it — no changes to the MCP or CLI layer.

### Capability system

| Capability | Description |
|------------|-------------|
| `TEXT_TO_IMAGE` | Generate images from text prompts |
| `IMAGE_EDITING` | Edit images with text instructions |
| `ASPECT_RATIO` | Control output aspect ratio |
| `RESOLUTION_CONTROL` | Control output resolution |
| `MULTIPLE_OUTPUTS` | Generate multiple images per request |
| `REFERENCE_IMAGES` | Use reference images for guidance |
| `PERSON_CONTROL` | Control person generation in output |
| `OUTPUT_FORMAT` | Choose output format (PNG, JPEG, WebP) |

## CLI

imgx-mcp also works as a standalone command-line tool.

### Install

```bash
npm install -g imgx-mcp
```

Requires Node.js 18+.

### Usage

```bash
# Generate
imgx generate -p "A coffee cup on a wooden table, morning light" -o output.png

# Edit
imgx edit -i photo.png -p "Change the background to sunset" -o edited.png

# Iterative editing
imgx edit -i photo.png -p "Make the background darker"
imgx edit --last -p "Add warm lighting"
imgx edit --last -p "Crop to 16:9" -o final.png

# Undo / redo
imgx undo               # Revert to previous image in session
imgx redo               # Re-apply an undone edit

# History
imgx history            # Show all sessions and entries
imgx history switch <session-id>  # Switch to a different session
imgx history clear      # Clear project history (interactive)
imgx history clear --yes          # Clear without confirmation
imgx history clear --keep-files   # Clear history but keep image files
imgx history clear --all          # Clear ALL history across all projects

# Provider management
imgx providers          # List providers and capabilities
imgx capabilities       # Detailed capabilities of current provider
```

### CLI options

| Flag | Short | Description |
|------|-------|-------------|
| `--prompt` | `-p` | Image description or edit instruction (required) |
| `--output` | `-o` | Output file path (auto-generated if omitted) |
| `--input` | `-i` | Input image to edit (`edit` command only) |
| `--last` | `-l` | Use last output as input (`edit` command only) |
| `--aspect-ratio` | `-a` | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2` |
| `--resolution` | `-r` | `1K`, `2K`, `4K` |
| `--count` | `-n` | Number of images to generate |
| `--format` | `-f` | Output format: `png`, `jpeg`, `webp` (OpenAI only) |
| `--model` | `-m` | Model name |
| `--provider` | | Provider name (default: `gemini`) |
| `--output-dir` | `-d` | Output directory |

### Configuration

```bash
imgx config set api-key <key> --provider gemini   # Save Gemini API key
imgx config set api-key <key> --provider openai   # Save OpenAI API key
imgx config set model <name>      # Set default model
imgx config set output-dir <dir>  # Set default output directory
imgx config set aspect-ratio 16:9 # Set default aspect ratio
imgx config set resolution 2K     # Set default resolution
imgx config list                  # Show all settings
imgx config get api-key           # Show a specific setting (API key is masked)
imgx config path                  # Show config file location
```

### Project config (`.imgxrc`)

Generate a template with `imgx init`:

```bash
imgx init
# → creates .imgxrc in current directory
```

Or create manually:

```json
{
  "defaults": {
    "model": "gemini-3.1-flash-image-preview",
    "outputDir": "./assets/images",
    "aspectRatio": "16:9"
  }
}
```

Project config is shared via Git. Do not put API keys in `.imgxrc`.

#### Project root configuration (3 tiers)

| Method | Scope | How to set |
|--------|-------|------------|
| `IMGX_PROJECT_ROOT` env var in client config | Per-client (highest priority) | Add to `env` in `claude_desktop_config.json`, `.mcp.json`, etc. |
| Auto-detection (MCP roots / `.imgxrc` search) | Automatic | Works on CLI agents (Claude Code, Gemini CLI). Not available on Claude Desktop |
| `imgx config set project-root` | All clients on the machine | Stored in user config (`~/.config/imgx/config.json` or `%APPDATA%\imgx\config.json`) |

Detection priority: env var → MCP roots → `.imgxrc` upward search → user config `projectRoot`.

History is saved to `<project-root>/.imgx/output-history.json` (project-scoped, not shared with other projects). Default image output goes to `<project-root>/.imgx/<session-id>/`. Relative paths in `output` and `output_dir` are resolved against the project root instead of the MCP server's working directory.

### Settings resolution

1. CLI flags (`--model`, `--output-dir`, etc.)
2. Environment variables (`IMGX_MODEL`, `IMGX_OUTPUT_DIR`, etc.)
3. Project config (`.imgxrc` — searched from current directory upward)
4. User config (`~/.config/imgx/config.json` or `%APPDATA%\imgx\config.json`)
5. Provider defaults

### Output format

All CLI commands output JSON:

```json
{"success": true, "filePaths": ["./output.png"]}
```

## Claude Code plugin

The plugin bundles MCP server + skill in one step. If you prefer not to configure `.mcp.json` and skill files manually:

```
/plugin marketplace add somacoffeekyoto/imgx-mcp
/plugin install imgx-mcp@somacoffeekyoto-imgx-mcp
```

Update: `/plugin` → installed → imgx-mcp → update. If the update shows no changes, uninstall and reinstall.

Uninstall: `/plugin uninstall imgx-mcp@somacoffeekyoto-imgx-mcp` then `/plugin marketplace remove somacoffeekyoto-imgx-mcp`.

## Development

```bash
git clone https://github.com/somacoffeekyoto/imgx-mcp.git
cd imgx-mcp
npm install
npm run bundle    # TypeScript compile + esbuild bundle
```

The build produces two bundles:

- `dist/mcp.bundle.js` — MCP server entry point
- `dist/cli.bundle.js` — CLI entry point

## Uninstall

### MCP server

Remove the `imgx` entry from your tool's MCP configuration file.

### Skill

Delete the `image-generation/` directory from `.claude/skills/` or `~/.claude/skills/`.

### CLI

```bash
npm uninstall -g imgx-mcp
```

`npm uninstall` removes the package but does not delete configuration or generated files. Remove them manually if needed:

**Global configuration:**

```bash
# Linux / macOS
rm -rf ~/.config/imgx/

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:APPDATA\imgx"
```

**Project history and images:** Each project may have a `.imgx/` directory containing edit history and generated images. Remove it from each project as needed.

```bash
rm -rf <project-root>/.imgx/
```

## License

MIT — [SOMA COFFEE KYOTO](https://github.com/somacoffeekyoto)

## Links

- [Official page](https://somacoffee.net/imgx-mcp/)
- [GitHub](https://github.com/somacoffeekyoto/imgx-mcp)
- [npm](https://www.npmjs.com/package/imgx-mcp)
- [MCP Registry](https://registry.modelcontextprotocol.io)
- [SOMA COFFEE KYOTO](https://somacoffee.net)
- [X (@somacoffeekyoto)](https://x.com/somacoffeekyoto)
