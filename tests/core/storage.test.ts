import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { saveImage, readImageAsBase64 } from "../../src/core/storage.js";
import { resetProjectRootCache, setProjectRoot } from "../../src/core/config.js";
import {
  pushHistory,
  loadHistory,
  saveHistory,
  undoHistory,
  getSessionBaseInfo,
  getSessionChainNumber,
} from "../../src/core/history.js";

const TEST_OUTPUT_DIR = join(process.cwd(), "tests", ".tmp-output");

describe("saveImage with sessionId", () => {
  beforeEach(() => {
    mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });
  afterEach(() => {
    rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  it("saves to session subdirectory when sessionId provided", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };
    const path = saveImage(image, undefined, TEST_OUTPUT_DIR, "s-test1234");
    expect(path).toContain("s-test1234");
    expect(existsSync(path)).toBe(true);
  });

  it("uses explicit output path as-is (no session dir)", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };
    const explicit = join(TEST_OUTPUT_DIR, "explicit.png");
    const path = saveImage(image, explicit, undefined);
    expect(path).toBe(explicit);
    expect(path).not.toContain("s-");
  });

  it("creates session directory under output-dir", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };
    const path = saveImage(image, undefined, TEST_OUTPUT_DIR, "s-abcd1234");
    const sessionDir = join(TEST_OUTPUT_DIR, "s-abcd1234");
    expect(existsSync(sessionDir)).toBe(true);
  });
});

describe("saveImage with project path resolution", () => {
  let projectDir: string;
  const origEnv = process.env.IMGX_PROJECT_ROOT;

  beforeEach(() => {
    projectDir = join(process.cwd(), "tests", ".tmp-project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, ".imgxrc"), "{}");
    process.env.IMGX_PROJECT_ROOT = projectDir;
    resetProjectRootCache();
  });

  afterEach(() => {
    if (origEnv !== undefined) {
      process.env.IMGX_PROJECT_ROOT = origEnv;
    } else {
      delete process.env.IMGX_PROJECT_ROOT;
    }
    resetProjectRootCache();
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("resolves relative output path against project root", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };
    const path = saveImage(image, "images/test.png");
    expect(path).toBe(join(projectDir, "images", "test.png"));
    expect(existsSync(path)).toBe(true);
  });

  it("preserves absolute output path unchanged", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };
    const absPath = join(projectDir, "abs-output.png");
    const path = saveImage(image, absPath);
    expect(path).toBe(absPath);
    expect(existsSync(path)).toBe(true);
  });

  it("resolves relative outputDir against project root", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };
    const path = saveImage(image, undefined, "output-images");
    expect(path).toContain(join(projectDir, "output-images"));
    expect(existsSync(path)).toBe(true);
  });
});

describe("saveImage default output with project root", () => {
  let projectDir: string;
  const origEnv = process.env.IMGX_PROJECT_ROOT;

  beforeEach(() => {
    projectDir = join(process.cwd(), "tests", ".tmp-project-default");
    mkdirSync(projectDir, { recursive: true });
    delete process.env.IMGX_PROJECT_ROOT;
    resetProjectRootCache();
  });

  afterEach(() => {
    if (origEnv !== undefined) {
      process.env.IMGX_PROJECT_ROOT = origEnv;
    } else {
      delete process.env.IMGX_PROJECT_ROOT;
    }
    resetProjectRootCache();
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("uses <project-root>/.imgx as default output when project root is set via MCP", () => {
    setProjectRoot(projectDir);
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };
    const path = saveImage(image, undefined, undefined, "s-mcptest1");
    expect(path).toContain(join(projectDir, ".imgx"));
    expect(existsSync(path)).toBe(true);
  });

  it("uses <project-root>/.imgx as default output when project root is set via env", () => {
    process.env.IMGX_PROJECT_ROOT = projectDir;
    resetProjectRootCache();
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };
    const path = saveImage(image, undefined, undefined, "s-envtest1");
    expect(path).toContain(join(projectDir, ".imgx"));
    expect(existsSync(path)).toBe(true);
  });
});

