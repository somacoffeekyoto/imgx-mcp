import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initGemini } from "../providers/gemini/index.js";
import { initOpenAI } from "../providers/openai/index.js";
import { getProvider, listProviders } from "../core/registry.js";
import { saveImage } from "../core/storage.js";
import {
  pushHistory,
  getActiveEntry,
  getActiveSessionOutputDir,
  loadHistory,
  undoHistory,
  redoHistory,
  getHistory,
  switchSession,
  clearHistory,
  clearSession,
  isManagedPath,
} from "../core/history.js";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { GenerateInput, EditInput, GeneratedImage } from "../core/types.js";
import { setProjectRoot } from "../core/config.js";

/** Build MCP content array with image previews + file path info */
function buildImageContent(
  images: GeneratedImage[],
  paths: string[],
  extra?: Record<string, unknown>
): Array<{ type: "image"; data: string; mimeType: string } | { type: "text"; text: string }> {
  const content: Array<{ type: "image"; data: string; mimeType: string } | { type: "text"; text: string }> = [];
  for (const img of images) {
    content.push({ type: "image", data: img.data.toString("base64"), mimeType: img.mimeType });
  }
  content.push({ type: "text", text: JSON.stringify({ success: true, filePaths: paths, ...extra }) });
  return content;
}

const server = new McpServer({
  name: "imgx",
  version: "1.5.0",
});

// プロバイダ初期化
initGemini();
initOpenAI();

function resolveProvider(providerName?: string) {
  const name = providerName || process.env.IMGX_PROVIDER || "gemini";
  const provider = getProvider(name);
  if (!provider) {
    const available = listProviders().map((p) => p.info.name).join(", ");
    throw new Error(
      `Provider "${name}" not available.` +
        (available ? ` Available: ${available}` : " Set GEMINI_API_KEY or OPENAI_API_KEY to enable a provider.")
    );
  }
  return provider;
}

// --- generate_image ---

server.tool(
  "generate_image",
  "Generate an image from a text prompt",
  {
    prompt: z.string().describe("Image description"),
    output: z.string().optional().describe("Output file path"),
    output_dir: z.string().optional().describe("Output directory"),
    aspect_ratio: z
      .enum(["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"])
      .optional()
      .describe("Aspect ratio"),
    resolution: z.enum(["1K", "2K", "4K"]).optional().describe("Output resolution"),
    count: z.number().int().min(1).max(4).optional().describe("Number of images"),
    output_format: z.enum(["png", "jpeg", "webp"]).optional().describe("Output format"),
    model: z.string().optional().describe("Model name"),
    provider: z.string().optional().describe("Provider name"),
  },
  async (args) => {
    try {
      const prov = resolveProvider(args.provider);
      const input: GenerateInput = {
        prompt: args.prompt,
        aspectRatio: args.aspect_ratio,
        resolution: args.resolution,
        count: args.count,
        outputFormat: args.output_format,
      };

      const result = await prov.generate(input, args.model);
      if (!result.success || result.images.length === 0) {
        return { content: [{ type: "text", text: `Error: ${result.error || "Generation failed"}` }] };
      }

      const sessionId = `s-${randomUUID().slice(0, 8)}`;
      const paths: string[] = [];
      for (let i = 0; i < result.images.length; i++) {
        const outputPath =
          result.images.length === 1
            ? args.output
            : args.output?.replace(/\.(\w+)$/, `-${i + 1}.$1`);
        const saved = saveImage(result.images[i], outputPath, args.output_dir, sessionId);
        paths.push(saved);
      }

      pushHistory({
        filePaths: paths,
        prompt: args.prompt,
        provider: prov.info.name,
        model: args.model || prov.info.defaultModel,
        operation: "generate",
        inputImage: null,
        timestamp: Date.now(),
      }, { newSession: true, sessionId, outputDir: args.output_dir });
      return { content: buildImageContent(result.images, paths) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${msg}` }] };
    }
  }
);

// --- edit_image ---

server.tool(
  "edit_image",
  "Edit an existing image with text instructions",
  {
    input: z.string().describe("Input image file path"),
    prompt: z.string().describe("Edit instruction"),
    output: z.string().optional().describe("Output file path"),
    output_dir: z.string().optional().describe("Output directory"),
    aspect_ratio: z
      .enum(["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"])
      .optional()
      .describe("Aspect ratio"),
    resolution: z.enum(["1K", "2K", "4K"]).optional().describe("Output resolution"),
    output_format: z.enum(["png", "jpeg", "webp"]).optional().describe("Output format"),
    model: z.string().optional().describe("Model name"),
    provider: z.string().optional().describe("Provider name"),
  },
  async (args) => {
    try {
      const prov = resolveProvider(args.provider);
      if (!prov.edit) {
        return {
          content: [{ type: "text", text: `Error: Provider "${prov.info.name}" does not support image editing` }],
        };
      }

      const input: EditInput = {
        prompt: args.prompt,
        inputImage: args.input,
        aspectRatio: args.aspect_ratio,
        resolution: args.resolution,
        outputFormat: args.output_format,
      };

      const result = await prov.edit(input, args.model);
      if (!result.success || result.images.length === 0) {
        return { content: [{ type: "text", text: `Error: ${result.error || "Edit failed"}` }] };
      }

      const sessionId = `s-${randomUUID().slice(0, 8)}`;
      const saved = saveImage(result.images[0], args.output, args.output_dir, sessionId);
      pushHistory({
        filePaths: [saved],
        prompt: args.prompt,
        provider: prov.info.name,
        model: args.model || prov.info.defaultModel,
        operation: "edit",
        inputImage: args.input,
        timestamp: Date.now(),
      }, { newSession: true, sessionId, outputDir: args.output_dir });
      return { content: buildImageContent(result.images, [saved]) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${msg}` }] };
    }
  }
);

