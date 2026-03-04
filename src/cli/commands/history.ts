import { createInterface } from "node:readline";
import { rmSync, rmdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { getHistory, switchSession, clearHistory, clearGlobalHistory } from "../../core/history.js";
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
    const hasAll = args.includes("--all");
    runClear(hasYes, hasKeepFiles, hasAll);
    return;
  }

  out.fail(`Unknown history subcommand: ${sub}. Use: switch, clear`);
}

function showHistory(): void {
  const history = getHistory();
  if (history.sessions.length === 0) {
    return out.success({ message: "No history", sessions: [] });
  }
  return out.success({
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

function runClear(skipConfirm: boolean, keepFiles: boolean, clearAll: boolean): void {
  if (clearAll) {
    runClearAll(keepFiles);
    return;
  }

  const result = clearHistory();

  if (keepFiles || result.filePaths.length === 0) {
    return out.success({ cleared: true, filesDeleted: 0 });
  }

  if (skipConfirm) {
    const deleted = deleteSessionFiles(result.filePaths);
    return out.success({ cleared: true, filesDeleted: deleted });
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

function runClearAll(keepFiles: boolean): void {
  // --all always requires interactive confirmation (never skippable)
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  rl.question(
    "This will clear ALL history (project + global) across all projects. Continue? [y/N]: ",
    (answer) => {
      rl.close();
      if (answer.toLowerCase() !== "y") {
        out.success({ cleared: false, message: "Aborted" });
        return;
      }

      const projectResult = clearHistory();
      const globalResult = clearGlobalHistory();
      const allFiles = [...projectResult.filePaths, ...globalResult.filePaths];

      if (keepFiles || allFiles.length === 0) {
        return out.success({ cleared: true, scope: "all", filesDeleted: 0 });
      }

      const deleted = deleteSessionFiles(allFiles);
      out.success({ cleared: true, scope: "all", filesDeleted: deleted });
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
    try { rmdirSync(dir); } catch { /* non-empty or missing */ }
  }
  return count;
}
