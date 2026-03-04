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
  createSession,
  pushHistory,
  getActiveEntry,
  getActiveSessionOutputDir,
  undoHistory,
  redoHistory,
  switchSession,
  getHistory,
  clearHistory,
  clearGlobalHistory,
  globalHistoryDir,
  updateHistoryPaths,
} from "../../src/core/history.js";
import { resetProjectRootCache } from "../../src/core/config.js";

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

describe("createSession", () => {
  it("generates ID matching s-[a-f0-9]{8} pattern", () => {
    const session = createSession();
    expect(session.id).toMatch(/^s-[a-f0-9]{8}$/);
    expect(session.entries).toHaveLength(0);
    expect(session.cursor).toBe(0);
  });

  it("generates unique IDs", () => {
    const s1 = createSession();
    const s2 = createSession();
    expect(s1.id).not.toBe(s2.id);
  });
});

describe("pushHistory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates new session for generate", () => {
    const entry = makeEntry({ prompt: "first generate" });
    const sessionId = pushHistory(entry, { newSession: true });

    expect(sessionId).toMatch(/^s-[a-f0-9]{8}$/);

    const history = loadHistory();
    expect(history.sessions).toHaveLength(1);
    expect(history.activeSessionId).toBe(sessionId);
    expect(history.sessions[0].entries).toHaveLength(1);
    expect(history.sessions[0].entries[0].prompt).toBe("first generate");
  });

  it("uses provided sessionId when creating new session", () => {
    const entry = makeEntry();
    const sessionId = pushHistory(entry, { newSession: true, sessionId: "s-custom01" });

    expect(sessionId).toBe("s-custom01");
    const history = loadHistory();
    expect(history.sessions[0].id).toBe("s-custom01");
  });

  it("appends edit to active session (newest first)", () => {
    const gen = makeEntry({ prompt: "generate", operation: "generate" });
    pushHistory(gen, { newSession: true });

    const edit = makeEntry({ prompt: "edit 1", operation: "edit", inputImage: "/tmp/img.png" });
    pushHistory(edit, { newSession: false });

    const history = loadHistory();
    expect(history.sessions[0].entries).toHaveLength(2);
    // newest first: index 0 is the latest
    expect(history.sessions[0].entries[0].prompt).toBe("edit 1");
    expect(history.sessions[0].entries[1].prompt).toBe("generate");
  });

  it("truncates entries after cursor on undo-then-edit", () => {
    // Push 3 entries
    const e1 = makeEntry({ prompt: "gen", timestamp: 1000 });
    pushHistory(e1, { newSession: true });

    const e2 = makeEntry({ prompt: "edit 1", timestamp: 2000 });
    pushHistory(e2, { newSession: false });

    const e3 = makeEntry({ prompt: "edit 2", timestamp: 3000 });
    pushHistory(e3, { newSession: false });

    // Simulate undo by setting cursor to 1 (pointing at edit 1)
    const history = loadHistory();
    history.sessions[0].cursor = 1;
    saveHistory(history);

    // Push new entry while in undo state
    const e4 = makeEntry({ prompt: "new edit", timestamp: 4000 });
    pushHistory(e4, { newSession: false });

    const updated = loadHistory();
    // "edit 2" (index 0, which was newer than cursor) should be removed
    // Now: new edit, edit 1, gen
    expect(updated.sessions[0].entries).toHaveLength(3);
    expect(updated.sessions[0].entries[0].prompt).toBe("new edit");
    expect(updated.sessions[0].entries[1].prompt).toBe("edit 1");
    expect(updated.sessions[0].entries[2].prompt).toBe("gen");
    expect(updated.sessions[0].cursor).toBe(0);
  });

  it("protects root entry when max entries exceeded", () => {
    // Create a session with a known ID
    const root = makeEntry({ prompt: "root", timestamp: 1000 });
    const sessionId = pushHistory(root, { newSession: true, sessionId: "s-maxtest1" });

    // Push 9 more entries to reach max of 10
    for (let i = 2; i <= 10; i++) {
      pushHistory(
        makeEntry({ prompt: `entry-${i}`, timestamp: i * 1000 }),
        { newSession: false }
      );
    }

    const beforeOverflow = loadHistory();
    expect(beforeOverflow.sessions[0].entries).toHaveLength(10);
    // Root is at index 9 (last position, oldest)
    expect(beforeOverflow.sessions[0].entries[9].prompt).toBe("root");

    // Push 11th entry - should evict entries[8] (second-to-last, just before root)
    pushHistory(
      makeEntry({ prompt: "entry-11", timestamp: 11000 }),
      { newSession: false }
    );

    const afterOverflow = loadHistory();
    expect(afterOverflow.sessions[0].entries).toHaveLength(10);
    // Root is still at the end
    expect(afterOverflow.sessions[0].entries[9].prompt).toBe("root");
    // Newest entry is at index 0
    expect(afterOverflow.sessions[0].entries[0].prompt).toBe("entry-11");
    // The second-to-last entry (entry-2) was evicted, not the root
    expect(afterOverflow.sessions[0].entries[8].prompt).not.toBe("entry-2");
  });

  it("returns sessionId", () => {
    const entry = makeEntry();
    const id = pushHistory(entry, { newSession: true });
    expect(id).toMatch(/^s-[a-f0-9]{8}$/);

    const id2 = pushHistory(makeEntry(), { newSession: false });
    expect(id2).toBe(id);
  });
});

