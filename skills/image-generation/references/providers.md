# Provider Reference

## Gemini (default)

| Item | Value |
|------|-------|
| Provider name | `gemini` |
| Default model | `gemini-3-pro-image-preview` |
| Alternative model | `gemini-2.5-flash-image` |
| API key env var | `GEMINI_API_KEY` |

### Model comparison

| Feature | gemini-3-pro-image-preview | gemini-2.5-flash-image |
|---------|---------------------------|------------------------|
| Quality | Higher | Good |
| Speed | Slower | Faster |
| Cost | ~$0.134/image | Lower |
| Resolution | 1K, 2K, 4K | 1K, 2K |

### Capabilities

| Capability | MCP parameter | Description |
|------------|---------------|-------------|
| TEXT_TO_IMAGE | (default) | Generate from text |
| IMAGE_EDITING | `input` | Edit with text instructions |
| ASPECT_RATIO | `aspect_ratio` | 7 ratios: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9` |
| RESOLUTION_CONTROL | `resolution` | `1K`, `2K`, `4K` |
| REFERENCE_IMAGES | — | Use reference images (future) |
| PERSON_CONTROL | — | Control person generation (future) |

## OpenAI

| Item | Value |
|------|-------|
| Provider name | `openai` |
| Default model | `gpt-image-1` |
| API key env var | `OPENAI_API_KEY` |

### Capabilities

| Capability | MCP parameter | Description |
|------------|---------------|-------------|
| TEXT_TO_IMAGE | (default) | Generate from text |
| IMAGE_EDITING | `input` | Edit with text instructions |
| ASPECT_RATIO | `aspect_ratio` | 7 ratios: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9` |
| MULTIPLE_OUTPUTS | `count` | Generate up to 4 images per request |
| OUTPUT_FORMAT | `output_format` | PNG, JPEG, WebP |

### Provider comparison

| Feature | Gemini | OpenAI |
|---------|--------|--------|
| Edit (text-only, no mask) | Yes | Yes |
| Resolution control | Yes (1K/2K/4K) | No |
| Multiple outputs | No | Yes (up to 4) |
| Output format selection | No (PNG only) | Yes (PNG/JPEG/WebP) |
| Iterative editing (`edit_last`) | Yes | Yes |

## Adding new providers

Providers implement the `ImageProvider` interface and register via the provider registry. Each provider declares its supported capabilities. The MCP server and CLI dynamically enable/disable options based on the active provider's capabilities.