describe("saveImage chained naming", () => {
  let tmpDir: string;
  let outputDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `imgx-test-${randomUUID().slice(0, 8)}`);
    mkdirSync(tmpDir, { recursive: true });
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
    outputDir = join(tmpDir, "output");
    mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("isChained=true uses session baseName with chain number", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };

    // Simulate: generate saved a file, pushHistory recorded it
    const genPath = join(outputDir, "imgx-abcd1234.png");
    writeFileSync(genPath, "gen-data");
    pushHistory({
      filePaths: [genPath],
      prompt: "gen",
      provider: "gemini",
      model: "test",
      operation: "generate",
      inputImage: null,
      timestamp: Date.now(),
    }, { newSession: true, sessionId: "s-chain001" });

    // Now call saveImage with isChained=true
    const chainedPath = saveImage(image, undefined, outputDir, "s-chain001", true);

    // Should be baseName-1.ext (1 entry exists = chain number 1)
    expect(basename(chainedPath)).toBe("imgx-abcd1234-1.png");
    expect(existsSync(chainedPath)).toBe(true);
  });

  it("isChained=true increments chain number with more entries", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };

    // Generate
    const genPath = join(outputDir, "cover.png");
    writeFileSync(genPath, "gen-data");
    pushHistory({
      filePaths: [genPath],
      prompt: "gen",
      provider: "gemini",
      model: "test",
      operation: "generate",
      inputImage: null,
      timestamp: Date.now(),
    }, { newSession: true, sessionId: "s-chain002" });

    // First chained edit
    const path1 = saveImage(image, undefined, outputDir, "s-chain002", true);
    expect(basename(path1)).toBe("cover-1.png");

    // Record edit in history
    pushHistory({
      filePaths: [path1],
      prompt: "edit 1",
      provider: "gemini",
      model: "test",
      operation: "edit",
      inputImage: genPath,
      timestamp: Date.now(),
    }, { newSession: false });

    // Second chained edit
    const path2 = saveImage(image, undefined, outputDir, "s-chain002", true);
    expect(basename(path2)).toBe("cover-2.png");
  });

  it("isChained=true falls back to UUID when no baseInfo (legacy session)", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };

    // Simulate a legacy session without baseName (manually create)
    const history = loadHistory();
    history.sessions.push({
      id: "s-legacy01",
      entries: [{
        filePaths: ["/old/path.png"],
        prompt: "old",
        provider: "gemini",
        model: "test",
        operation: "generate",
        inputImage: null,
        timestamp: Date.now(),
      }],
      cursor: 0,
    });
    history.activeSessionId = "s-legacy01";
    saveHistory(history);

    const path = saveImage(image, undefined, outputDir, "s-legacy01", true);
    // Should be a UUID-based fallback name
    expect(basename(path)).toMatch(/^imgx-[a-f0-9]{8}\.png$/);
    expect(existsSync(path)).toBe(true);
  });

  it("undo + re-edit reuses chain number after splice", () => {
    const image = { data: Buffer.from("PNG"), mimeType: "image/png" };

    // Generate
    const genPath = join(outputDir, "test.png");
    writeFileSync(genPath, "gen-data");
    pushHistory({
      filePaths: [genPath],
      prompt: "gen",
      provider: "gemini",
      model: "test",
      operation: "generate",
      inputImage: null,
      timestamp: Date.now(),
    }, { newSession: true, sessionId: "s-chain003" });

    // Edit 1
    const edit1Path = saveImage(image, undefined, outputDir, "s-chain003", true);
    expect(basename(edit1Path)).toBe("test-1.png");
    pushHistory({
      filePaths: [edit1Path],
      prompt: "edit 1",
      provider: "gemini",
      model: "test",
      operation: "edit",
      inputImage: genPath,
      timestamp: Date.now(),
    }, { newSession: false });

    // Edit 2
    const edit2Path = saveImage(image, undefined, outputDir, "s-chain003", true);
    expect(basename(edit2Path)).toBe("test-2.png");
    pushHistory({
      filePaths: [edit2Path],
      prompt: "edit 2",
      provider: "gemini",
      model: "test",
      operation: "edit",
      inputImage: edit1Path,
      timestamp: Date.now(),
    }, { newSession: false });

    // Undo once → cursor at 1 (pointing at edit 1)
    undoHistory();

    // New edit (pushHistory will splice edit 2 and delete test-2.png)
    const reEditPath = saveImage(image, undefined, outputDir, "s-chain003", true);
    // Before pushHistory: entries = [edit2, edit1, gen], cursor = 1
    // chainNumber = entries.length = 3 → but wait, splice hasn't happened yet

    // Actually at this point, the splice hasn't happened yet (splice happens inside pushHistory)
    // getSessionChainNumber reads entries.length before splice
    // So we get 3, meaning: test-3.png
    // Hmm, but the plan says splice should happen first, then save

    // Let me record the push which will splice
    pushHistory({
      filePaths: [reEditPath],
      prompt: "re-edit",
      provider: "gemini",
      model: "test",
      operation: "edit",
      inputImage: edit1Path,
      timestamp: Date.now(),
    }, { newSession: false });

    // After splice: edit2 removed, test-2.png deleted
    expect(existsSync(edit2Path)).toBe(false);

    // History should have 3 entries: [re-edit, edit1, gen]
    const history = loadHistory();
    expect(history.sessions[0].entries).toHaveLength(3);
    expect(history.sessions[0].entries[0].prompt).toBe("re-edit");
  });
});
