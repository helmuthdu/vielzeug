/**
 * @vielzeug/clockwork — debug utilities for state machine visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugMachine } from '@vielzeug/clockwork/devtools';
 * ```
 */

import type { InterpretOptions, MachineConfig, MachineEvent, MachineInstance } from './types.js';

import { createMachine } from './interpret.js';

/**
 * Wraps {@link createMachine} and attaches a `console.group`-based debug logger
 * that traces every guard evaluation, transition, invoke lifecycle event, and
 * skipped transition to the browser/Node console.
 *
 * **Development only.** Do not use in production — event payloads (including
 * any PII in context or event fields) are written to the console. Import from
 * the dedicated sub-path so the logging code is tree-shaken from production bundles.
 *
 * @example
 * ```ts
 * import { debugMachine } from '@vielzeug/clockwork/devtools';
 *
 * const m = debugMachine(trafficLight);
 * m.send({ type: 'NEXT' });
 * // [clockwork:transition] NEXT: idle → running
 * ```
 */
export function debugMachine<State extends string, Ctx extends object, Ev extends MachineEvent>(
  definition: MachineConfig<State, Ctx, Ev>,
  options: Omit<InterpretOptions<State, Ctx, Ev>, 'onDebug'> = {},
): MachineInstance<State, Ctx, Ev> {
  return createMachine(definition).start({
    ...options,
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
        case 'transition':
          console.debug(`[clockwork:transition] ${event.event.type}: ${event.from} → ${event.to}`);
          break;
        case 'transition-skipped':
          console.debug(`[clockwork:skip] ${event.event.type}: no matching transition in "${event.from}"`);
          break;
      }
    },
  } as InterpretOptions<State, Ctx, Ev>);
}
