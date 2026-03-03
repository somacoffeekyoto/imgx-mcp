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
