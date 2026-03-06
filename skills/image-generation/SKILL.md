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
- User mentions a model by alias (Nano Banana, NB2, etc.) — see Model aliases below

## Model aliases

Users may refer to models by their alias. Map these to the correct `model` parameter value:

| Alias (case-insensitive) | Model ID | Provider |
|--------------------------|----------|----------|
| Nano Banana Pro, NanoBanana Pro, NB Pro, ナノバナナプロ | `gemini-3-pro-image-preview` | gemini |
| Nano Banana 2, NanoBanana 2, NB2, ナノバナナ2, ナノバナナツー | `gemini-3.1-flash-image-preview` | gemini |
| GPT Image, gpt-image | `gpt-image-1` | openai |

When the user says "ナノバナナ2で画像作って" → use `generate_image` with `model="gemini-3.1-flash-image-preview"`.
When the user says "Nano Banana Proで前の画像を作り直して" → use `edit_last` with `model="gemini-3-pro-image-preview"`.

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

- **Gemini** (default): [Google AI Studio](https://aistudio.google.com/apikey)
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

Detection priority: env var > MCP roots > `.imgxrc` upward search > user config `projectRoot`.

**Claude Code** usually auto-detects via MCP roots — no extra config needed. **Claude Desktop** does not support auto-detection, so set `IMGX_PROJECT_ROOT` in the env.

#### `.imgxrc` project config

Create with `npx imgx-mcp init` or manually. Shared via Git (do not put API keys here):

```json
{
  "defaults": {
    "model": "gemini-3.1-flash-image-preview",
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

## Models and image specs

### Nano Banana Pro — `gemini-3-pro-image-preview`

Google's highest-quality image generation model. Default model.

| Spec | Value |
|------|-------|
| Resolution | 1K (1024px), 2K (2048px), 4K (4096px) |
| Aspect ratios | 14: `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9` |
| Output format | PNG |
| Text rendering | Good |
| Photorealism | High |
| Cost | ~$0.134/image |
| Best for | High-quality hero images, photorealistic scenes, detailed illustrations |

### Nano Banana 2 — `gemini-3.1-flash-image-preview`

Fast model with Pro-level capabilities at lower cost. Improved text rendering.

| Spec | Value |
|------|-------|
| Resolution | 1K (1024px), 2K (2048px), 4K (4096px) |
| Aspect ratios | 14: `1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9` |
| Output format | PNG |
| Text rendering | High (~90% accuracy) |
| Photorealism | Good |
| Cost | $0.045-$0.151/image (resolution dependent) |
| Best for | Rapid iteration, text-heavy images, marketing mockups, cost-sensitive workflows |

### gpt-image-1 (OpenAI)

OpenAI's image model with multi-output and format selection.

| Spec | Value |
|------|-------|
| Resolution | Auto (model-determined) |
| Aspect ratios | 7: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9` |
| Output format | PNG, JPEG, WebP (selectable) |
| Text rendering | Good |
| Photorealism | High |
| Cost | $0.02-$0.19/image |
| Best for | Multi-output comparison, JPEG/WebP workflows, alternative style |

### Model selection guide

| Situation | Recommended model |
|-----------|-------------------|
| Default / general use | Nano Banana Pro (default) |
| Fast iteration, draft ideas | Nano Banana 2 (`model="gemini-3.1-flash-image-preview"`) |
| Text on images (logos, cards, mockups) | Nano Banana 2 (best text rendering) |
| Ultra-wide / tall images (8:1, 1:8, 21:9) | Gemini models (14 aspect ratios) |
| Need JPEG/WebP output | OpenAI (`output_format="jpeg"`) |
| Multiple variations at once | OpenAI (`count=3`) |
| Compare providers side-by-side | Generate with Gemini, then OpenAI |
| Budget-conscious bulk generation | Nano Banana 2 (lowest per-image cost) |

## MCP tools

Use these tools directly. No Bash needed.

### generate_image

Generate an image from a text prompt.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `prompt` | Yes | Image description |
| `aspect_ratio` | No | See model specs above for supported ratios |
| `resolution` | No | `1K`, `2K`, `4K` (Gemini only) |
| `count` | No | Number of images (OpenAI only) |
| `output_format` | No | `png`, `jpeg`, `webp` (OpenAI only) |
| `model` | No | Model name or use alias mapping above |
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
| `model` | No | Model name or use alias mapping above |
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
| `model` | No | Model name or use alias mapping above |
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
generate_image -> edit_last -> edit_last -> edit_last -> done
```

Tell the user what was generated, ask if they want changes, and use `edit_last` to apply them. This is the most natural workflow.

### Undo / redo workflow

Use `undo_edit` and `redo_edit` to navigate through edit history:

```
generate_image -> edit_last -> edit_last -> undo_edit -> undo_edit -> redo_edit
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

## Common use cases and techniques

When the user describes what they need, suggest appropriate parameters and approach based on context.

### Use case: OGP / social share images

- Aspect ratio: `16:9` (Twitter/X, Facebook) or `1.91:1` (use `2:3` as closest)
- Resolution: `2K` for sharp previews
- Include clear text or branding — use Nano Banana 2 for reliable text rendering
- Prompt tip: Describe the scene plus any text overlay you want rendered directly

### Use case: Blog / article cover

- Aspect ratio: `16:9` or `3:2`
- Resolution: `2K` (balances quality and file size)
- Prompt tip: Describe the main visual concept. Avoid metaphorical descriptions — be literal about what should appear

### Use case: Presentation slides

- Aspect ratio: `16:9`
- Resolution: `2K`
- Use a consistent visual theme across slides (describe the same color palette, style, and composition framing)
- Prompt tip: Include "slide design" or "presentation visual" for cleaner layout

### Use case: App store screenshots / product images

- Aspect ratio: `9:16` (portrait), `16:9` (landscape), `1:1` (square)
- Resolution: `4K` for retina displays
- Prompt tip: Describe the device frame and screen content you want shown

### Use case: Vertical content (Stories, Reels, Shorts)

- Aspect ratio: `9:16`
- Full-bleed imagery works best — describe edge-to-edge scenes

### Use case: Ultra-wide banner

- Aspect ratio: `21:9` or `8:1` (Gemini only)
- Good for website hero banners, email headers, panoramic scenes

### Use case: Tall / narrow (Pinterest, infographic header)

- Aspect ratio: `1:4` or `1:8` (Gemini only)
- Describe vertical flow — elements stacked top to bottom

### Use case: WordPress / web content

- Prefer `output_format="jpeg"` (OpenAI) for smaller file size
- Or generate with Gemini (PNG) and let the CMS handle conversion
- `2K` resolution is sufficient for web

## Popular editing techniques

When the user wants to modify an image, suggest these proven approaches with `edit_last`:

### Atmosphere and mood

| Technique | Prompt example |
|-----------|---------------|
| Warm up | "Make the color palette warmer, shift toward golden/amber tones" |
| Cool down | "Shift the color palette to cooler blue tones" |
| Dramatic lighting | "Add dramatic side lighting with deep shadows" |
| Golden hour | "Change the lighting to golden hour, warm sun low on the horizon" |
| Night / dark mode | "Convert to a nighttime scene with dark sky and artificial lighting" |
| Foggy / misty | "Add atmospheric fog in the background" |

### Composition adjustments

| Technique | Prompt example |
|-----------|---------------|
| Simplify background | "Replace the busy background with a clean, solid dark background" |
| Add depth of field | "Blur the background to create shallow depth of field, keep foreground sharp" |
| Add vignette | "Add a subtle vignette effect, darker edges" |
| Change perspective | "Change the viewpoint to a top-down bird's eye view" |
| Zoom in | "Crop tighter on the main subject, remove surrounding elements" |

### Element manipulation

| Technique | Prompt example |
|-----------|---------------|
| Add object | "Add a steaming coffee cup on the left side of the desk" |
| Remove object | "Remove the laptop from the scene" |
| Change color | "Change the shirt color from blue to red" |
| Add text | "Add the text 'HELLO WORLD' in bold white letters at the top" |
| Swap material | "Change the wooden table to marble" |
| Change season | "Change the scene from summer to autumn, add fall foliage" |
| Add weather | "Add rain falling and puddles on the ground" |

### Style transfer

| Technique | Prompt example |
|-----------|---------------|
| Illustration style | "Convert to a flat vector illustration style" |
| Watercolor | "Redraw as a watercolor painting with soft edges" |
| Pencil sketch | "Convert to a detailed pencil sketch" |
| Pixel art | "Redraw as pixel art in 16-bit style" |
| Anime / manga | "Redraw in anime art style" |
| Vintage photo | "Apply a vintage film photo look with grain and faded colors" |

### Practical refinement patterns

These multi-step sequences are common in real workflows:

**Quality escalation**: Generate fast with Nano Banana 2, then re-generate the final version with Nano Banana Pro for higher quality.

**A/B comparison**: Generate the same prompt with `provider="gemini"` then `provider="openai"` and show both to the user.

**Iterative detail building**: Start broad ("a coffee shop interior"), then add details step by step ("add plants by the window", "put a barista behind the counter", "add warm overhead lighting").

**Style exploration**: Generate a base image, then apply different style transfers with `edit_last` to find the right mood. Use `undo_edit` to return to the base and try another style.

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
- **Sequential naming**: When `output` specifies a filename, `edit_last` appends sequential numbers: `cover.png` -> `cover-1.png` -> `cover-2.png`. Undo automatically deletes discarded files
- **Project scope**: History is stored per-project in `<project-root>/.imgx/output-history.json`. `clear_history` only affects the current project. Relative paths in `output` and `output_dir` are resolved against the project root

## CLI fallback

If MCP tools are not available (MCP server not configured), fall back to CLI via Bash:

```bash
npx imgx-mcp generate -p "prompt" -o output.png
npx imgx-mcp edit -i input.png -p "edit instruction"
npx imgx-mcp edit --last -p "refine further"
```

See [providers reference](references/providers.md) for detailed provider capabilities.
