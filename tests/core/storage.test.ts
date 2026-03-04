import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { saveImage, readImageAsBase64 } from "../../src/core/storage.js";
import { resetProjectRootCache } from "../../src/core/config.js";

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
