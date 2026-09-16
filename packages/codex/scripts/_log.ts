/**
 * Consistent stdout logger for all codex scripts. Prefix is always "[codex]" for easy grep.
 * stdout, not stderr: `prepare:data` runs inside `rush build`, and Rush treats any stderr output
 * as a build warning (non-zero exit). Failures are thrown, never logged.
 */
export function log(msg: string): void {
  process.stdout.write(`[codex] ${msg}\n`);
}
