# Provider Reference

## Gemini (default)

| Item | Value |
|------|-------|
| Provider name | `gemini` |
| Default model | `gemini-2.5-flash-image` (Nano Banana — **free tier**) |
| Paid models | `gemini-3-pro-image-preview` (Nano Banana Pro), `gemini-3.1-flash-image-preview` (Nano Banana 2) |
| API key env var | `GEMINI_API_KEY` |

### Model comparison

| Feature | Nano Banana Pro (`gemini-3-pro-image-preview`) | Nano Banana 2 (`gemini-3.1-flash-image-preview`) | Nano Banana (`gemini-2.5-flash-image`) |
|---------|------------------------------------------------|--------------------------------------------------|----------------------------------------|
| Quality | Highest | Good (improved text rendering, ~90% accuracy) | Good |
| Speed | Slower | Faster | Fast |
| Cost | ~$0.134/image | $0.045-$0.151/image (resolution dependent) | $0.039/image |
| Resolution | 1K, 2K, 4K | 1K, 2K, 4K | 1K (1024px max) |
| Aspect ratios | 14 | 14 | 7 |
| Free tier | No | No | **Yes** (10 RPM / 500 RPD) |

### Capabilities

| Capability | MCP parameter | Description |
|------------|---------------|-------------|
| TEXT_TO_IMAGE | (default) | Generate from text |
| IMAGE_EDITING | `input` | Edit with text instructions |
| ASPECT_RATIO | `aspect_ratio` | 3.x models: 14 ratios (`1:1`, `1:4`, `1:8`, `2:3`, `3:2`, `3:4`, `4:1`, `4:3`, `4:5`, `5:4`, `8:1`, `9:16`, `16:9`, `21:9`). 2.5 Flash: 7 ratios (`1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`) |
| RESOLUTION_CONTROL | `resolution` | 3.x models: `1K`, `2K`, `4K`. 2.5 Flash: `1K` only |
| REFERENCE_IMAGES | — | Use reference images (future) |
| PERSON_CONTROL | — | Control person generation (future) |

## OpenAI

| Item | Value |
|------|-------|
| Provider name | `openai` |
| Default model | `gpt-image-1` |
| Additional models | `gpt-image-1.5` (faster, 20% cheaper), `gpt-image-1-mini` (budget, $0.005/image) |
| API key env var | `OPENAI_API_KEY` |

### Capabilities

| Capability | MCP parameter | Description |
|------------|---------------|-------------|
| TEXT_TO_IMAGE | (default) | Generate from text |
| IMAGE_EDITING | `input` | Edit with text instructions |
| ASPECT_RATIO | `aspect_ratio` | 7 ratios: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9` |
| MULTIPLE_OUTPUTS | `count` | Generate up to 4 images per request |
| OUTPUT_FORMAT | `output_format` | PNG, JPEG, WebP |
| BACKGROUND | `background` | `transparent`, `opaque`, `auto`. Transparent PNG/WebP for icons, logos, stickers |
| QUALITY | `quality` | `low`, `medium`, `high`, `auto`. Direct quality control (overrides resolution mapping) |

### Provider comparison

| Feature | Gemini | OpenAI |
|---------|--------|--------|
| Edit (text-only, no mask) | Yes | Yes |
| Resolution control | Yes (3.x: 1K/2K/4K, 2.5: 1K only) | No |
| Aspect ratios | 3.x: 14, 2.5: 7 | 7 |
| Multiple outputs | No | Yes (up to 4) |
| Output format selection | No (PNG only) | Yes (PNG/JPEG/WebP) |
| Background transparency | No | Yes (`transparent`/`opaque`/`auto`) |
| Iterative editing (`edit_last`) | Yes | Yes |

## Adding new providers

Providers implement the `ImageProvider` interface and register via the provider registry. Each provider declares its supported capabilities. The MCP server and CLI dynamically enable/disable options based on the active provider's capabilities.
