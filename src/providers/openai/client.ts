import { readFileSync } from "node:fs";
import { resolveProjectPath } from "../../core/config.js";
import type { ImageProvider } from "../../core/provider.js";
import type {
  GenerateInput,
  EditInput,
  ImageResult,
  GeneratedImage,
} from "../../core/types.js";
import { OPENAI_PROVIDER_INFO } from "./capabilities.js";

const API_BASE = "https://api.openai.com/v1";

/** Map imgx aspect ratios to OpenAI size strings */
function mapSize(aspectRatio?: string): string {
  switch (aspectRatio) {
    case "1:1":
      return "1024x1024";
    case "3:2":
    case "16:9":
    case "4:3":
      return "1536x1024";
    case "2:3":
    case "9:16":
    case "3:4":
      return "1024x1536";
    default:
      return "auto";
  }
}

/** Map imgx resolution to OpenAI quality */
function mapQuality(resolution?: string): string {
  switch (resolution) {
    case "1K":
      return "low";
    case "4K":
      return "high";
    default:
      return "auto";
  }
}

/** Build multipart/form-data body manually for Node 18 compatibility */
function buildMultipart(
  fields: Record<string, string>,
  files: { name: string; data: Buffer; filename: string; contentType: string }[]
): { body: Uint8Array; contentType: string } {
  const boundary = `----imgx${Date.now()}${Math.random().toString(36).slice(2)}`;
  const parts: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      )
    );
  }

  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
      )
    );
    parts.push(file.data);
    parts.push(Buffer.from("\r\n"));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const concatenated = Buffer.concat(parts);
  return {
    body: new Uint8Array(concatenated.buffer, concatenated.byteOffset, concatenated.byteLength),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message: string };
}

export class OpenAIProvider implements ImageProvider {
  info = OPENAI_PROVIDER_INFO;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(input: GenerateInput, model?: string): Promise<ImageResult> {
    const modelName = model || this.info.defaultModel;

    try {
      const response = await fetch(`${API_BASE}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          prompt: input.prompt,
          n: input.count || 1,
          size: mapSize(input.aspectRatio),
          quality: input.quality || mapQuality(input.resolution),
          ...(input.outputFormat ? { output_format: input.outputFormat } : {}),
          ...(input.background ? { background: input.background } : {}),
        }),
      });

      const json = (await response.json()) as OpenAIImageResponse;

      if (!response.ok || json.error) {
        return {
          success: false,
          images: [],
          error: json.error?.message || `HTTP ${response.status}`,
        };
      }

      return this.parseResponse(json, input.outputFormat);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, images: [], error: msg };
    }
  }

  async edit(input: EditInput, model?: string): Promise<ImageResult> {
    const modelName = model || this.info.defaultModel;
    const absPath = resolveProjectPath(input.inputImage);
    const imageBuffer = readFileSync(absPath);
    const ext = absPath.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
          ? "image/webp"
          : "image/png";

    const fields: Record<string, string> = {
      model: modelName,
      prompt: input.prompt,
      n: String(input.count || 1),
      size: mapSize(input.aspectRatio),
      quality: input.quality || mapQuality(input.resolution),
      ...(input.outputFormat ? { output_format: input.outputFormat } : {}),
      ...(input.background ? { background: input.background } : {}),
    };

    const { body, contentType: ct } = buildMultipart(fields, [
      {
        name: "image",
        data: imageBuffer,
        filename: `image.${ext || "png"}`,
        contentType,
      },
    ]);

    try {
      const response = await fetch(`${API_BASE}/images/edits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": ct,
        },
        body: body as unknown as BodyInit,
      });

      const json = (await response.json()) as OpenAIImageResponse;

      if (!response.ok || json.error) {
        return {
          success: false,
          images: [],
          error: json.error?.message || `HTTP ${response.status}`,
        };
      }

      return this.parseResponse(json, input.outputFormat);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, images: [], error: msg };
    }
  }

  private parseResponse(json: OpenAIImageResponse, outputFormat?: "png" | "jpeg" | "webp"): ImageResult {
    const mimeMap: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
    const mimeType = mimeMap[outputFormat || "png"] || "image/png";
    const images: GeneratedImage[] = [];

    if (json.data) {
      for (const item of json.data) {
        if (item.b64_json) {
          images.push({
            data: Buffer.from(item.b64_json, "base64"),
            mimeType,
          });
        }
      }
    }

    if (images.length === 0) {
      return { success: false, images: [], error: "No image data in response" };
    }

    return { success: true, images };
  }
}
