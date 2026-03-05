import { createInterface } from "node:readline";
import { existsSync, readdirSync, cpSync, rmSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { loadConfig, saveConfig, getConfigPath } from "../../core/config.js";
import { updateHistoryPaths } from "../../core/history.js";
import * as out from "../output.js";

/** Extract --provider <name> from args, returning the provider name and remaining args */
function extractProvider(args: string[]): { provider: string; rest: string[] } {
  const rest: string[] = [];
  let provider = "gemini";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--provider" && i + 1 < args.length) {
      provider = args[i + 1];
      i++; // skip value
    } else {
      rest.push(args[i]);
    }
  }
  return { provider, rest };
}

export function runConfig(args: string[]): void {
  const sub = args[0];

  if (!sub || sub === "list") {
    showAll();
    return;
  }

  if (sub === "set") {
    const { provider, rest } = extractProvider(args.slice(1));
    const hasYes = rest.includes("--yes");
    const hasNoMove = rest.includes("--no-move");
    const filtered = rest.filter((a) => a !== "--yes" && a !== "--no-move");
    const key = filtered[0];
    const value = filtered[1];
    if (!key || !value) {
      out.fail('Usage: imgx config set <key> <value> [--provider <name>]\n  Keys: api-key, provider, model, output-dir, aspect-ratio, resolution');
    }
    if (key === "output-dir") {
      setOutputDir(value, hasYes, hasNoMove);
      return;
    }
    setKey(key, value, provider);
    return;
  }

  if (sub === "get") {
    const { provider, rest } = extractProvider(args.slice(1));
    const key = rest[0];
    if (!key) {
      out.fail("Usage: imgx config get <key> [--provider <name>]");
    }
    getKey(key, provider);
    return;
  }

  if (sub === "path") {
    out.success({ path: getConfigPath() });
    return;
  }

  out.fail(`Unknown config subcommand: ${sub}. Use: list, set, get, path`);
}

function setKey(key: string, value: string, provider: string): void {
  const config = loadConfig();

  switch (key) {
    case "api-key": {
      if (!config.providers) config.providers = {};
      if (!config.providers[provider]) config.providers[provider] = {};
      config.providers[provider]!.apiKey = value;
      break;
    }
    case "provider": {
      if (!config.defaults) config.defaults = {};
      config.defaults.provider = value;
      break;
    }
    case "model": {
      if (!config.defaults) config.defaults = {};
      config.defaults.model = value;
      break;
    }
    case "output-dir": {
      if (!config.defaults) config.defaults = {};
      config.defaults.outputDir = value;
      break;
    }
    case "aspect-ratio": {
      if (!config.defaults) config.defaults = {};
      config.defaults.aspectRatio = value;
      break;
    }
    case "resolution": {
      if (!config.defaults) config.defaults = {};
      config.defaults.resolution = value;
      break;
    }
    default:
      out.fail(`Unknown key: ${key}. Valid keys: api-key, provider, model, output-dir, aspect-ratio, resolution`);
  }

  saveConfig(config);
  out.success({ key, status: "saved" });
}

function setOutputDir(newDir: string, skipConfirm: boolean, noMove: boolean): void {
  const config = loadConfig();
  const oldDir = config.defaults?.outputDir || resolve(homedir(), "Pictures", "imgx");
  const resolvedNew = resolve(newDir);

  // Update config
  if (!config.defaults) config.defaults = {};
  config.defaults.outputDir = resolvedNew;
  saveConfig(config);

  // If --no-move or same directory, just save config
  if (noMove || oldDir === resolvedNew) {
    out.success({ key: "output-dir", status: "saved", outputDir: resolvedNew });
    return;
  }

  // Check if old directory exists and has files
  if (!existsSync(oldDir)) {
    out.success({ key: "output-dir", status: "saved", outputDir: resolvedNew });
    return;
  }

  let fileCount = 0;
  let sessionCount = 0;
  try {
    const items = readdirSync(oldDir);
    for (const item of items) {
      if (item.startsWith("s-")) sessionCount++;
    }
    fileCount = items.length;
  } catch {
    out.success({ key: "output-dir", status: "saved", outputDir: resolvedNew });
    return;
  }

  if (fileCount === 0) {
    out.success({ key: "output-dir", status: "saved", outputDir: resolvedNew });
    return;
  }

  if (skipConfirm) {
    moveFiles(oldDir, resolvedNew);
    out.success({ key: "output-dir", status: "saved", outputDir: resolvedNew, filesMoved: true });
    return;
  }

  // Interactive confirmation
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  process.stderr.write(`Current output directory: ${oldDir} (${sessionCount} sessions)\n`);
  rl.question(`Move existing files to ${resolvedNew}? [y/N]: `, (answer) => {
    rl.close();
    if (answer.toLowerCase() === "y") {
      moveFiles(oldDir, resolvedNew);
      out.success({ key: "output-dir", status: "saved", outputDir: resolvedNew, filesMoved: true });
    } else {
      out.success({ key: "output-dir", status: "saved", outputDir: resolvedNew, filesMoved: false });
    }
  });
}

function moveFiles(oldDir: string, newDir: string): void {
  mkdirSync(newDir, { recursive: true });
  cpSync(oldDir, newDir, { recursive: true });
  rmSync(oldDir, { recursive: true, force: true });
  updateHistoryPaths(oldDir, newDir);
}

function getKey(key: string, provider: string): void {
  const config = loadConfig();

  switch (key) {
    case "api-key": {
      const val = config.providers?.[provider]?.apiKey;
      // Mask the API key for safety
      const masked = val ? val.slice(0, 6) + "..." + val.slice(-4) : undefined;
      out.success({ key, provider, value: masked ?? null });
      return;
    }
    case "provider":
      out.success({ key, value: config.defaults?.provider ?? null });
      return;
    case "model":
      out.success({ key, value: config.defaults?.model ?? null });
      return;
    case "output-dir":
      out.success({ key, value: config.defaults?.outputDir ?? null });
      return;
    case "aspect-ratio":
      out.success({ key, value: config.defaults?.aspectRatio ?? null });
      return;
    case "resolution":
      out.success({ key, value: config.defaults?.resolution ?? null });
      return;
    default:
      out.fail(`Unknown key: ${key}. Valid keys: api-key, provider, model, output-dir, aspect-ratio, resolution`);
  }
}

function showAll(): void {
  const config = loadConfig();
  const providerKeys: Record<string, string> = {};
  if (config.providers) {
    for (const [name, prov] of Object.entries(config.providers)) {
      if (prov?.apiKey) providerKeys[name] = "(set)";
    }
  }
  out.success({
    configPath: getConfigPath(),
    apiKeys: Object.keys(providerKeys).length > 0 ? providerKeys : "(none set)",
    defaults: config.defaults ?? {},
  });
}
