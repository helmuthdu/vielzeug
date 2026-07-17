import type { CompiledEntry } from './_compile';
import type { Principal, UserPrincipal, WardDecision, WardRule } from './types';

import { ANONYMOUS, WILDCARD } from './constants';
import { WardConfigError, WardPredicateError } from './errors';
import { matchesPattern } from './resource';

// ---------------------------------------------------------------------------
// Principal validation
// ---------------------------------------------------------------------------

/** Asserts that `input` is a valid `UserPrincipal`. Throws with a clear message otherwise. */
export function assertUserPrincipal(input: unknown): asserts input is UserPrincipal {
  if (typeof input !== 'object' || !input) {
    throw new WardConfigError('Invalid principal: expected { id: string, roles: string[] }');
  }

  const p = input as Record<string, unknown>;

  if (typeof p.id !== 'string' || !p.id.trim()) {
    throw new WardConfigError('Invalid principal: id must be a non-empty string');
  }

  if (!Array.isArray(p.roles) || p.roles.some((r) => typeof r !== 'string' || !(r as string).trim())) {
    throw new WardConfigError('Invalid principal: roles must be an array of non-empty strings');
  }
}

export function validatePrincipal(principal: Principal): void {
  if (principal !== null) {
    assertUserPrincipal(principal);
  }
}

// ---------------------------------------------------------------------------
// Role matching
// ---------------------------------------------------------------------------

/** Returns true if the principal's role set intersects with the rule's roles. */
export function principalMatchesRoles(roles: readonly string[], principal: Principal): boolean {
  if (principal === null) {
    return roles.includes(ANONYMOUS);
  }

  if (roles.every((r) => r === ANONYMOUS)) return false;

  if (roles.includes(WILDCARD)) return true;

  return roles.some((role) => principal.roles.includes(role));
}

// ---------------------------------------------------------------------------
// Rule matching
// ---------------------------------------------------------------------------

/**
 * Check whether a rule applies to a given request.
 *
 * @param action        - Pass `undefined` to skip the action check (used by `rulesInScope`).
 * @param data          - Data payload; passed to `when` predicates.
 * @param skipPredicate - When true, omit the `when` evaluation even when data is present.
 */
export function matchesRule<TAction extends string, TData>(
  entry: CompiledEntry<TAction, TData>,
  principal: Principal,
  resource: string,
  action: TAction | undefined,
  data: TData | undefined,
  skipPredicate = false,
): boolean {
  if (!principalMatchesRoles(entry.roles, principal)) return false;

  if (!matchesPattern(entry.rule.resource as string, resource)) return false;

  if (action !== undefined && !matchesPattern(entry.rule.action as string, action)) return false;

  if (skipPredicate || !entry.rule.when) return true;

  if (principal === null) return false;

  try {
    const result: unknown = entry.rule.when({ data, principal });

    if (result instanceof Promise) {
      throw new TypeError(
        `Rule[${entry.index}] when() returned a Promise. Async predicates are not supported — use a synchronous predicate.`,
      );
    }

    return result as boolean;
  } catch (err) {
    throw new WardPredicateError(entry.index, err);
  }
}

// ---------------------------------------------------------------------------
// Winner selection
// ---------------------------------------------------------------------------

/**
 * Returns true if `challenger` would displace `current` as the pickWinner result.
 */
export function isOverriddenBy<TAction extends string, TData>(
  current: CompiledEntry<TAction, TData>,
  challenger: CompiledEntry<TAction, TData>,
): boolean {
  return (
    challenger.priority > current.priority ||
    (challenger.priority === current.priority && challenger.score > current.score) ||
    (challenger.priority === current.priority &&
      challenger.score === current.score &&
      challenger.denyBonus > current.denyBonus)
  );
}

export function pickWinner<TAction extends string, TData>(
  entries: CompiledEntry<TAction, TData>[],
  principal: Principal,
  resource: string,
  action: TAction,
  data: TData | undefined,
): CompiledEntry<TAction, TData> | undefined {
  let winner: CompiledEntry<TAction, TData> | undefined;

  for (const entry of entries) {
    if (!matchesRule(entry, principal, resource, action, data)) continue;

    if (!winner || isOverriddenBy(winner, entry)) {
      winner = entry;
    }
  }

  return winner;
}

export function toDecision<TAction extends string, TData>(
  winner: CompiledEntry<TAction, TData> | undefined,
): WardDecision<TAction, TData> {
  if (!winner) return { allowed: false, reason: 'no-matching-rule' };

  if (winner.rule.effect === 'deny') {
    return { allowed: false, reason: 'explicit-deny', rule: winner.rule as Readonly<WardRule<TAction, TData>> };
  }

  return { allowed: true, rule: winner.rule as Readonly<WardRule<TAction, TData>> };
}
