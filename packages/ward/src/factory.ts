import type { CompiledEntry } from './_compile';
import type {
  BoundWardAllowedActionsInput,
  BoundWardDecisionInput,
  BoundWardRulesInScopeInput,
  BoundWard,
  Principal,
  UserPrincipal,
  WardAllowedActionsInput,
  Ward,
  WardCheck,
  WardConflict,
  WardDecisionInput,
  WardDecision,
  WardDecisionResult,
  WardOptions,
  WardRulesInScopeInput,
  WardRule,
  WardTrace,
  WardTraceCandidate,
} from './types';

import { compileEntry } from './_compile';
import { computeConflicts } from './_conflict';
import { assertUserPrincipal, isOverriddenBy, matchesRule, pickWinner, toDecision, validatePrincipal } from './_match';
import { WardConfigError } from './errors';

// ---------------------------------------------------------------------------
// Shared loop cores (validation-free; used by both public API and forUser)
// ---------------------------------------------------------------------------

function coreAllowedActions<TAction extends string, TData>(
  entries: CompiledEntry<TAction, TData>[],
  principal: Principal,
  resource: string,
  knownActions: readonly TAction[],
  data: TData | undefined,
): TAction[] {
  const seen = new Set<TAction>();
  const result: TAction[] = [];

  for (const action of knownActions) {
    if (seen.has(action)) continue;

    seen.add(action);

    const winner = pickWinner(entries, principal, resource, action, data);

    if (winner?.rule.effect === 'allow') result.push(action);
  }

  return result;
}

