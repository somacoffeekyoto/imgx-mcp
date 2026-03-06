---
name: image-generation
description: Generate and edit AI images using Gemini or OpenAI. Text-to-image, text-based editing, iterative refinement.
---

# Image Generation & Editing

Generate and edit images using the imgx MCP tools. Gemini and OpenAI providers supported.

## Default model behavior

**When the user does not specify a model, use Nano Banana (`gemini-2.5-flash-image`)** — the free tier model. This lets users start immediately without paid API access (500 images/day, no credit card).

Suggest upgrading to a paid model when:
- The user is unsatisfied with quality and wants improvement
- The user needs 4K resolution or extended aspect ratios (1:4, 1:8, 4:1, 8:1, 21:9)
- The user needs high text rendering accuracy (→ Nano Banana 2)
- The user explicitly asks for higher quality or a specific paid model
- The task clearly requires maximum quality (e.g. final production assets, print)

When suggesting an upgrade, briefly explain what the paid model adds. Example:
> "This was generated with the free model (Nano Banana). For higher resolution (up to 4K) and more aspect ratio options, I can re-generate with Nano Banana 2 or Pro — these require paid API access."

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
| Nano Banana, NanoBanana, NB, ナノバナナ | `gemini-2.5-flash-image` | gemini |
| GPT Image, gpt-image | `gpt-image-1` | openai |
| GPT Image 1.5 | `gpt-image-1.5` | openai |
| GPT Image Mini, gpt-mini | `gpt-image-1-mini` | openai |

When the user says "ナノバナナ2で画像作って" → use `generate_image` with `model="gemini-3.1-flash-image-preview"`.
When the user says "Nano Banana Proで前の画像を作り直して" → use `edit_last` with `model="gemini-3-pro-image-preview"`.
When the user says "ナノバナナで画像作って" or "NB" → use `generate_image` with `model="gemini-2.5-flash-image"` (free tier model).

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

## Models and image specs

### Nano Banana Pro — `gemini-3-pro-image-preview`

Google's highest-quality image generation model. Paid only.

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

### Nano Banana — `gemini-2.5-flash-image`

The only Gemini image model with a **free tier**. Best entry point for trying imgx-mcp without cost.

