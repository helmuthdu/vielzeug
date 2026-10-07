import { type MaybeRefOrGetter, toValue } from 'vue';
import { type CommandResult, runCommand, type SubjectCommandArgs, type SubjectCommandName } from '../../app/store';
import type { SubjectRef } from '../../domain/types';

/**
 * The typed command dispatch every subject view shares: bind it to a `SubjectRef` (a value,
 * a ref or a getter) and call `command(name, ...args)` with the store's command names. The
 * ref is read per call, so a same-route id change never leaves commands pointed at a dead
 * subject. `runCommand` already reports a domain refusal as a toast and returns `undefined`,
 * which the wrapper passes straight through.
 */
export function useSubjectCommands(subject: MaybeRefOrGetter<SubjectRef | null>) {
  return function command<K extends SubjectCommandName>(
    name: K,
    ...args: SubjectCommandArgs<K>
  ): CommandResult<K> | undefined {
    const ref = toValue(subject);
    if (!ref) return undefined;
    return runCommand(name, ref, ...args);
  };
}
