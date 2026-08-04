import type { Actor, MachineEvent, MachineSnapshot } from './types.js';

export type DebugActorOptions<State extends string, Context extends Record<string, unknown>> = {
  readonly logger?: (snapshot: MachineSnapshot<State, Context>) => void;
};

/**
 * Observes committed actor snapshots with `console.debug` without changing actor behavior.
 * Import from `@vielzeug/clockwork/devtools` so this development-only observability stays opt-in.
 */
export const debugActor = <State extends string, Context extends Record<string, unknown>, Event extends MachineEvent>(
  actor: Actor<State, Context, Event>,
  options: DebugActorOptions<State, Context> = {},
): (() => void) => {
  const logger =
    options.logger ?? ((snapshot: MachineSnapshot<State, Context>) => console.debug('[clockwork] snapshot', snapshot));

  return actor.subscribe((snapshot) => {
    try {
      logger(snapshot);
    } catch {
      // Observability must not affect the actor's error policy.
    }
  });
};
