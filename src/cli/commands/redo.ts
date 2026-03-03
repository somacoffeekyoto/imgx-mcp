import { redoHistory } from "../../core/history.js";
import * as out from "../output.js";

export function runRedo(): void {
  try {
    const result = redoHistory();
    out.success({
      filePath: result.entry.filePaths[0],
      position: result.position,
      prompt: result.entry.prompt,
    });
  } catch (err) {
    out.fail(err instanceof Error ? err.message : String(err));
  }
}