describe("getActiveEntry", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns undefined when no history", () => {
    expect(getActiveEntry()).toBeUndefined();
  });

  it("returns cursor-position entry", () => {
    pushHistory(makeEntry({ prompt: "gen" }), { newSession: true });
    pushHistory(makeEntry({ prompt: "edit 1" }), { newSession: false });
    pushHistory(makeEntry({ prompt: "edit 2" }), { newSession: false });

    // cursor 0 = latest entry
    const latest = getActiveEntry();
    expect(latest?.prompt).toBe("edit 2");

    // Move cursor to 1
    const history = loadHistory();
    history.sessions[0].cursor = 1;
    saveHistory(history);

    const middle = getActiveEntry();
    expect(middle?.prompt).toBe("edit 1");

    // Move cursor to 2 (oldest)
    const h2 = loadHistory();
    h2.sessions[0].cursor = 2;
    saveHistory(h2);

    const oldest = getActiveEntry();
    expect(oldest?.prompt).toBe("gen");
  });
});

describe("undoHistory / redoHistory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("undo moves cursor and returns correct position string", () => {
    pushHistory(makeEntry({ prompt: "gen" }), { newSession: true });
    pushHistory(makeEntry({ prompt: "edit 1" }), { newSession: false });
    pushHistory(makeEntry({ prompt: "edit 2" }), { newSession: false });

    // 3 entries: [edit 2, edit 1, gen], cursor starts at 0
    const result = undoHistory();
    expect(result.entry.prompt).toBe("edit 1");
    expect(result.position).toBe("2/3");

    const result2 = undoHistory();
    expect(result2.entry.prompt).toBe("gen");
    expect(result2.position).toBe("3/3");
  });

  it("undo at oldest throws", () => {
    pushHistory(makeEntry({ prompt: "gen" }), { newSession: true });

    expect(() => undoHistory()).toThrow("Already at the oldest entry in this session");
  });

  it("redo moves cursor back", () => {
    pushHistory(makeEntry({ prompt: "gen" }), { newSession: true });
    pushHistory(makeEntry({ prompt: "edit 1" }), { newSession: false });
    pushHistory(makeEntry({ prompt: "edit 2" }), { newSession: false });

    // Undo twice
    undoHistory();
    undoHistory();

    // Redo once
    const result = redoHistory();
    expect(result.entry.prompt).toBe("edit 1");
    expect(result.position).toBe("2/3");

    // Redo again
    const result2 = redoHistory();
    expect(result2.entry.prompt).toBe("edit 2");
    expect(result2.position).toBe("1/3");
  });

  it("redo at latest throws", () => {
    pushHistory(makeEntry({ prompt: "gen" }), { newSession: true });
    pushHistory(makeEntry({ prompt: "edit 1" }), { newSession: false });

    expect(() => redoHistory()).toThrow("Already at the latest entry");
  });

  it("undo throws when no active session", () => {
    expect(() => undoHistory()).toThrow("No active session. Run generate first.");
  });

  it("redo throws when no active session", () => {
    expect(() => redoHistory()).toThrow("No active session. Run generate first.");
  });
});

describe("switchSession", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("switches active session", () => {
    const id1 = pushHistory(makeEntry({ prompt: "session 1" }), { newSession: true });
    const id2 = pushHistory(makeEntry({ prompt: "session 2" }), { newSession: true });

    expect(loadHistory().activeSessionId).toBe(id2);

    switchSession(id1);
    expect(loadHistory().activeSessionId).toBe(id1);
  });

  it("throws for unknown session ID", () => {
    pushHistory(makeEntry(), { newSession: true });

    expect(() => switchSession("s-xxxxx")).toThrow("Session not found: s-xxxxx");
  });
});

describe("getHistory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns the same result as loadHistory", () => {
    pushHistory(makeEntry({ prompt: "test" }), { newSession: true });

    const fromGet = getHistory();
    const fromLoad = loadHistory();

    expect(fromGet).toEqual(fromLoad);
  });
});

describe("clearHistory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("clears all sessions and sets activeSessionId to null", () => {
    pushHistory(makeEntry(), { newSession: true });
    pushHistory(makeEntry(), { newSession: true });

    clearHistory();

    const history = loadHistory();
    expect(history.sessions).toHaveLength(0);
    expect(history.activeSessionId).toBeNull();
  });

  it("returns all file paths from cleared entries", () => {
    pushHistory(
      makeEntry({ filePaths: ["/tmp/a.png", "/tmp/b.png"] }),
      { newSession: true },
    );
    pushHistory(
      makeEntry({ filePaths: ["/tmp/c.png"] }),
      { newSession: false },
    );
    pushHistory(
      makeEntry({ filePaths: ["/tmp/d.png"] }),
      { newSession: true },
    );

    const result = clearHistory();
    expect(result.filePaths).toContain("/tmp/a.png");
    expect(result.filePaths).toContain("/tmp/b.png");
    expect(result.filePaths).toContain("/tmp/c.png");
    expect(result.filePaths).toContain("/tmp/d.png");
    expect(result.filePaths).toHaveLength(4);
  });
});

