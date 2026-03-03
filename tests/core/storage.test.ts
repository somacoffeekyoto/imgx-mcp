import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { saveImage } from "../../src/core/storage.js";

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
