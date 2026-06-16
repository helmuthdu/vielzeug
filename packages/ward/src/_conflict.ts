import type { CompiledEntry } from './_compile';
import type { WardConflict } from './types';

import { isOverriddenBy } from './_match';
import { ANONYMOUS, WILDCARD } from './constants';
import { patternCovers } from './resource';

// ---------------------------------------------------------------------------
// Role coverage helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if every principal that satisfies `narrowRoles` also satisfies `broadRoles`.
 */
function roleCoversRoles(broadRoles: readonly string[], narrowRoles: readonly string[]): boolean {
  const narrowHasAnonymous = narrowRoles.includes(ANONYMOUS);
  const narrowHasAuthenticated = narrowRoles.some((r) => r !== ANONYMOUS);

  if (narrowHasAnonymous && !broadRoles.includes(ANONYMOUS)) return false;

  if (narrowHasAuthenticated) {
    if (broadRoles.includes(WILDCARD)) return true;

    return narrowRoles.filter((r) => r !== ANONYMOUS).every((r) => broadRoles.includes(r));
  }

  return true;
}

function rolesSetsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;

  const setA = new Set(a);

  return b.every((r) => setA.has(r));
}

/** Returns true if every request that triggers `narrow` would also trigger `broad`. */
function ruleCovers<TAction extends string, TData>(
  broad: CompiledEntry<TAction, TData>,
  narrow: CompiledEntry<TAction, TData>,
): boolean {
  return (
    roleCoversRoles(broad.roles, narrow.roles) &&
    patternCovers(broad.rule.resource as string, narrow.rule.resource as string) &&
    patternCovers(broad.rule.action as string, narrow.rule.action as string)
  );
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

/**
 * Detects conflicts between compiled entries.
 *
 * @complexity O(n²) in the number of rules. Scales to hundreds of rules
 * with negligible overhead; for very large auto-generated policies, use `maxConflicts`.
 */
export function computeConflicts<TAction extends string, TData>(
  entries: CompiledEntry<TAction, TData>[],
  maxConflicts: number,
): WardConflict<TAction, TData>[] {
  const conflicts: WardConflict<TAction, TData>[] = [];

  for (let i = 0; i < entries.length && conflicts.length < maxConflicts; i++) {
    for (let j = i + 1; j < entries.length && conflicts.length < maxConflicts; j++) {
      const a = entries[i];
      const b = entries[j];

      if (
        !a.rule.when &&
        !b.rule.when &&
        rolesSetsEqual(a.roles, b.roles) &&
        a.rule.resource === b.rule.resource &&
        a.rule.action === b.rule.action
      ) {
        conflicts.push({
          indexA: a.index,
          indexB: b.index,
          kind: 'duplicate',
          ruleA: a.rule,
          ruleB: b.rule,
        });
        continue;
      }

      const bCanOverrideA = isOverriddenBy(a, b);

      if (!bCanOverrideA && !a.rule.when && ruleCovers(a, b)) {
        conflicts.push({
          kind: 'shadowed',
          shadowedIndex: b.index,
          shadowedRule: b.rule,
          shadowingIndex: a.index,
          shadowingRule: a.rule,
        });
      } else if (bCanOverrideA && !b.rule.when && ruleCovers(b, a)) {
        conflicts.push({
          kind: 'shadowed',
          shadowedIndex: a.index,
          shadowedRule: a.rule,
          shadowingIndex: b.index,
          shadowingRule: b.rule,
        });
      }
    }
  }

  return conflicts;
}
