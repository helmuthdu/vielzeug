import type { Command } from './types';

/**
 * Composes multiple commands into a single reversible command.
 *
 * `execute` runs all sub-commands in order. `rollback` runs them in reverse,
 * skipping any that have no rollback defined. The composed command counts as
 * one undo step.
 *
 * @example
 * await ledger.do(compose([
 *   { execute: () => { node.x = newX; }, rollback: () => { node.x = oldX; } },
 *   { execute: () => { node.y = newY; }, rollback: () => { node.y = oldY; } },
 * ], 'Move node'));
 */
export function compose<TData = unknown>(commands: Command<TData>[], label?: string): Command<TData> {
  const anyHasRollback = commands.some((c) => c.rollback != null);

  return {
    execute: async (signal) => {
      const done: Command<TData>[] = [];

      try {
        for (const c of commands) {
          await c.execute(signal);
          done.push(c);
        }
      } catch (err) {
        for (const c of [...done].reverse()) {
          try {
            await c.rollback?.(signal);
          } catch {
            // best-effort: suppress compensation errors
          }
        }

        throw err;
      }
    },
    label,
    rollback: anyHasRollback
      ? async (signal) => {
          let firstError: unknown;
          let hasError = false;

          for (const c of [...commands].reverse()) {
            try {
              await c.rollback?.(signal);
            } catch (err) {
              if (!hasError) {
                firstError = err;
                hasError = true;
              }
            }
          }

          if (hasError) throw firstError;
        }
      : undefined,
  };
}
