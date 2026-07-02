/**
 * Formats a value caught from a `catch` block for display in the REPL's output panel.
 * Shared by every catch site in the execution pipeline (useReplExecution.run(),
 * executeReplCode()) so "how do we show an error" stays a single decision, not a
 * copy-pasted ternary that could drift between call sites.
 */
export function formatCaughtError(err: unknown): string {
  return err instanceof Error ? (err.stack ?? err.message) : String(err);
}
