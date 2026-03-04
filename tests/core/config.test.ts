import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import {
  findProjectRoot,
  resolveProjectPath,
  loadProjectConfig,
  resetProjectRootCache,
} from "../../src/core/config.js";

function makeTmpDir(): string {
  const dir = join(tmpdir(), `imgx-test-${randomUUID().slice(0, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("findProjectRoot", () => {
  let tmpDir: string;
  const origCwd = process.cwd;
  const origEnv = process.env.IMGX_PROJECT_ROOT;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    delete process.env.IMGX_PROJECT_ROOT;
    resetProjectRootCache();
  });

  afterEach(() => {
    process.cwd = origCwd;
    if (origEnv !== undefined) {
      process.env.IMGX_PROJECT_ROOT = origEnv;
    } else {
      delete process.env.IMGX_PROJECT_ROOT;
    }
    resetProjectRootCache();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("detects .imgxrc in the given directory", () => {
    writeFileSync(join(tmpDir, ".imgxrc"), '{"defaults":{}}');
    const result = findProjectRoot(tmpDir);
    expect(result).toBe(tmpDir);
  });

  it("walks up to parent directory to find .imgxrc", () => {
    writeFileSync(join(tmpDir, ".imgxrc"), '{"defaults":{}}');
    const sub = join(tmpDir, "sub", "deep");
    mkdirSync(sub, { recursive: true });
    const result = findProjectRoot(sub);
    expect(result).toBe(tmpDir);
  });

  it("returns null when no .imgxrc exists", () => {
    const result = findProjectRoot(tmpDir);
    expect(result).toBeNull();
  });

  it("uses IMGX_PROJECT_ROOT env var when set", () => {
    process.env.IMGX_PROJECT_ROOT = "/custom/root";
    const result = findProjectRoot(tmpDir);
    expect(result).toBe("/custom/root");
  });

  it("caches the result after first call", () => {
    writeFileSync(join(tmpDir, ".imgxrc"), '{"defaults":{}}');
    const first = findProjectRoot(tmpDir);
    // Remove .imgxrc — cache should still return the same result
    rmSync(join(tmpDir, ".imgxrc"));
    const second = findProjectRoot(tmpDir);
    expect(second).toBe(first);
  });

  it("resetProjectRootCache clears the cache", () => {
    writeFileSync(join(tmpDir, ".imgxrc"), '{"defaults":{}}');
    findProjectRoot(tmpDir);
    resetProjectRootCache();
    rmSync(join(tmpDir, ".imgxrc"));
    const result = findProjectRoot(tmpDir);
    expect(result).toBeNull();
  });
});

describe("resolveProjectPath", () => {
  let tmpDir: string;
  const origEnv = process.env.IMGX_PROJECT_ROOT;

  beforeEach(() => {
    tmpDir = makeTmpDir();
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
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns absolute paths unchanged", () => {
    const abs = "/some/absolute/path.png";
    expect(resolveProjectPath(abs)).toBe(abs);
  });

  it("resolves relative path against project root when .imgxrc exists", () => {
    writeFileSync(join(tmpDir, ".imgxrc"), "{}");
    process.env.IMGX_PROJECT_ROOT = tmpDir;
    const result = resolveProjectPath("images/test.png");
    expect(result).toBe(join(tmpDir, "images", "test.png"));
  });

  it("resolves relative path against CWD when no project root", () => {
    // No IMGX_PROJECT_ROOT, no .imgxrc in tree
    const result = resolveProjectPath("images/test.png");
    expect(result).toBe(join(process.cwd(), "images", "test.png"));
  });
});

describe("loadProjectConfig", () => {
  let tmpDir: string;
  const origEnv = process.env.IMGX_PROJECT_ROOT;

  beforeEach(() => {
    tmpDir = makeTmpDir();
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
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads config from project root .imgxrc", () => {
    writeFileSync(join(tmpDir, ".imgxrc"), JSON.stringify({ defaults: { model: "test-model" } }));
    process.env.IMGX_PROJECT_ROOT = tmpDir;
    const config = loadProjectConfig();
    expect(config.defaults?.model).toBe("test-model");
  });

  it("returns empty config when no project root", () => {
    const config = loadProjectConfig();
    expect(config).toEqual({});
  });
});
