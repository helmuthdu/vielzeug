import type { CommandContext, ReversibleCommand } from './types';

function snapshotCommand<TMeta>(command: ReversibleCommand<TMeta>): ReversibleCommand<TMeta> {
  const { apply, label, meta, revert } = command;

  return { apply, label, meta, revert };
}

/**
 * Composes reversible commands into one reversible command.
 *
 * `apply` runs each child in order. `revert` runs children in reverse order.
 * A failed child application compensates completed children before rethrowing.
 *
 * @example
 * await ledger.do(compose([
 *   { apply: () => { node.x = newX; }, revert: () => { node.x = oldX; } },
 *   { apply: () => { node.y = newY; }, revert: () => { node.y = oldY; } },
 * ], 'Move node'));
 */
export function compose<TMeta = undefined>(
  commands: readonly ReversibleCommand<TMeta>[],
  label?: string,
): ReversibleCommand<TMeta> {
  const steps = commands.map(snapshotCommand);

  return {
    apply: async (context: CommandContext) => {
      const applied: ReversibleCommand<TMeta>[] = [];

      try {
        for (const command of steps) {
          await command.apply(context);
          applied.push(command);
        }
      } catch (error) {
        const compensationFailures: unknown[] = [];

        for (const command of [...applied].reverse()) {
          try {
            await command.revert(context);
          } catch (compensationError) {
            compensationFailures.push(compensationError);
          }
        }

        if (compensationFailures.length > 0) {
          throw new AggregateError([error, ...compensationFailures], 'Command application and compensation failed', {
            cause: error,
          });
        }

        throw error;
      }
    },
    label,
    revert: async (context: CommandContext) => {
      const failures: unknown[] = [];

      for (const command of [...steps].reverse()) {
        try {
          await command.revert(context);
        } catch (error) {
          failures.push(error);
        }
      }

      if (failures.length > 0) throw new AggregateError(failures, 'Command reversion failed');
    },
  };
}
