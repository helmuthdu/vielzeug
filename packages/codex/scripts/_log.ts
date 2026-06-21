/** Consistent stderr logger for all codex scripts. Prefix is always "[codex]" for easy grep. */
export function log(msg: string): void {
  process.stderr.write(`[codex] ${msg}\n`);
}