| Spec | Value |
|------|-------|
| Resolution | 1K (1024px) max |
| Aspect ratios | 7: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9` |
| Output format | PNG |
| Text rendering | Fair |
| Photorealism | Good |
| Free tier | **Yes** — 10 RPM / 500 RPD (no credit card required) |
| Paid tier | $0.039/image |
| Best for | Free usage, quick prototyping, learning the workflow |
| Limitations | No 4K, no extended aspect ratios (1:4, 1:8, 4:1, 8:1, 21:9 etc.) |

### OpenAI models

3 models available. All share the same capabilities (multi-output, format selection). Same API, same parameters.

| Spec | gpt-image-1 | gpt-image-1.5 | gpt-image-1-mini |
|------|-------------|----------------|------------------|
| Resolution | Auto | Auto | Auto |
| Aspect ratios | 7 | 7 | 7 |
| Output format | PNG, JPEG, WebP | PNG, JPEG, WebP | PNG, JPEG, WebP |
| Text rendering | Good | High (improved) | Fair |
| Speed | Standard | ~4x faster | Standard |
| Cost | $0.02-$0.19/image | ~20% cheaper than gpt-image-1 | $0.005-$0.036/image |
| Best for | General use | Fast iteration, text-heavy, editing precision | Budget, bulk generation |

### Model selection guide

| Situation | Recommended model |
|-----------|-------------------|
| **Default / no model specified** | **Nano Banana** (free, 500/day) |
| User wants better quality | Nano Banana Pro (`model="gemini-3-pro-image-preview"`) — paid |
| Fast iteration with 4K / extended ratios | Nano Banana 2 (`model="gemini-3.1-flash-image-preview"`) — paid |
| Text on images (logos, cards, mockups) | Nano Banana 2 (best text rendering) — paid |
| Ultra-wide / tall images (8:1, 1:8, 21:9) | Gemini 3.x models (14 aspect ratios) — paid |
| Need transparent PNG (icons, logos) | OpenAI (`background="transparent"`) — paid |
| Need JPEG/WebP output | OpenAI (`output_format="jpeg"`) — paid |
| Multiple variations at once | OpenAI (`count=3`) — paid |
| OpenAI fast + cheap | gpt-image-1.5 (`model="gpt-image-1.5"`) — 4x faster, 20% cheaper |
| OpenAI ultra-budget | gpt-image-1-mini (`model="gpt-image-1-mini"`) — $0.005/image |
| OpenAI fast draft (low cost) | Any OpenAI model with `quality="low"` — fastest, cheapest |
| OpenAI maximum detail | Any OpenAI model with `quality="high"` — best quality, slower |
| Compare providers side-by-side | Generate with Gemini, then OpenAI |
| Budget-conscious bulk generation | Nano Banana 2 (lowest per-image cost in paid tier) |

**Upgrade path**: Nano Banana (free) → Nano Banana 2 (fast, affordable paid) → Nano Banana Pro (highest quality paid)

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
| `background` | No | `transparent`, `opaque`, `auto` (OpenAI only). Use `transparent` for transparent PNG/WebP |
| `quality` | No | `low`, `medium`, `high`, `auto` (OpenAI only). Overrides resolution-based mapping |
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
| `background` | No | `transparent`, `opaque`, `auto` (OpenAI only) |
| `quality` | No | `low`, `medium`, `high`, `auto` (OpenAI only) |
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
| `background` | No | `transparent`, `opaque`, `auto` (OpenAI only) |
| `quality` | No | `low`, `medium`, `high`, `auto` (OpenAI only) |
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
1. generate_image: prompt="A developer's desk with laptop showing terminal, coffee cup, warm morning light" aspect_ratio="16:9"
   (uses free Nano Banana model by default)
2. Review the result with the user
3. edit_last: prompt="Make the color palette warmer" (if user wants changes)
4. If user wants higher quality → re-generate with model="gemini-3-pro-image-preview" resolution="2K"
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
- Start with Nano Banana (free) for drafting. Upgrade to `2K` resolution with Nano Banana 2 or Pro for final
- For text on the image — suggest Nano Banana 2 (best text rendering, paid)
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
- Draft with Nano Banana (free), then `4K` with Nano Banana 2 or Pro (paid) for retina
- Prompt tip: Describe the device frame and screen content you want shown

### Use case: Vertical content (Stories, Reels, Shorts)

- Aspect ratio: `9:16`
- Full-bleed imagery works best — describe edge-to-edge scenes

### Use case: Ultra-wide banner

- Aspect ratio: `21:9` or `8:1` — requires Gemini 3.x models (paid)
- Good for website hero banners, email headers, panoramic scenes
- Note: Nano Banana (free) does not support extended ratios. Suggest upgrade if user needs these

### Use case: Tall / narrow (Pinterest, infographic header)

- Aspect ratio: `1:4` or `1:8` — requires Gemini 3.x models (paid)
- Describe vertical flow — elements stacked top to bottom

### Use case: Icons, logos, stickers (transparent background)

- Use OpenAI with `background="transparent"` and `output_format="png"` (or `webp`)
- JPEG does not support transparency — use PNG or WebP
- Aspect ratio: `1:1` for icons
- Prompt tip: Describe only the subject. Do not describe the background — the API handles removal

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

**Quality escalation**: Start with Nano Banana (free) for drafting. When the concept is right, offer to re-generate with Nano Banana 2 (paid, fast, 4K) or Nano Banana Pro (paid, highest quality) for the final version.

**A/B comparison**: Generate the same prompt with `provider="gemini"` then `provider="openai"` and show both to the user.

**Iterative detail building**: Start broad ("a coffee shop interior"), then add details step by step ("add plants by the window", "put a barista behind the counter", "add warm overhead lighting").

**Style exploration**: Generate a base image, then apply different style transfers with `edit_last` to find the right mood. Use `undo_edit` to return to the base and try another style.

## Viral and trending image styles

Popular AI image styles that users may request. Use these prompt templates with `generate_image` or `edit_last`.

| Style | Prompt template | Notes |
|-------|----------------|-------|
| Ghibli / anime scene | "Redraw in Studio Ghibli anime style, soft watercolor textures, warm natural lighting, pastoral atmosphere" | Apply via `edit_last` to transform existing images |
| Action figure in box | "A realistic action figure of [subject] in a sealed toy box with clear plastic window, product packaging, brand logo area at top, accessories visible" | Works well with `1:1` or `3:4` aspect ratio |
| 3D clay figure | "A cute 3D clay figure of [subject], rounded smooth surfaces, soft pastel colors, miniature diorama, studio lighting" | The original "Nano Banana" viral style |
| "Hug your past self" | "A person in [current clothing] hugging a smaller version of themselves as a [child/teenager], warm emotional lighting, photo-realistic" | Emotional / personal branding content |
| Pet portrait (humanized) | "A [breed] dog/cat dressed in [outfit], sitting in a [setting], portrait style, dignified pose, realistic fur texture" | Popular for social media profiles |
| Chibi character | "A chibi-style character of [description], oversized head, small body, big expressive eyes, simple background, cute proportions" | Good for avatars and stickers |
| Pixel art retro | "16-bit pixel art of [subject], retro game aesthetic, limited color palette, clean pixel edges" | Nostalgic developer/gaming content |

When the user requests a trending style, use the appropriate template and adjust based on their subject. Combine with `background="transparent"` (OpenAI) for stickers.

## Specialized use case guides

### Icon set generation

Generate multiple icons with consistent style for an app or project:

```
1. Define the style: "Flat minimalist icon, 2px stroke, rounded corners, single accent color #FF6B35 on white"
2. generate_image: prompt="[style] of a home/house symbol" aspect_ratio="1:1"
3. generate_image: prompt="[style] of a settings gear symbol" aspect_ratio="1:1"
4. generate_image: prompt="[style] of a user profile symbol" aspect_ratio="1:1"
```

Key: Repeat the exact same style description in every prompt. This is more reliable than using `edit_last` for style consistency across separate icons.

For transparent icons: Use OpenAI with `background="transparent"` and describe only the icon subject.

### Seamless pattern

```
1. generate_image: prompt="Seamless tileable pattern of [elements], evenly distributed, no visible seam edges, [style]"
2. edit_last: prompt="Make the pattern more evenly distributed, ensure elements don't cluster at edges"
```

Tip: Include "seamless tileable pattern" and "no visible seam edges" in the prompt.

### Technical diagram / architecture

```
1. generate_image: prompt="Clean technical architecture diagram showing [components], labeled boxes connected by arrows, white background, minimal style, clear hierarchy"
2. edit_last: prompt="Add a label '[text]' to the top box"
```

For accurate text labels, use Nano Banana 2 (best text rendering) or OpenAI gpt-image-1.5.

### Story sequence (consistent characters)

Maintain visual consistency across a sequence of images:

```
1. Define a character DNA: "A woman with short dark hair, round glasses, wearing a navy blue cardigan and white t-shirt"
2. generate_image: prompt="[character DNA], sitting at a desk reading a book, warm indoor lighting"
3. generate_image: prompt="[character DNA], standing at a coffee shop counter ordering, morning light through windows"
4. generate_image: prompt="[character DNA], walking on a city street with a tote bag, afternoon sun"
```

Key: Copy the exact character description into every prompt. Add scene-specific context after the character DNA. Consistency improves when using the same model and provider across all images.

## Multi-image consistency techniques

When the user needs multiple images that look like they belong together (slide decks, social media series, brand assets):

### Design token approach

Define visual constants and reuse them across all prompts:

```
Color:     "earth tones, warm browns (#8B6914) and sage green (#87A96B)"
Style:     "flat illustration with subtle paper texture, 2D, no gradients"
Lighting:  "soft diffused natural light, no harsh shadows"
Framing:   "centered subject, 20% padding, clean background"
```

Prepend these tokens to every prompt: `"[tokens], [subject-specific content]"`

### Character DNA template

For recurring characters or mascots, write a fixed description block:

```
Character: "A friendly robot with a round head, single blue eye, matte silver body, short stubby arms, standing upright"
```

Never paraphrase — copy the exact same text each time.

### Style reference chain

Use one generated image as the style anchor:

```
1. generate_image: prompt="[detailed style + first scene]" → establish the look
2. For subsequent images: describe the same style explicitly + new scene content
3. If style drifts: undo_edit back, regenerate with more explicit style description
```

### Consistency tips

- **Same model, same provider** across all images in a set
- **Front-load the style description** before scene-specific content
- **Use exact phrases** — "soft watercolor" not sometimes "watercolor" and sometimes "painted in watercolors"
- **Generate at the same resolution** — mixing resolutions changes perceived style
- **Review and regenerate** — if one image in a set drifts, regenerate it rather than trying to edit it to match

## Platform size guide

Recommended aspect ratios and resolutions for common platforms. When the user mentions a platform, suggest these settings automatically.

### Social media

| Platform | Use case | Aspect ratio | Resolution | Notes |
|----------|----------|-------------|------------|-------|
| Twitter/X | Post image | `16:9` | `2K` | 1200x675 recommended, larger is fine |
| Twitter/X | Profile header | `3:1` (use `21:9`) | `2K` | 1500x500 recommended |
| Facebook | Shared post | `16:9` | `2K` | |
| Facebook | Cover photo | `21:9` | `2K` | 820x312 recommended |
| Instagram | Feed post | `1:1` or `4:5` | `2K` | Square or portrait |
| Instagram | Story/Reel | `9:16` | `2K` | 1080x1920 |
| LinkedIn | Post image | `16:9` or `1:1` | `2K` | |
| YouTube | Thumbnail | `16:9` | `2K` | 1280x720 minimum |

### OGP (Open Graph Protocol)

| Platform | Recommended size | Aspect ratio | Notes |
|----------|-----------------|-------------|-------|
| Twitter/X Cards | 1200x630 | `~1.91:1` (use `16:9`) | Summary with large image |
| Facebook OGP | 1200x630 | `~1.91:1` (use `16:9`) | Same as Twitter |
| LinkedIn OGP | 1200x627 | `~1.91:1` (use `16:9`) | Same ratio |
| Slack unfurl | 1200x630 | `16:9` | Same as OGP standard |

For OGP images: Use `16:9` at `2K` resolution. This covers all major platforms.

### App stores

| Platform | Use case | Aspect ratio | Resolution |
|----------|----------|-------------|------------|
| iOS App Store | Screenshot (iPhone) | `9:16` | `4K` (retina) |
| iOS App Store | Screenshot (iPad) | `3:4` | `4K` |
| Google Play | Screenshot | `9:16` | `4K` |
| App Store | Feature graphic | `16:9` | `2K` |

### Print and documents

| Use case | Aspect ratio | Resolution | Notes |
|----------|-------------|------------|-------|
| A4 document | `3:4` | `4K` | Portrait orientation |
| Letter | `4:5` | `4K` | US letter approximation |
| Presentation (16:9) | `16:9` | `2K`–`4K` | Standard widescreen |
| Business card | `16:9` or `3:2` | `2K` | Landscape orientation |

### Blog platforms

| Platform | Cover image | Aspect ratio | Notes |
|----------|-------------|-------------|-------|
| note.com | Header | `16:9` | PNG recommended |
| Dev.to | Cover | `16:9` | 1000x420 minimum |
| Medium | Header | `16:9` or `3:2` | |
| WordPress | Featured image | `16:9` | JPEG for file size |
| Qiita | OGP | `16:9` | Auto-generated if not set |

## Writing effective prompts

Structure prompts with three layers: **Subject → Context → Style**. Each layer adds specificity.

### Subject (what)

Name the main subject concretely. Avoid abstract descriptions.

| Weak | Strong |
|------|--------|
| "coffee scene" | "a ceramic pour-over dripper on a wooden table with a freshly brewed cup" |
| "developer working" | "a developer's hands on a laptop keyboard, terminal showing green text on dark background" |
| "nature" | "a single oak tree on a grass hill, autumn leaves half-fallen" |

### Context (where / when / with what)

Add environment, lighting, and surrounding elements.

| Element | Example |
|---------|---------|
| Lighting | "soft natural light from a left window", "harsh overhead fluorescent", "golden hour backlight" |
| Setting | "in a minimalist Scandinavian kitchen", "on a rainy Tokyo street at night" |
| Surrounding objects | "with a notebook and pen beside it", "next to a stack of books" |
| Time/season | "early morning", "winter snowfall outside the window" |

### Style (how it looks)

Specify the visual treatment.

| Element | Example |
|---------|---------|
| Photography style | "shallow depth of field, f/1.8", "wide-angle shot from below" |
| Art style | "flat vector illustration", "watercolor with soft edges", "detailed pencil sketch" |
| Color palette | "earth tones, warm browns and greens", "monochrome with single red accent" |
| Mood | "calm and contemplative", "energetic and vibrant" |

### Complete prompt example

```
Subject:  A barista pouring steamed milk into a latte, creating a rosetta pattern
Context:  At a wooden counter in a small coffee shop, warm pendant light overhead, coffee equipment in the background
Style:    Close-up shot, shallow depth of field, warm earth tones, natural lighting
```

→ `"A barista pouring steamed milk into a latte creating a rosetta pattern, at a wooden counter in a small coffee shop, warm pendant light overhead, coffee equipment in background, close-up shot, shallow depth of field, warm earth tones, natural lighting"`

### Prompt tips

- **Be literal, not metaphorical** — "a bridge connecting two cliffs" not "bridging the gap between ideas"
- **Front-load the subject** — The model weights the beginning of the prompt more heavily
- **Specify what you don't want** sparingly — "no text" or "no people" can help, but negative prompts are less reliable than positive descriptions
- **For text in images** — Put the exact text in quotes: `"with the text 'HELLO WORLD' in bold white sans-serif at the top center"`
- **For editing** — Describe only the change, not the entire image. "Make the sky sunset orange" not "A scene with everything the same but the sky is now sunset orange"

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
