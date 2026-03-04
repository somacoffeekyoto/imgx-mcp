import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { homedir, platform } from "node:os";
import { randomUUID } from "node:crypto";
import { findProjectRoot } from "./config.js";

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
  outputDir?: string;
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

export function globalHistoryDir(): string {
  if (platform() === "win32") {
    return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "imgx");
  }
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "imgx");
}

export function historyDir(): string {
  if (process.env.IMGX_TEST_CONFIG_DIR) return process.env.IMGX_TEST_CONFIG_DIR;
  const projectRoot = findProjectRoot();
  if (projectRoot) return join(projectRoot, ".imgx");
  return globalHistoryDir();
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

export function createSession(): Session {
  return {
    id: `s-${randomUUID().slice(0, 8)}`,
    entries: [],
    cursor: 0,
  };
}

export function pushHistory(
  entry: HistoryEntry,
  opts: { newSession: boolean; sessionId?: string; outputDir?: string },
): string {
  const history = loadHistory();

  if (opts.newSession) {
    const session = createSession();
    if (opts.sessionId) session.id = opts.sessionId;
    if (opts.outputDir) session.outputDir = opts.outputDir;
    session.entries.push(entry);
    history.sessions.push(session);
    history.activeSessionId = session.id;
    saveHistory(history);
    return session.id;
  }

  // Append to active session
  const session = history.sessions.find((s) => s.id === history.activeSessionId);
  if (!session) throw new Error("No active session. Run generate first.");

  // If cursor > 0 (in undo state), delete entries newer than cursor position
  if (session.cursor > 0) {
    session.entries.splice(0, session.cursor);
    session.cursor = 0;
  }

  // Prepend new entry (newest first)
  session.entries.unshift(entry);

  // Enforce max entries per session, protect root (last entry)
  while (session.entries.length > history.maxEntriesPerSession) {
    // Remove second-to-last entry (index length - 2), preserving root at the end
    session.entries.splice(session.entries.length - 2, 1);
  }

  saveHistory(history);
  return session.id;
}

export function getActiveEntry(): HistoryEntry | undefined {
  const history = loadHistory();
  if (!history.activeSessionId) return undefined;

  const session = history.sessions.find((s) => s.id === history.activeSessionId);
  if (!session || session.entries.length === 0) return undefined;

  return session.entries[session.cursor];
}

export function getActiveSessionOutputDir(): string | undefined {
  const history = loadHistory();
  if (!history.activeSessionId) return undefined;
  const session = history.sessions.find((s) => s.id === history.activeSessionId);
  return session?.outputDir;
}

function getActiveSession(): { history: OutputHistory; session: Session } {
  const history = loadHistory();
  if (!history.activeSessionId) {
    throw new Error("No active session. Run generate first.");
  }
  const session = history.sessions.find((s) => s.id === history.activeSessionId);
  if (!session) {
    throw new Error("No active session. Run generate first.");
  }
  return { history, session };
}

export function undoHistory(): UndoRedoResult {
  const { history, session } = getActiveSession();
  const maxCursor = session.entries.length - 1;

  if (session.cursor >= maxCursor) {
    throw new Error("Already at the oldest entry in this session");
  }

  session.cursor += 1;
  saveHistory(history);

  return {
    entry: session.entries[session.cursor],
    position: `${session.cursor + 1}/${session.entries.length}`,
  };
}

export function redoHistory(): UndoRedoResult {
  const { history, session } = getActiveSession();

  if (session.cursor <= 0) {
    throw new Error("Already at the latest entry");
  }

  session.cursor -= 1;
  saveHistory(history);

  return {
    entry: session.entries[session.cursor],
    position: `${session.cursor + 1}/${session.entries.length}`,
  };
}

export function switchSession(sessionId: string): void {
  const history = loadHistory();
  const session = history.sessions.find((s) => s.id === sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  history.activeSessionId = sessionId;
  saveHistory(history);
}

export function getHistory(): OutputHistory {
  return loadHistory();
}

export function clearHistory(): { filePaths: string[] } {
  const history = loadHistory();
  const filePaths: string[] = [];

  for (const session of history.sessions) {
    for (const entry of session.entries) {
      filePaths.push(...entry.filePaths);
    }
  }

  history.sessions = [];
  history.activeSessionId = null;
  saveHistory(history);

  return { filePaths };
}

export function clearSession(sessionId: string): { filePaths: string[] } {
  const history = loadHistory();
  const idx = history.sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) throw new Error(`Session not found: ${sessionId}`);
  const [removed] = history.sessions.splice(idx, 1);
  const filePaths: string[] = [];
  for (const entry of removed.entries) filePaths.push(...entry.filePaths);
  if (history.activeSessionId === sessionId) history.activeSessionId = null;
  saveHistory(history);
  return { filePaths };
}

export function isManagedPath(filePath: string): boolean {
  const normalized = resolve(filePath);
  const projectManaged = resolve(historyDir());
  const globalManaged = resolve(join(homedir(), "Pictures", "imgx"));
  return (
    normalized.startsWith(projectManaged + sep) ||
    normalized === projectManaged ||
    normalized.startsWith(globalManaged + sep) ||
    normalized === globalManaged
  );
}

export function clearGlobalHistory(): { filePaths: string[] } {
  const globalPath = join(globalHistoryDir(), HISTORY_FILE);
  try {
    const raw = readFileSync(globalPath, "utf-8");
    const history = JSON.parse(raw) as OutputHistory;
    const filePaths: string[] = [];
    for (const session of history.sessions) {
      for (const entry of session.entries) filePaths.push(...entry.filePaths);
    }
    const dir = globalHistoryDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(globalPath, JSON.stringify(emptyHistory(), null, 2) + "\n", "utf-8");
    return { filePaths };
  } catch {
    return { filePaths: [] };
  }
}

export function updateHistoryPaths(oldBase: string, newBase: string): void {
  const history = loadHistory();

  for (const session of history.sessions) {
    for (const entry of session.entries) {
      entry.filePaths = entry.filePaths.map((p) =>
        p.startsWith(oldBase) ? newBase + p.slice(oldBase.length) : p,
      );
      if (entry.inputImage && entry.inputImage.startsWith(oldBase)) {
        entry.inputImage = newBase + entry.inputImage.slice(oldBase.length);
      }
    }
  }

  saveHistory(history);
}
