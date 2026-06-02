/**
 * @vielzeug/clockwork — debug utilities for state machine visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugInterpret } from '@vielzeug/clockwork/debug';
 * ```
 */

import type { InterpretOptions, MachineConfig, MachineEvent, MachineInstance } from './types.js';

import { interpret } from './interpret.js';

/**
 * Wraps {@link interpret} and attaches a `console.group`-based debug logger
 * that traces every guard evaluation, transition, invoke lifecycle event, and
 * skipped transition to the browser/Node console.
 *
 * Equivalent to calling `interpret(definition, { debug: { onDebug, onTransition } })`
 * with pre-wired console output, but imported from a dedicated sub-path so the
 * logging code is tree-shaken from production bundles.
 *
 * @example
 * ```ts
 * import { debugInterpret } from '@vielzeug/clockwork/debug';
 *
 * const machine = debugInterpret(trafficLight, { context: { count: 0 } });
 * machine.send({ type: 'NEXT' });
 * // [clockwork:transition] NEXT: idle → running
 * ```
 */
export function debugInterpret<State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: Readonly<MachineConfig<State, Ctx, Ev>>,
  options: Omit<InterpretOptions<State, Ctx, Ev>, 'debug'> = {},
): MachineInstance<State, Ctx, Ev> {
  return interpret(definition, {
    ...options,
    debug: {
      onDebug(event) {
        switch (event.type) {
          case 'guard':
            console.debug(
              `[clockwork:guard] ${event.event.type}: ${event.from} → ${event.target} — ${event.passed ? 'passed' : 'blocked'}`,
            );
            break;
          case 'invoke-abort':
            console.debug(`[clockwork:invoke] #${event.invokeId} aborted in "${event.state}"`);
            break;
          case 'invoke-done':
            console.debug(`[clockwork:invoke] #${event.invokeId} done in "${event.state}"`);
            break;
          case 'invoke-error':
            console.debug(`[clockwork:invoke] #${event.invokeId} error in "${event.state}"`, event.error);
            break;
          case 'invoke-start':
            console.debug(`[clockwork:invoke] #${event.invokeId} started in "${event.state}"`);
            break;
          case 'transition-skipped':
            console.debug(`[clockwork:skip] ${event.event.type}: no matching transition in "${event.from}"`);
            break;
        }
      },
      onTransition(info) {
        console.group(`[clockwork:transition] ${info.event.type}: ${info.from} → ${info.to}`);
        console.groupEnd();
      },
    },
  });
}
