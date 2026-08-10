import type { CompiledEntry } from './_compile';

import { ANONYMOUS } from './constants';

const isDev = !(globalThis as { __WARD_PROD__?: boolean }).__WARD_PROD__;

/** @internal @security Messages may include user-supplied role names. */
function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/ward] ${msg}`);
}

/**
 * Emit a development-only warning when an ANONYMOUS-role rule has a `when` predicate.
 * The predicate is skipped for unauthenticated principals, so the rule can never match
 * anonymous requests — likely a policy authoring mistake.
 */
export function warnAnonymousPredicates<TAction extends string, TData>(
  entries: readonly CompiledEntry<TAction, TData>[],
): void {
  if (!isDev) return;

  for (const entry of entries) {
    if (!entry.rule.when) continue;

    const hasAnonymous = entry.roles.includes(ANONYMOUS);
    const hasOnlyAnonymous = hasAnonymous && entry.roles.length === 1;

    if (hasOnlyAnonymous) {
      warn(
        `Rule[${entry.index}] pairs role '${ANONYMOUS}' with a \`when\` predicate. ` +
          'Predicates are skipped for unauthenticated principals, so this rule can never match anonymous requests.',
      );
    }
  }
}