function coreRulesInScope<TAction extends string, TData>(
  entries: CompiledEntry<TAction, TData>[],
  principal: Principal,
  resource: string,
  data: TData | undefined,
): CompiledEntry<TAction, TData>['rule'][] {
  const skipPredicate = data === undefined;
  const result: CompiledEntry<TAction, TData>['rule'][] = [];

  for (const entry of entries) {
    if (!matchesRule(entry, principal, resource, undefined, data, skipPredicate)) continue;

    result.push(entry.rule);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an authorization ward from a set of rules.
 *
 * **Winner selection** when multiple rules match a request:
 * 1. Higher `priority` wins.
 * 2. On priority tie, higher specificity score wins (exact > namespace-wildcard > global-wildcard,
 *    applied independently to role, resource, and action).
 * 3. On specificity tie, `deny` beats `allow` (denyBonus tiebreaker).
 * 4. On absolute tie (identical priority, specificity, and effect), the rule declared
 *    **first in the input array** wins.
 */
export function createWard<TAction extends string = string, TData = unknown>(
  rules: readonly WardRule<TAction, TData>[] = [],
  options: WardOptions<TAction, TData> = {},
): Ward<TAction, TData> {
  const { logger, maxConflicts = Infinity } = options;
  const entries = rules.map((rule, i) => compileEntry(rule, i));

  // -------------------------------------------------------------------------
  // Core decision + logging
  // -------------------------------------------------------------------------

  function fireLogger(
    principal: Principal,
    resource: string,
    action: TAction,
    data: TData | undefined,
    decision: WardDecision<TAction, TData>,
  ): void {
    if (!logger) return;

    logger({ ...decision, action, data, principal, resource } as Parameters<typeof logger>[0]);
  }

  function evaluateAndLog(
    principal: Principal,
    resource: string,
    action: TAction,
    data: TData | undefined,
  ): WardDecision<TAction, TData> {
    const winner = pickWinner(entries, principal, resource, action, data);
    const decision = toDecision(winner);

    fireLogger(principal, resource, action, data, decision);

    return decision;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  // Request objects avoid call-site ambiguity between resource/action/data and
  // make later API growth additive instead of positional-breaking.

  function explain(input: WardDecisionInput<TAction, TData>): WardDecision<TAction, TData> {
    const { action, data, principal, resource } = input;

    validatePrincipal(principal);

    return evaluateAndLog(principal, resource, action, data);
  }

  function runCheckAll(
    principal: Principal,
    checks: readonly WardCheck<TAction, TData>[],
  ): WardDecisionResult<TAction, TData>[] {
    return checks.map((check) => ({
      ...evaluateAndLog(principal, check.resource, check.action, check.data),
      action: check.action,
      resource: check.resource,
    }));
  }

  function checkAll(
    principal: Principal,
    checks: readonly WardCheck<TAction, TData>[],
  ): WardDecisionResult<TAction, TData>[] {
    if (checks.length === 0) return [];

    validatePrincipal(principal);

    return runCheckAll(principal, checks);
  }

  function allowedActions(input: WardAllowedActionsInput<TAction, TData>): TAction[] {
    const { data, knownActions, principal, resource } = input;

    validatePrincipal(principal);

    return coreAllowedActions(entries, principal, resource, knownActions, data);
  }

  function rulesInScope(input: WardRulesInScopeInput<TData>): ReadonlyArray<Readonly<WardRule<TAction, TData>>> {
    const { data, principal, resource } = input;

    validatePrincipal(principal);

    return coreRulesInScope(entries, principal, resource, data);
  }

  function trace(input: WardDecisionInput<TAction, TData>): WardTrace<TAction, TData> {
    const { action, data, principal, resource } = input;

    validatePrincipal(principal);

    const matching: CompiledEntry<TAction, TData>[] = [];

    for (const entry of entries) {
      if (matchesRule(entry, principal, resource, action, data)) {
        matching.push(entry);
      }
    }

    let winner: CompiledEntry<TAction, TData> | undefined;

    for (const entry of matching) {
      if (!winner || isOverriddenBy(winner, entry)) winner = entry;
    }

    const decision = toDecision(winner);

    const candidates: WardTraceCandidate<TAction, TData>[] = matching.map((entry) => ({
      index: entry.index,
      priority: entry.priority,
      rule: entry.rule,
      score: entry.score,
      won: entry === winner,
    }));

    return { candidates, decision };
  }

  function forUser(principal: UserPrincipal): BoundWard<TAction, TData> {
    assertUserPrincipal(principal);

    const snap: UserPrincipal = {
      attributes: principal.attributes ? structuredClone(principal.attributes) : undefined,
      id: principal.id,
      roles: [...principal.roles],
    };

    return {
      allowedActions: (input: BoundWardAllowedActionsInput<TAction, TData>) =>
        coreAllowedActions(entries, snap, input.resource, input.knownActions, input.data),
      checkAll: (checks) => (checks.length === 0 ? [] : runCheckAll(snap, checks)),
      explain: (input: BoundWardDecisionInput<TAction, TData>) =>
        evaluateAndLog(snap, input.resource, input.action, input.data),
      rulesInScope: (input: BoundWardRulesInScopeInput<TData>) =>
        coreRulesInScope(entries, snap, input.resource, input.data),
      trace: (input: BoundWardDecisionInput<TAction, TData>) =>
        trace({ action: input.action, data: input.data, principal: snap, resource: input.resource }),
    };
  }

  // -------------------------------------------------------------------------
  // Conflict detection (lazy, cached)
  // -------------------------------------------------------------------------

  let conflictsCache: readonly WardConflict<TAction, TData>[] | undefined;

  function detectConflicts(): readonly WardConflict<TAction, TData>[] {
    return (conflictsCache ??= Object.freeze(computeConflicts(entries, maxConflicts)));
  }

  if (options.strict || options.onConflict) {
    const conflicts = detectConflicts();

    if (conflicts.length > 0) {
      if (options.onConflict) conflicts.forEach(options.onConflict);

      if (options.strict) {
        const details = conflicts
          .map((c) =>
            c.kind === 'duplicate'
              ? `Rule[${c.indexB}] ${c.kind} of Rule[${c.indexA}]`
              : `Rule[${c.shadowedIndex}] ${c.kind} by Rule[${c.shadowingIndex}]`,
          )
          .join('; ');

        throw new WardConfigError(`${conflicts.length} rule conflict(s) detected: ${details}`);
      }
    }
  }

  return { allowedActions, checkAll, detectConflicts, explain, forUser, rulesInScope, trace };
}
