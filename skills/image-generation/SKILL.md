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

If the MCP tools (`generate_image`, `edit_image`, `edit_last`, `list_providers`) are already available, skip this section.

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
- **Default output**: Images save to `~/Pictures/imgx/` with auto-generated filenames. Use `output` or `output_dir` to customize
- **Inline preview**: MCP responses include base64 image data for inline display in supported clients

## CLI fallback

If MCP tools are not available (MCP server not configured), fall back to CLI via Bash:

```bash
npx imgx-mcp generate -p "prompt" -o output.png
npx imgx-mcp edit -i input.png -p "edit instruction"
npx imgx-mcp edit --last -p "refine further"
```

See [providers reference](references/providers.md) for detailed provider capabilities.