// --- edit_last ---

server.tool(
  "edit_last",
  "Edit the last generated/edited image with new text instructions. Uses the output of the previous generate_image or edit_image call as input.",
  {
    prompt: z.string().describe("Edit instruction"),
    output: z.string().optional().describe("Output file path"),
    output_dir: z.string().optional().describe("Output directory"),
    aspect_ratio: z
      .enum(["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9"])
      .optional()
      .describe("Aspect ratio"),
    resolution: z.enum(["1K", "2K", "4K"]).optional().describe("Output resolution"),
    output_format: z.enum(["png", "jpeg", "webp"]).optional().describe("Output format"),
    model: z.string().optional().describe("Model name"),
    provider: z.string().optional().describe("Provider name"),
  },
  async (args) => {
    try {
      const active = getActiveEntry();
      if (!active) {
        return {
          content: [{ type: "text", text: "Error: No previous output found. Run generate_image or edit_image first." }],
        };
      }

      const prov = resolveProvider(args.provider);
      if (!prov.edit) {
        return {
          content: [{ type: "text", text: `Error: Provider "${prov.info.name}" does not support image editing` }],
        };
      }

      const input: EditInput = {
        prompt: args.prompt,
        inputImage: active.filePaths[0],
        aspectRatio: args.aspect_ratio,
        resolution: args.resolution,
        outputFormat: args.output_format,
      };

      const result = await prov.edit(input, args.model);
      if (!result.success || result.images.length === 0) {
        return { content: [{ type: "text", text: `Error: ${result.error || "Edit failed"}` }] };
      }

      const sessionId = loadHistory().activeSessionId;
      const sessionOutputDir = args.output_dir || getActiveSessionOutputDir();
      const saved = saveImage(result.images[0], args.output, sessionOutputDir, sessionId || undefined, true);
      pushHistory({
        filePaths: [saved],
        prompt: args.prompt,
        provider: prov.info.name,
        model: args.model || prov.info.defaultModel,
        operation: "edit",
        inputImage: active.filePaths[0],
        timestamp: Date.now(),
      }, { newSession: false });
      return { content: buildImageContent(result.images, [saved], { inputUsed: active.filePaths[0] }) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${msg}` }] };
    }
  }
);

// --- undo_edit ---
server.tool("undo_edit", "Undo the last edit, reverting to the previous image state", {}, async () => {
  try {
    const result = undoHistory();
    return {
      content: [{ type: "text", text: JSON.stringify({
        success: true,
        filePath: result.entry.filePaths[0],
        position: result.position,
        prompt: result.entry.prompt,
      })}],
    };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
  }
});

// --- redo_edit ---
server.tool("redo_edit", "Redo a previously undone edit", {}, async () => {
  try {
    const result = redoHistory();
    return {
      content: [{ type: "text", text: JSON.stringify({
        success: true,
        filePath: result.entry.filePaths[0],
        position: result.position,
        prompt: result.entry.prompt,
      })}],
    };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
  }
});

// --- edit_history ---
server.tool("edit_history", "Show the full edit history with all sessions", {}, async () => {
  const history = getHistory();
  return {
    content: [{ type: "text", text: JSON.stringify({
      activeSessionId: history.activeSessionId,
      sessions: history.sessions.map((s) => ({
        id: s.id,
        cursor: s.cursor,
        entries: s.entries.map((e) => ({
          operation: e.operation,
          prompt: e.prompt,
          provider: e.provider,
          filePaths: e.filePaths,
          timestamp: e.timestamp,
        })),
      })),
    })}],
  };
});

// --- switch_session ---
server.tool(
  "switch_session",
  "Switch to a different editing session to continue work on a previous image chain",
  { session_id: z.string().describe("Session ID to switch to (e.g. s-a1b2c3d4)") },
  async (args) => {
    try {
      switchSession(args.session_id);
      return { content: [{ type: "text", text: JSON.stringify({ success: true, activeSessionId: args.session_id }) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
    }
  }
);

// --- clear_history ---
server.tool(
  "clear_history",
  "Clear edit history for the current project. Files saved to custom output paths are never deleted — only files in managed directories (.imgx/ or ~/Pictures/imgx/).",
  {
    session_id: z.string().optional().describe("Session ID to clear. Omit to clear all sessions."),
    delete_files: z.boolean().optional().default(false).describe("Delete image files in managed directories only"),
  },
  async (args) => {
    try {
      const result = args.session_id
        ? clearSession(args.session_id)
        : clearHistory();
      let filesDeleted = 0;
      let skippedFiles = 0;
      if (args.delete_files) {
        const { existsSync, rmSync, rmdirSync } = await import("node:fs");
        const { dirname } = await import("node:path");
        const dirs = new Set<string>();
        for (const fp of result.filePaths) {
          if (!isManagedPath(fp)) { skippedFiles++; continue; }
          try {
            if (existsSync(fp)) { rmSync(fp); filesDeleted++; dirs.add(dirname(fp)); }
          } catch { /* skip */ }
        }
        for (const dir of dirs) {
          try { rmdirSync(dir); } catch { /* non-empty or missing */ }
        }
      }
      return { content: [{ type: "text", text: JSON.stringify({ success: true, cleared: true, filesDeleted, skippedFiles }) }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
    }
  }
);

// --- set_output_dir ---
server.tool(
  "set_output_dir",
  "Change the default output directory for generated images",
  {
    path: z.string().describe("New output directory path"),
    move_files: z.boolean().optional().default(false).describe("Move existing files to the new directory"),
  },
  async (args) => {
    try {
      const { loadConfig, saveConfig } = await import("../core/config.js");
      const { updateHistoryPaths } = await import("../core/history.js");
      const { resolve } = await import("node:path");
      const { homedir } = await import("node:os");
      const config = loadConfig();
      const oldDir = config.defaults?.outputDir || resolve(homedir(), "Pictures", "imgx");
      if (!config.defaults) config.defaults = {};
      config.defaults.outputDir = args.path;
      saveConfig(config);

      if (args.move_files && oldDir !== args.path) {
        const { mkdirSync, cpSync, rmSync, existsSync } = await import("node:fs");
        if (existsSync(oldDir)) {
          mkdirSync(args.path, { recursive: true });
          cpSync(oldDir, args.path, { recursive: true });
          rmSync(oldDir, { recursive: true, force: true });
          updateHistoryPaths(oldDir, args.path);
        }
      }

      return { content: [{ type: "text", text: JSON.stringify({
        success: true,
        outputDir: args.path,
        previousDir: oldDir || "(default)",
        filesMoved: args.move_files,
      })}]};
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }] };
    }
  }
);

// --- list_providers ---

server.tool(
  "list_providers",
  "List available image providers and their capabilities",
  {},
  async () => {
    const all = listProviders();
    const data = all.map((p) => ({
      name: p.info.name,
      models: p.info.models,
      defaultModel: p.info.defaultModel,
      capabilities: Array.from(p.info.capabilities),
      aspectRatios: p.info.aspectRatios,
      resolutions: p.info.resolutions || [],
    }));
    return {
      content: [{ type: "text", text: JSON.stringify({ providers: data }) }],
    };
  }
);

// --- 起動 ---

/** Convert a file:// URI to a local filesystem path */
function fileUriToPath(uri: string): string {
  try {
    return fileURLToPath(uri);
  } catch {
    // Fallback: strip file:/// prefix manually
    const stripped = uri.replace(/^file:\/\/\//, "");
    return decodeURIComponent(stripped);
  }
}

async function main() {
  const transport = new StdioServerTransport();

  // Wait for MCP initialization handshake before requesting roots
  server.server.oninitialized = async () => {
    try {
      const caps = server.server.getClientCapabilities();
      if (!caps?.roots) return;
      const result = await server.server.listRoots();
      if (result.roots.length > 0) {
        const rootUri = result.roots[0].uri;
        if (rootUri.startsWith("file://")) {
          setProjectRoot(fileUriToPath(rootUri));
        }
      }
    } catch {
      // Client does not support roots — fall back to .imgxrc detection
    }
  };

  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
