---
name: image-generation
description: Generate and edit AI images using Gemini or OpenAI. Text-to-image, text-based editing, iterative refinement.
---

# Image Generation & Editing

Generate and edit images using the imgx MCP tools. Gemini and OpenAI providers supported.

## When to use

- User asks to create, generate, or make an image
- User asks to edit, modify, or change an existing image
- User needs a cover image, diagram, icon, or visual asset
- User wants to refine an image iteratively ("make it darker", "change the background")

## Setup

If the MCP tools (`generate_image`, `edit_image`, `edit_last`, `list_providers`, `undo_edit`, `redo_edit`, `edit_history`, `switch_session`, `clear_history`, `set_output_dir`) are already available, skip this section.

### 1. Add MCP server

Add imgx-mcp to the project's `.mcp.json` (create the file if it doesn't exist):

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

On Windows, use `"command": "cmd"` and prepend `"/c"` to args:
```json
{
  "mcpServers": {
    "imgx": {
      "command": "cmd",
      "args": ["/c", "npx", "--package=imgx-mcp", "-y", "imgx-mcp"],
      "env": { "GEMINI_API_KEY": "your-key" }
    }
  }
}
```

After adding, restart Claude Code for the MCP server to connect.

### 2. API key

Get at least one API key:

- **Gemini** (default, free tier available): [Google AI Studio](https://aistudio.google.com/apikey)
- **OpenAI**: [OpenAI Platform](https://platform.openai.com/api-keys)

Set the key in the `.mcp.json` env section (above), or via CLI:
```bash
npx imgx-mcp config set api-key YOUR_KEY --provider gemini
```

### 3. Project root (optional but recommended)

imgx-mcp uses the project root to determine where `.imgx/` (history + default image output) is created. Without it, images go to `~/Pictures/imgx/` and history to `~/.config/imgx/`.

| Method | Scope | How to set |
|--------|-------|------------|
| `IMGX_PROJECT_ROOT` env var | Per-client (highest priority) | Add to `env` in `.mcp.json` or `claude_desktop_config.json` |
| Auto-detection (MCP roots / `.imgxrc` search) | Automatic | Works on CLI agents (Claude Code, Gemini CLI). Not available on Claude Desktop |
| `imgx config set project-root /path` | All clients on the machine | Stored in user config |

Detection priority: env var → MCP roots → `.imgxrc` upward search → user config `projectRoot`.

**Claude Code** usually auto-detects via MCP roots — no extra config needed. **Claude Desktop** does not support auto-detection, so set `IMGX_PROJECT_ROOT` in the env.

#### `.imgxrc` project config

Create with `npx imgx-mcp init` or manually. Shared via Git (do not put API keys here):

```json
{
  "defaults": {
    "model": "gemini-2.5-flash-image",
    "outputDir": "./assets/images",
    "aspectRatio": "16:9"
  }
}
```

#### Claude Desktop config example

```json
{
  "mcpServers": {
    "imgx": {
      "command": "npx",
      "args": ["--package=imgx-mcp", "-y", "imgx-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-key",
        "IMGX_PROJECT_ROOT": "C:\\Users\\you\\my-project"
      }
    }
  }
}
```

## MCP tools

Use these tools directly. No Bash needed.

### generate_image

Generate an image from a text prompt.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | Yes | Image description |
| `aspect_ratio` | No | `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `2:3`, `3:2` |
| `resolution` | No | `1K`, `2K`, `4K` (Gemini only) |
| `count` | No | Number of images (OpenAI only) |
| `output_format` | No | `png`, `jpeg`, `webp` (OpenAI only) |
| `model` | No | Model name |
| `provider` | No | `gemini` (default) or `openai` |
| `output` | No | Output file path |
| `output_dir` | No | Output directory |

### edit_image

Edit an existing image with text instructions. No mask needed — the model determines what to change from the text.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `input` | Yes | Path to the image to edit |
| `prompt` | Yes | Edit instruction |
| `aspect_ratio` | No | Output aspect ratio |
| `resolution` | No | Output resolution (Gemini only) |
| `output_format` | No | `png`, `jpeg`, `webp` (OpenAI only) |
| `model` | No | Model name |
| `provider` | No | `gemini` (default) or `openai` |
| `output` | No | Output file path |
| `output_dir` | No | Output directory |

### edit_last

Edit the last generated or edited image. No input path needed — automatically uses the previous output.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | Yes | Edit instruction |
| `aspect_ratio` | No | Output aspect ratio |
| `resolution` | No | Output resolution (Gemini only) |
| `output_format` | No | `png`, `jpeg`, `webp` (OpenAI only) |
| `model` | No | Model name |
| `provider` | No | `gemini` (default) or `openai` |
| `output` | No | Output file path |
| `output_dir` | No | Output directory |

### list_providers

List available providers and their capabilities. No parameters.

### undo_edit

Undo the last edit, reverting to the previous image state. No parameters.

Returns the file path and position of the current entry after undo.

### redo_edit

Redo a previously undone edit. No parameters.

Returns the file path and position of the current entry after redo.

### edit_history

Show the full edit history with all sessions. No parameters.

Returns all sessions with their entries, including operation type, prompt, provider, file paths, and timestamps.

### switch_session

Switch to a different editing session to continue work on a previous image chain.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `session_id` | Yes | Session ID to switch to (e.g. `s-a1b2c3d4`) |

### clear_history

Clear edit history for the current project. Optionally delete image files in managed directories.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `delete_files` | No | Delete image files in managed directories only (default: false) |
| `session_id` | No | Session ID to clear. Omit to clear all sessions |

### set_output_dir

Change the default output directory for generated images.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `path` | Yes | New output directory path |
| `move_files` | No | Move existing files to the new directory (default: false) |

## Providers

| Provider | Default model | Key capabilities |
|----------|--------------|------------------|
| Gemini (default) | `gemini-3-pro-image-preview` | Generate, edit, aspect ratio, resolution (1K/2K/4K) |
| Gemini (fast) | `gemini-2.5-flash-image` | Same as above, faster, lower cost, max 2K |
| OpenAI | `gpt-image-1` | Generate, edit, aspect ratio, multi-output (`count`), output format (PNG/JPEG/WebP) |

See [providers reference](references/providers.md) for detailed comparison.

## Practical workflows

### Blog cover image

```
1. generate_image: prompt="A developer's desk with laptop showing terminal, coffee cup, warm morning light" aspect_ratio="16:9" resolution="2K"
2. Review the result with the user
3. edit_last: prompt="Make the color palette warmer" (if user wants changes)
4. edit_last: prompt="Add subtle vignette effect" (further refinement)
```

### Iterative refinement

The `edit_last` tool is the key to conversational image editing. Each call takes the previous output as input:

```
generate_image → edit_last → edit_last → edit_last → done
```

Tell the user what was generated, ask if they want changes, and use `edit_last` to apply them. This is the most natural workflow.

### Undo / redo workflow

Use `undo_edit` and `redo_edit` to navigate through edit history:

```
generate_image → edit_last → edit_last → undo_edit → undo_edit → redo_edit
```

After undo, calling `edit_last` branches from the current position — abandoned entries and their files are automatically deleted from disk.

Each generate starts a new session. Use `edit_history` to see all sessions, and `switch_session` to resume work on a previous image chain. `edit_last` uses the current position in the switched session.

### Comparing providers

Generate the same prompt with different providers to let the user choose:

```
1. generate_image: prompt="..." provider="gemini"
2. generate_image: prompt="..." provider="openai"
3. Show both results. User picks their preferred version
4. edit_last to refine the chosen one (note: edit_last uses the most recent output)
```

### Icon or logo variations

```
1. generate_image: prompt="Minimalist coffee bean icon, white background" aspect_ratio="1:1" count=3
   (count works with OpenAI provider only)
2. For Gemini, generate multiple times with slight prompt variations
```

## Tips

- **Be specific in prompts**: "A wooden table with a ceramic pour-over dripper, steam rising, soft natural light from left" works better than "coffee scene"
- **Use edit_last for iteration**: Don't ask the user to specify file paths. Just use `edit_last` after any generation or edit
- **Check provider capabilities**: Use `list_providers` if unsure what a provider supports
- **Where `.imgx/` is created**: The `.imgx/` directory holds both edit history (`output-history.json`) and default image output. When a project root is detected, it's created at `<project-root>/.imgx/`. Without a project root, images go to `~/Pictures/imgx/` and history to `~/.config/imgx/`. All clients sharing the same project root share the same history. See the **Project root** setup section above for configuration methods
- **Default output**: Images save to `<project-root>/.imgx/<session-id>/` (project auto-detected). Falls back to `~/Pictures/imgx/` when no project is detected. Use `output` or `output_dir` to customize
- **Custom output_dir and history**: When `output_dir` is specified on `generate_image`, the path is recorded as session metadata in `output-history.json`. `edit_last` reads this to inherit the output location. Only image files go to the custom path — history always stays in `.imgx/` (or global config directory)
- **Inline preview**: MCP responses include base64 image data for inline display in supported clients
- **Undo/redo**: Use `undo_edit` and `redo_edit` to step through edit history. Each session holds up to 10 entries
- **Sessions**: Each `generate_image` starts a new session. Use `edit_history` to see all sessions and `switch_session` to resume a previous one
- **Sequential naming**: When `output` specifies a filename, `edit_last` appends sequential numbers: `cover.png` → `cover-1.png` → `cover-2.png`. Undo automatically deletes discarded files
- **Project scope**: History is stored per-project in `<project-root>/.imgx/output-history.json`. `clear_history` only affects the current project. Relative paths in `output` and `output_dir` are resolved against the project root

## CLI fallback

If MCP tools are not available (MCP server not configured), fall back to CLI via Bash:

```bash
npx imgx-mcp generate -p "prompt" -o output.png
npx imgx-mcp edit -i input.png -p "edit instruction"
npx imgx-mcp edit --last -p "refine further"
```

See [providers reference](references/providers.md) for detailed provider capabilities.
