import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import type {
  HistoryEntry,
  Session,
  OutputHistory,
  UndoRedoResult,
} from "../../src/core/history.js";
import {
  loadHistory,
  saveHistory,
} from "../../src/core/history.js";

function makeTmpDir(): string {
  const dir = join(tmpdir(), `imgx-test-${randomUUID().slice(0, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    filePaths: ["/tmp/img.png"],
    prompt: "a cat",
    provider: "gemini",
    model: "gemini-2.0-flash-preview-image-generation",
    operation: "generate",
    inputImage: null,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("history types", () => {
  it("HistoryEntry has required fields", () => {
    const entry: HistoryEntry = {
      filePaths: ["/tmp/img.png"],
      prompt: "a cat",
      provider: "gemini",
      model: "gemini-2.0-flash-preview-image-generation",
      operation: "generate",
      inputImage: null,
      timestamp: Date.now(),
    };
    expect(entry.operation).toBe("generate");
    expect(entry.inputImage).toBeNull();
  });

  it("Session has id, entries, and cursor", () => {
    const session: Session = {
      id: "s-abcd1234",
      entries: [],
      cursor: 0,
    };
    expect(session.id).toMatch(/^s-[a-f0-9]{8}$/);
    expect(session.entries).toHaveLength(0);
    expect(session.cursor).toBe(0);
  });

  it("OutputHistory has sessions, activeSessionId, maxEntriesPerSession", () => {
    const history: OutputHistory = {
      sessions: [],
      activeSessionId: null,
      maxEntriesPerSession: 10,
    };
    expect(history.sessions).toHaveLength(0);
    expect(history.activeSessionId).toBeNull();
    expect(history.maxEntriesPerSession).toBe(10);
  });

  it("UndoRedoResult has entry and position string", () => {
    const result: UndoRedoResult = {
      entry: {
        filePaths: ["/tmp/img.png"],
        prompt: "a cat",
        provider: "gemini",
        model: "gemini-2.0-flash-preview-image-generation",
        operation: "generate",
        inputImage: null,
        timestamp: Date.now(),
      },
      position: "2/5",
    };
    expect(result.position).toBe("2/5");
    expect(result.entry.prompt).toBe("a cat");
  });
});

describe("loadHistory / saveHistory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty history when file does not exist", () => {
    const history = loadHistory();
    expect(history.sessions).toHaveLength(0);
    expect(history.activeSessionId).toBeNull();
    expect(history.maxEntriesPerSession).toBe(10);
  });

  it("round-trips data correctly", () => {
    const entry = makeEntry();
    const history: OutputHistory = {
      sessions: [
        {
          id: "s-abcd1234",
          entries: [entry],
          cursor: 0,
        },
      ],
      activeSessionId: "s-abcd1234",
      maxEntriesPerSession: 10,
    };

    saveHistory(history);
    const loaded = loadHistory();

    expect(loaded.sessions).toHaveLength(1);
    expect(loaded.sessions[0].id).toBe("s-abcd1234");
    expect(loaded.sessions[0].entries).toHaveLength(1);
    expect(loaded.sessions[0].entries[0].prompt).toBe("a cat");
    expect(loaded.activeSessionId).toBe("s-abcd1234");
    expect(loaded.maxEntriesPerSession).toBe(10);
  });
});
