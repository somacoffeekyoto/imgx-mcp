import { createInterface } from "node:readline";
import { rmSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { getHistory, switchSession, clearHistory } from "../../core/history.js";
import * as out from "../output.js";

export function runHistory(args: string[]): void {
  const sub = args[0];

  if (!sub) {
    showHistory();
    return;
  }

  if (sub === "switch") {
    const sessionId = args[1];
    if (!sessionId) out.fail("Usage: imgx history switch <session-id>");
    try {
      switchSession(sessionId);
      out.success({ activeSessionId: sessionId });
    } catch (err) {
      out.fail(err instanceof Error ? err.message : String(err));
    }
    return;
  }

  if (sub === "clear") {
    const hasYes = args.includes("--yes");
    const hasKeepFiles = args.includes("--keep-files");
    runClear(hasYes, hasKeepFiles);
    return;
  }

  out.fail(`Unknown history subcommand: ${sub}. Use: switch, clear`);
}

function showHistory(): void {
  const history = getHistory();
  if (history.sessions.length === 0) {
    out.success({ message: "No history", sessions: [] });
  }
  out.success({
    activeSessionId: history.activeSessionId,
    sessions: history.sessions.map((s) => ({
      id: s.id,
      active: s.id === history.activeSessionId,
      cursor: s.cursor,
      entries: s.entries.map((e, i) => ({
        index: i + 1,
        current: i === s.cursor && s.id === history.activeSessionId,
        operation: e.operation,
        prompt: e.prompt,
        provider: e.provider,
        filePaths: e.filePaths,
        timestamp: e.timestamp,
      })),
    })),
  });
}

function runClear(skipConfirm: boolean, keepFiles: boolean): void {
  const result = clearHistory();

  if (keepFiles || result.filePaths.length === 0) {
    out.success({ cleared: true, filesDeleted: 0 });
  }

  if (skipConfirm) {
    const deleted = deleteSessionFiles(result.filePaths);
    out.success({ cleared: true, filesDeleted: deleted });
  }

  // Interactive confirmation
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  rl.question(
    `Delete ${result.filePaths.length} image files? [y/N]: `,
    (answer) => {
      rl.close();
      if (answer.toLowerCase() === "y") {
        const deleted = deleteSessionFiles(result.filePaths);
        out.success({ cleared: true, filesDeleted: deleted });
      } else {
        out.success({ cleared: true, filesDeleted: 0 });
      }
    }
  );
}

function deleteSessionFiles(filePaths: string[]): number {
  let count = 0;
  const dirs = new Set<string>();
  for (const fp of filePaths) {
    try {
      if (existsSync(fp)) {
        rmSync(fp);
        count++;
        dirs.add(dirname(fp));
      }
    } catch { /* skip */ }
  }
  // Try to remove empty session directories
  for (const dir of dirs) {
    try { rmSync(dir, { recursive: false }); } catch { /* non-empty or missing */ }
  }
  return count;
}
