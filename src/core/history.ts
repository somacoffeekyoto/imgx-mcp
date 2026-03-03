import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";

// === History types for session-based undo/redo ===

export interface HistoryEntry {
  filePaths: string[];
  prompt: string;
  provider: string;
  model: string;
  operation: "generate" | "edit";
  inputImage: string | null;
  timestamp: number;
}

export interface Session {
  id: string;
  entries: HistoryEntry[];
  cursor: number;
}

export interface OutputHistory {
  sessions: Session[];
  activeSessionId: string | null;
  maxEntriesPerSession: number;
}

export interface UndoRedoResult {
  entry: HistoryEntry;
  position: string; // e.g. "2/5"
}

// === Internal helpers ===

const HISTORY_FILE = "output-history.json";

function historyDir(): string {
  if (process.env.IMGX_TEST_CONFIG_DIR) return process.env.IMGX_TEST_CONFIG_DIR;
  if (platform() === "win32") {
    return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "imgx");
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "imgx");
}

function historyPath(): string {
  return join(historyDir(), HISTORY_FILE);
}

function emptyHistory(): OutputHistory {
  return {
    sessions: [],
    activeSessionId: null,
    maxEntriesPerSession: 10,
  };
}

// === Public API ===

export function loadHistory(): OutputHistory {
  try {
    const raw = readFileSync(historyPath(), "utf-8");
    return JSON.parse(raw) as OutputHistory;
  } catch {
    return emptyHistory();
  }
}

export function saveHistory(history: OutputHistory): void {
  const dir = historyDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(historyPath(), JSON.stringify(history, null, 2) + "\n", "utf-8");
}
