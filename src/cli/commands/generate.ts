import { randomUUID } from "node:crypto";
import type { ImageProvider } from "../../core/provider.js";
import { saveImage } from "../../core/storage.js";
import { pushHistory } from "../../core/history.js";
import * as out from "../output.js";

interface GenerateArgs {
  prompt: string;
  output?: string;
  outputDir?: string;
  aspectRatio?: string;
  count?: number;
  resolution?: string;
  outputFormat?: "png" | "jpeg" | "webp";
  background?: "transparent" | "opaque" | "auto";
  model?: string;
}

export async function runGenerate(
  provider: ImageProvider,
  args: GenerateArgs
): Promise<void> {
  const result = await provider.generate(
    {
      prompt: args.prompt,
      aspectRatio: args.aspectRatio,
      count: args.count,
      resolution: args.resolution,
      outputFormat: args.outputFormat,
      background: args.background,
    },
    args.model
  );

  if (!result.success || result.images.length === 0) {
    out.fail(result.error || "Generation failed");
  }

  const sessionId = `s-${randomUUID().slice(0, 8)}`;
  const paths: string[] = [];
  for (let i = 0; i < result.images.length; i++) {
    const outputPath =
      result.images.length === 1
        ? args.output
        : args.output?.replace(/\.(\w+)$/, `-${i + 1}.$1`);

    const saved = saveImage(result.images[i], outputPath, args.outputDir, sessionId);
    paths.push(saved);
  }

  pushHistory({
    filePaths: paths,
    prompt: args.prompt,
    provider: provider.info.name,
    model: args.model || provider.info.defaultModel,
    operation: "generate",
    inputImage: null,
    timestamp: Date.now(),
  }, { newSession: true, sessionId, outputDir: args.outputDir });
  out.success({ filePaths: paths });
}
