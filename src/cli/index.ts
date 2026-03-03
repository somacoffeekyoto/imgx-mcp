import { parseArgs } from "node:util";
import { initGemini } from "../providers/gemini/index.js";
import { initOpenAI } from "../providers/openai/index.js";
import { getProvider, listProviders } from "../core/registry.js";
import { resolveDefault } from "../core/config.js";
import { getActiveEntry } from "../core/history.js";
import { runInit } from "./commands/init.js";
import { Capability } from "../core/types.js";
import { runGenerate } from "./commands/generate.js";
import { runEdit } from "./commands/edit.js";
import { runConfig } from "./commands/config.js";
import { runHistory } from "./commands/history.js";
import { runUndo } from "./commands/undo.js";
import { runRedo } from "./commands/redo.js";
import * as out from "./output.js";

const VERSION = "1.0.3";

const HELP = `imgx v${VERSION} — AI image generation and editing for MCP-compatible AI agents

Commands:
  generate      Generate image from text prompt
  edit          Edit existing image with text instructions
  undo          Undo last edit (move to previous state)
  redo          Redo (move to next state)
  history       Show edit history
  init          Create .imgxrc project config in current directory
  providers     List available providers
  capabilities  Show capabilities of current provider
  config        Manage configuration (API keys, defaults)

Usage:
  imgx generate -p "prompt" -o "./output.png"
  imgx edit -i "./input.png" -p "change background" -o "./output.png"
  imgx config set api-key <your-api-key> --provider gemini
  imgx config list

Options:
  -p, --prompt <text>        Image description (required)
  -o, --output <path>        Output file path
  -i, --input <path>         Input image for editing (edit command)
  -l, --last                 Use last output as input (edit command)
  -a, --aspect-ratio <ratio> Aspect ratio (e.g., 16:9, 1:1)
  -n, --count <number>       Number of images to generate
  -r, --resolution <size>    Resolution: 1K, 2K, 4K
  -f, --format <type>        Output format: png, jpeg, webp (OpenAI only)
  -m, --model <model>        Model name
  --provider <name>          Provider: gemini, openai (default: gemini)
  -d, --output-dir <dir>     Output directory
  -h, --help                 Show help
  -v, --version              Show version

Project config (.imgxrc):
  Place a .imgxrc file in your project directory to set defaults:
  {"defaults":{"model":"gemini-2.5-flash-image","outputDir":"./images"}}

Configuration:
  imgx config set api-key <key>   Save API key to config file
  imgx config set model <name>    Set default model
  imgx config list                Show all settings
  imgx config path                Show config file location

Environment variables (override config file):
  GEMINI_API_KEY             Gemini API key
  OPENAI_API_KEY             OpenAI API key
  IMGX_PROVIDER              Default provider
  IMGX_MODEL                 Default model
  IMGX_OUTPUT_DIR            Default output directory

History:
  imgx history                       Show all sessions and entries
  imgx history switch <session-id>   Switch to a different session
  imgx history clear                 Clear history (with confirmation)
  imgx history clear --yes           Clear history and delete files
  imgx history clear --keep-files    Clear history, keep image files
`;

function main(): void {
  // プロバイダ初期化
  initGemini();
  initOpenAI();

  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "-h" || command === "--help") {
    console.log(HELP);
    process.exit(0);
  }

  if (command === "-v" || command === "--version") {
    console.log(VERSION);
    process.exit(0);
  }

  if (command === "config") {
    runConfig(args.slice(1));
    return;
  }

  if (command === "init") {
    runInit();
    return;
  }

  if (command === "undo") {
    runUndo();
    return;
  }

  if (command === "redo") {
    runRedo();
    return;
  }

  if (command === "history") {
    runHistory(args.slice(1));
    return;
  }

  if (command === "providers") {
    const all = listProviders();
    if (all.length === 0) {
      out.fail("No providers configured. Set GEMINI_API_KEY or OPENAI_API_KEY to enable a provider.");
    }
    const data = all.map((p) => ({
      name: p.info.name,
      models: p.info.models,
      defaultModel: p.info.defaultModel,
      capabilities: Array.from(p.info.capabilities),
    }));
    out.success({ providers: data });
    return;
  }

  // コマンド引数をパース（command の後ろだけ）
  const cmdArgs = args.slice(1);

  const { values } = parseArgs({
    args: cmdArgs,
    options: {
      prompt: { type: "string", short: "p" },
      output: { type: "string", short: "o" },
      input: { type: "string", short: "i" },
      "aspect-ratio": { type: "string", short: "a" },
      count: { type: "string", short: "n" },
      resolution: { type: "string", short: "r" },
      format: { type: "string", short: "f" },
      model: { type: "string", short: "m" },
      provider: { type: "string" },
      "output-dir": { type: "string", short: "d" },
      last: { type: "boolean", short: "l" },
    },
    strict: false,
  });

  // プロバイダ解決（CLI フラグ → 環境変数 → config → デフォルト）
  const providerName =
    (values.provider as string) ||
    resolveDefault("provider") ||
    "gemini";

  const provider = getProvider(providerName);
  if (!provider) {
    const available = listProviders().map((p) => p.info.name).join(", ");
    out.fail(
      `Provider "${providerName}" not available.` +
        (available ? ` Available: ${available}` : " Set GEMINI_API_KEY to enable Gemini.")
    );
  }

  // モデル解決（CLI フラグ → 環境変数 → config → プロバイダデフォルト）
  const model =
    (values.model as string) ||
    resolveDefault("model") ||
    undefined;

  // capabilities コマンド
  if (command === "capabilities") {
    out.success({
      provider: provider.info.name,
      models: provider.info.models,
      defaultModel: provider.info.defaultModel,
      capabilities: Array.from(provider.info.capabilities),
      aspectRatios: provider.info.aspectRatios,
      resolutions: provider.info.resolutions || [],
    });
    return;
  }

  // prompt 必須チェック
  const prompt = values.prompt as string | undefined;
  if (!prompt) {
    out.fail("--prompt (-p) is required");
  }

  const commonArgs = {
    prompt,
    output: values.output as string | undefined,
    outputDir:
      (values["output-dir"] as string) ||
      resolveDefault("outputDir") ||
      undefined,
    aspectRatio:
      (values["aspect-ratio"] as string) ||
      resolveDefault("aspectRatio") ||
      undefined,
    resolution:
      (values.resolution as string) ||
      resolveDefault("resolution") ||
      undefined,
    outputFormat: (values.format as "png" | "jpeg" | "webp" | undefined) || undefined,
    model,
    count: values.count ? parseInt(values.count as string, 10) : undefined,
  };

  if (command === "generate") {
    runGenerate(provider, commonArgs);
    return;
  }

  if (command === "edit") {
    let inputImage = values.input as string | undefined;
    let isNewSession = false;

    if (inputImage) {
      isNewSession = true; // explicit -i → new session
    } else if (values.last) {
      const active = getActiveEntry();
      if (!active) {
        out.fail("No previous output found. Run generate or edit first, then use --last.");
      }
      inputImage = active.filePaths[0];
      isNewSession = false;
    }

    if (!inputImage) {
      out.fail("--input (-i) or --last (-l) is required for edit command");
    }
    runEdit(provider, { ...commonArgs, inputImage, isNewSession });
    return;
  }

  out.fail(`Unknown command: ${command}. Run "imgx --help" for usage.`);
}

main();
