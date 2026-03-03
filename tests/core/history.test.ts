import { describe, it, expect } from "vitest";
import type {
  HistoryEntry,
  Session,
  OutputHistory,
  UndoRedoResult,
} from "../../src/core/history.js";

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
