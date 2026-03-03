import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import type { GeneratedImage } from "./types.js";
import { resolveDefault } from "./config.js";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export function readImageAsBase64(filePath: string): {
  data: string;
  mimeType: string;
} {
  const absPath = resolve(filePath);
  const buffer = readFileSync(absPath);
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "webp"
        ? "image/webp"
        : "image/png";

  return { data: buffer.toString("base64"), mimeType };
}

/** Resolve output directory: explicit arg → env/config → ~/Pictures/imgx */
function fallbackOutputDir(outputDir?: string): string {
  if (outputDir) return outputDir;
  const configured = resolveDefault("outputDir");
  if (configured) return configured;
  return join(homedir(), "Pictures", "imgx");
}

export function saveImage(
  image: GeneratedImage,
  outputPath?: string,
  outputDir?: string,
  sessionId?: string
): string {
  const ext = MIME_TO_EXT[image.mimeType] || ".png";

  let filePath: string;
  if (outputPath) {
    filePath = resolve(outputPath);
  } else {
    const baseDir = fallbackOutputDir(outputDir);
    const targetDir = sessionId ? join(baseDir, sessionId) : baseDir;
    filePath = resolve(targetDir, `imgx-${randomUUID().slice(0, 8)}${ext}`);
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, image.data);
  return filePath;
}
