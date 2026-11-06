/**
 * Consistent stdout logger for all codex scripts. Prefix is always "[codex]" for easy grep.
 * stdout, not stderr: `prepare:data` runs inside `bun run build`, and the build treats any stderr
 * output as a warning worth surfacing (and CI surfaces it loudly). Failures are thrown, never logged.
 */
export function log(msg: string): void {
  process.stdout.write(`[codex] ${msg}\n`);
}
