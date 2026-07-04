import type { ShortcutStep } from './parser';
import type { BindingEntry } from './types';

import { canonicalizeShortcut, parseShortcut } from './parser';

export interface ConflictOptions {
  modKey?: 'ctrl' | 'meta';
  trigger?: 'keydown' | 'keyup';
}

function isPrefixOf(shorter: readonly ShortcutStep[], longer: readonly ShortcutStep[]): boolean {
  if (shorter.length > longer.length) return false;

  return canonicalizeShortcut(shorter) === canonicalizeShortcut(longer.slice(0, shorter.length));
}

/**
 * Finds registered bindings that would conflict with a proposed shortcut — an exact duplicate, a
 * shorter binding that would shadow it as a chord prefix, or a longer binding it would itself
 * shadow. Only compares against entries sharing the same `trigger` — `'keydown'` and `'keyup'`
 * chords are matched independently and never conflict with each other.
 *
 * @example
 * const entries = map.listBindings();
 * findShortcutConflicts('g g', entries); // → the entry for 'g', if one is bound
 */
export function findShortcutConflicts(
  shortcut: string,
  entries: readonly BindingEntry[],
  options: ConflictOptions = {},
): BindingEntry[] {
  const { modKey, trigger = 'keydown' } = options;
  const steps = parseShortcut(shortcut, modKey);

  // An empty/whitespace-only shortcut parses to zero steps, which would otherwise be treated as
  // a trivial prefix of every entry — never report that as a conflict.
  if (steps.length === 0) return [];

  return entries.filter(
    (entry) => entry.trigger === trigger && (isPrefixOf(steps, entry.shortcut) || isPrefixOf(entry.shortcut, steps)),
  );
}
