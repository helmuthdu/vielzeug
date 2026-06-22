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
export function compose(commands: Command[], label?: string): Command {
  const anyHasRollback = commands.some((c) => c.rollback != null);

  return {
    execute: async () => {
      const done: Command[] = [];

      try {
        for (const c of commands) {
          await c.execute();
          done.push(c);
        }
      } catch (err) {
        for (const c of [...done].reverse()) {
          try {
            await c.rollback?.();
          } catch {
            // best-effort: suppress compensation errors
          }
        }

        throw err;
      }
    },
    label,
    rollback: anyHasRollback
      ? async () => {
          let firstError: unknown;
          let hasError = false;

          for (const c of [...commands].reverse()) {
            try {
              await c.rollback?.();
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