describe("session outputDir", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("pushHistory stores outputDir on new session", () => {
    const entry = makeEntry({ prompt: "gen" });
    pushHistory(entry, { newSession: true, outputDir: "/custom/output" });

    const history = loadHistory();
    expect(history.sessions[0].outputDir).toBe("/custom/output");
  });

  it("pushHistory does not set outputDir when not provided", () => {
    const entry = makeEntry({ prompt: "gen" });
    pushHistory(entry, { newSession: true });

    const history = loadHistory();
    expect(history.sessions[0].outputDir).toBeUndefined();
  });

  it("getActiveSessionOutputDir returns session outputDir", () => {
    const entry = makeEntry({ prompt: "gen" });
    pushHistory(entry, { newSession: true, outputDir: "/my/dir" });

    expect(getActiveSessionOutputDir()).toBe("/my/dir");
  });

  it("getActiveSessionOutputDir returns undefined when no outputDir set", () => {
    const entry = makeEntry({ prompt: "gen" });
    pushHistory(entry, { newSession: true });

    expect(getActiveSessionOutputDir()).toBeUndefined();
  });

  it("getActiveSessionOutputDir returns undefined when no active session", () => {
    expect(getActiveSessionOutputDir()).toBeUndefined();
  });

  it("getActiveSessionOutputDir returns correct dir after switchSession", () => {
    pushHistory(makeEntry(), { newSession: true, outputDir: "/dir-a" });
    const id1 = loadHistory().activeSessionId!;

    pushHistory(makeEntry(), { newSession: true, outputDir: "/dir-b" });

    expect(getActiveSessionOutputDir()).toBe("/dir-b");

    switchSession(id1);
    expect(getActiveSessionOutputDir()).toBe("/dir-a");
  });
});

describe("updateHistoryPaths", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("replaces old base dir in filePaths and inputImage", () => {
    pushHistory(
      makeEntry({
        filePaths: ["/old/dir/img1.png", "/old/dir/img2.png"],
        inputImage: "/old/dir/source.png",
      }),
      { newSession: true },
    );
    pushHistory(
      makeEntry({
        filePaths: ["/old/dir/img3.png"],
        inputImage: null,
      }),
      { newSession: false },
    );

    updateHistoryPaths("/old/dir", "/new/dir");

    const history = loadHistory();
    const entries = history.sessions[0].entries;

    expect(entries[0].filePaths[0]).toBe("/new/dir/img3.png");
    expect(entries[0].inputImage).toBeNull();
    expect(entries[1].filePaths[0]).toBe("/new/dir/img1.png");
    expect(entries[1].filePaths[1]).toBe("/new/dir/img2.png");
    expect(entries[1].inputImage).toBe("/new/dir/source.png");
  });
});

describe("project-scoped history", () => {
  let projectDir: string;
  let globalDir: string;

  beforeEach(() => {
    projectDir = makeTmpDir();
    globalDir = makeTmpDir();
    // Create .imgxrc so findProjectRoot detects it
    const { writeFileSync } = require("node:fs");
    writeFileSync(join(projectDir, ".imgxrc"), "{}");
    process.env.IMGX_PROJECT_ROOT = projectDir;
    resetProjectRootCache();
    // Do NOT set IMGX_TEST_CONFIG_DIR — let historyDir() use project root
  });

  afterEach(() => {
    delete process.env.IMGX_PROJECT_ROOT;
    delete process.env.IMGX_TEST_CONFIG_DIR;
    resetProjectRootCache();
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(globalDir, { recursive: true, force: true });
  });

  it("saves history to project .imgx directory", () => {
    const entry = makeEntry({ prompt: "project test" });
    pushHistory(entry, { newSession: true });

    const historyPath = join(projectDir, ".imgx", "output-history.json");
    const { existsSync } = require("node:fs");
    expect(existsSync(historyPath)).toBe(true);

    const history = loadHistory();
    expect(history.sessions).toHaveLength(1);
    expect(history.sessions[0].entries[0].prompt).toBe("project test");
  });

  it("project history is independent from other projects", () => {
    const entry = makeEntry({ prompt: "project A" });
    pushHistory(entry, { newSession: true });

    // Switch to a different project
    const otherProject = makeTmpDir();
    const { writeFileSync } = require("node:fs");
    writeFileSync(join(otherProject, ".imgxrc"), "{}");
    process.env.IMGX_PROJECT_ROOT = otherProject;
    resetProjectRootCache();

    const history = loadHistory();
    expect(history.sessions).toHaveLength(0);

    // Clean up
    rmSync(otherProject, { recursive: true, force: true });
  });
});

describe("clearGlobalHistory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    process.env.IMGX_TEST_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    delete process.env.IMGX_TEST_CONFIG_DIR;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty filePaths when no global history exists", () => {
    const result = clearGlobalHistory();
    expect(result.filePaths).toHaveLength(0);
  });
});
