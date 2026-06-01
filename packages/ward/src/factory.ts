import type {
  BoundWard,
  Principal,
  UserPrincipal,
  Ward,
  WardCheck,
  WardConflict,
  WardDecision,
  WardOptions,
  WardRule,
  WardRuleInput,
  WardTrace,
  WardTraceCandidate,
} from './types';

import { ANONYMOUS, WILDCARD } from './constants';
import { matchesPattern, patternCovers } from './resource';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A compiled entry stores the normalized rule plus pre-computed lookup values. */
type CompiledEntry<TAction extends string, TData> = {
  /** Deny bonus (1 for deny, 0 for allow): tiebreaker when priority and score match. */
  denyBonus: 0 | 1;
  /** Original rule index, used in predicate error messages. */
  index: number;
  /** Resolved priority (defaults to 0 when not authored). */
  priority: number;
  /** Normalized roles array (always an array). */
  roles: readonly string[];
  /** The normalized, frozen rule — role is always readonly string[]. */
  rule: WardRule<TAction, TData>;
  /** Specificity score (0–5): roleScore(0|1) + resourceScore(0|1|2) + actionScore(0|1|2). */
  score: number;
};

// ---------------------------------------------------------------------------
// Validation (module-scope pure functions)
// ---------------------------------------------------------------------------

function validateRuleInput<TAction extends string, TData>(rule: WardRuleInput<TAction, TData>, index: number): void {
  const at = `Rule[${index}]`;

  const roles = Array.isArray(rule.role) ? rule.role : [rule.role];

  if (roles.length === 0 || roles.some((r) => typeof r !== 'string' || !r.trim())) {
    throw new Error(`[ward] ${at}.role must be a non-empty string or non-empty array of strings`);
  }

  if (typeof rule.resource !== 'string' || !rule.resource.trim()) {
    throw new Error(`[ward] ${at}.resource must be a non-empty string`);
  }

  if ((rule.resource as string).endsWith(':')) {
    throw new Error(
      `[ward] ${at}.resource '${String(rule.resource)}' ends with ':' — did you mean '${String(rule.resource)}*'?`,
    );
  }

  if (typeof rule.action !== 'string' || !(rule.action as string).trim()) {
    throw new Error(`[ward] ${at}.action must be a non-empty string`);
  }

  if ((rule.action as string).endsWith(':')) {
    throw new Error(
      `[ward] ${at}.action '${String(rule.action)}' ends with ':' — did you mean '${String(rule.action)}*'?`,
    );
  }

  if (rule.effect !== 'allow' && rule.effect !== 'deny') {
    throw new Error(`[ward] ${at}.effect must be "allow" or "deny"`);
  }

  if (rule.priority !== undefined && (typeof rule.priority !== 'number' || !Number.isFinite(rule.priority))) {
    throw new Error(`[ward] ${at}.priority must be a finite number`);
  }

  if (rule.when !== undefined && typeof rule.when !== 'function') {
    throw new Error(`[ward] ${at}.when must be a function`);
  }
}

/** Asserts that `input` is a valid `UserPrincipal`. Throws with a clear message otherwise. */
function assertUserPrincipal(input: unknown): asserts input is UserPrincipal {
  if (typeof input !== 'object' || !input) {
    throw new Error('[ward] Invalid principal: expected { id: string, roles: string[] }');
  }

  const p = input as Record<string, unknown>;

  if (typeof p.id !== 'string' || !p.id.trim()) {
    throw new Error('[ward] Invalid principal: id must be a non-empty string');
  }

  if (!Array.isArray(p.roles) || p.roles.some((r) => typeof r !== 'string')) {
    throw new Error('[ward] Invalid principal: roles must be an array of strings');
  }
}

function validatePrincipal(principal: Principal): void {
  if (principal !== null) {
    assertUserPrincipal(principal);
  }
}

// ---------------------------------------------------------------------------
// Compilation (module-scope pure functions)
// ---------------------------------------------------------------------------

/**
 * Returns the specificity score for a single pattern field:
 * - 0: global wildcard (`*`)
 * - 1: namespace wildcard (e.g. `posts:*` or `read:*`)
 * - 2: exact string
 */
function patternScore(pattern: string): number {
  if (pattern === WILDCARD) return 0;

  if (pattern.endsWith(':*')) return 1;

  return 2;
}

/**
 * Specificity: role(0|1) + resource(0|1|2) + action(0|1|2) = max 5.
 * Higher score = more specific = wins ties in priority.
 */
function specificity<TAction extends string, TData>(rule: WardRule<TAction, TData>): number {
  const roleScore = rule.role.includes(WILDCARD) ? 0 : 1;

  return roleScore + patternScore(rule.resource as string) + patternScore(rule.action as string);
}

function compileEntry<TAction extends string, TData>(
  input: WardRuleInput<TAction, TData>,
  index: number,
): CompiledEntry<TAction, TData> {
  validateRuleInput(input, index);

  // Normalize role to readonly string[] and freeze the whole rule.
  const roles: readonly string[] = Object.freeze(Array.isArray(input.role) ? [...input.role] : [input.role]);

  const rule = Object.freeze({
    action: input.action,
    effect: input.effect,
    resource: input.resource,
    role: roles,
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.when !== undefined ? { when: input.when } : {}),
  }) as WardRule<TAction, TData>;

  const score = specificity(rule);
  const priority = rule.priority ?? 0;
  const denyBonus: 0 | 1 = rule.effect === 'deny' ? 1 : 0;

  return { denyBonus, index, priority, roles, rule, score };
}

// ---------------------------------------------------------------------------
// Matching (module-scope pure functions)
// ---------------------------------------------------------------------------

/** Returns true if the principal's role set intersects with the rule's roles. */
function principalMatchesRoles(roles: readonly string[], principal: Principal): boolean {
  if (principal === null) {
    return roles.includes(ANONYMOUS);
  }

  // Authenticated principal: a roles array composed entirely of ANONYMOUS never applies.
  if (roles.every((r) => r === ANONYMOUS)) return false;

  // WILDCARD role matches all authenticated principals.
  if (roles.includes(WILDCARD)) return true;

  return roles.some((role) => principal.roles.includes(role));
}

/**
 * Check whether a rule applies to a given request.
 *
 * @param action        - Pass `undefined` to skip the action check (used by `rulesInScope`).
 * @param data          - Data payload; passed to `when` predicates.
 * @param skipPredicate - When true, omit the `when` evaluation even when data is present.
 *                        Used by `rulesInScope` when called without a data argument so that
 *                        predicate-gated rules still appear in the scope list.
 */
function matchesRule<TAction extends string, TData>(
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

  // Predicates require an authenticated principal
  if (principal === null) return false;

  try {
    return entry.rule.when({ data, principal });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    throw new Error(`[ward] Predicate in Rule[${entry.index}] threw: ${msg}`, { cause: err });
  }
}

// ---------------------------------------------------------------------------
// Decision resolution (module-scope pure functions)
// ---------------------------------------------------------------------------

/**
 * Returns true if `challenger` would displace `current` as the pickWinner result.
 * Used both in winner selection and conflict detection.
 */
function isOverriddenBy<TAction extends string, TData>(
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

function pickWinner<TAction extends string, TData>(
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

function toDecision<TAction extends string, TData>(
  winner: CompiledEntry<TAction, TData> | undefined,
): WardDecision<TAction, TData> {
  if (!winner) return { allowed: false, reason: 'no-matching-rule' };

  if (winner.rule.effect === 'deny') {
    return { allowed: false, reason: 'explicit-deny', rule: winner.rule };
  }

  return { allowed: true, rule: winner.rule };
}

// ---------------------------------------------------------------------------
// Conflict detection helpers (module-scope pure functions)
// ---------------------------------------------------------------------------

/**
 * Returns true if every principal that satisfies `narrowRoles` also satisfies `broadRoles`.
 * ANONYMOUS and WILDCARD are handled as distinct tokens.
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

/**
 * Detects conflicts between compiled entries.
 *
 * @complexity O(n²) in the number of rules. Scales to hundreds of rules
 * with negligible overhead; for very large auto-generated policies, use `maxConflicts`.
 *
 * - `'duplicate'`:  identical (role set, resource, action) AND neither rule has a predicate.
 * - `'shadowed'`:   broad covers narrow AND the broad entry always wins rank comparison
 *                   AND the broad entry has no `when` predicate (a predicate could fail
 *                   at runtime, giving the covered rule a chance to fire).
 */
function computeConflicts<TAction extends string, TData>(
  entries: CompiledEntry<TAction, TData>[],
  maxConflicts: number,
): WardConflict<TAction, TData>[] {
  const conflicts: WardConflict<TAction, TData>[] = [];

  for (let i = 0; i < entries.length && conflicts.length < maxConflicts; i++) {
    for (let j = i + 1; j < entries.length && conflicts.length < maxConflicts; j++) {
      const a = entries[i];
      const b = entries[j];

      // Only flag as duplicate when neither rule has a predicate — predicate-gated rules
      // with identical (role, resource, action) apply to disjoint runtime request sets
      // and their overlap can only be determined at runtime, not statically.
      if (
        !a.rule.when &&
        !b.rule.when &&
        rolesSetsEqual(a.roles, b.roles) &&
        a.rule.resource === b.rule.resource &&
        a.rule.action === b.rule.action
      ) {
        conflicts.push({
          kind: 'duplicate',
          rule: b.rule,
          ruleIndex: b.index,
          shadowedBy: a.rule,
          shadowedByIndex: a.index,
        });
        continue;
      }

      const bCanOverrideA = isOverriddenBy(a, b);

      // A rule can only permanently shadow another when it has NO predicate —
      // if the shadowing rule has a `when` clause it may fail at runtime, allowing
      // the covered rule to fire.
      if (!bCanOverrideA && !a.rule.when && ruleCovers(a, b)) {
        conflicts.push({
          kind: 'shadowed',
          rule: b.rule,
          ruleIndex: b.index,
          shadowedBy: a.rule,
          shadowedByIndex: a.index,
        });
      } else if (bCanOverrideA && !b.rule.when && ruleCovers(b, a)) {
        conflicts.push({
          kind: 'shadowed',
          rule: a.rule,
          ruleIndex: a.index,
          shadowedBy: b.rule,
          shadowedByIndex: b.index,
        });
      }
    }
  }

  return conflicts;
}

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
): WardRule<TAction, TData>[] {
  const skipPredicate = data === undefined;
  const result: WardRule<TAction, TData>[] = [];

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
  rules: readonly WardRuleInput<TAction, TData>[] = [],
  options: WardOptions<TAction, TData> = {},
): Ward<TAction, TData> {
  const { logger, maxConflicts = Infinity } = options;
  const entries = rules.map((rule, i) => compileEntry(rule, i));

  // -------------------------------------------------------------------------
  // Core decision + logging
  // -------------------------------------------------------------------------

  function evaluateAndLog(
    principal: Principal,
    resource: string,
    action: TAction,
    data: TData | undefined,
  ): WardDecision<TAction, TData> {
    const winner = pickWinner(entries, principal, resource, action, data);
    const decision = toDecision(winner);

    if (logger) {
      if (decision.allowed) {
        logger({ action, data, decision: 'allow', principal, resource, rule: decision.rule });
      } else if (decision.reason === 'explicit-deny') {
        logger({ action, data, decision: 'explicit-deny', principal, resource, rule: decision.rule });
      } else {
        logger({ action, data, decision: 'no-matching-rule', principal, resource });
      }
    }

    return decision;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  function can(principal: Principal, resource: string, action: TAction, data?: TData): boolean {
    validatePrincipal(principal);

    return evaluateAndLog(principal, resource, action, data).allowed;
  }

  function explain(
    principal: Principal,
    resource: string,
    action: TAction,
    data?: TData,
  ): WardDecision<TAction, TData> {
    validatePrincipal(principal);

    return evaluateAndLog(principal, resource, action, data);
  }

  function canAll(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean {
    if (actions.length === 0) return true;

    validatePrincipal(principal);

    return actions.every((action) => evaluateAndLog(principal, resource, action, data).allowed);
  }

  function canAny(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean {
    if (actions.length === 0) return false;

    validatePrincipal(principal);

    return actions.some((action) => evaluateAndLog(principal, resource, action, data).allowed);
  }

  function checkAll(
    principal: Principal,
    checks: readonly WardCheck<TAction, TData>[],
  ): WardDecision<TAction, TData>[] {
    if (checks.length === 0) return [];

    validatePrincipal(principal);

    return checks.map((check) => evaluateAndLog(principal, check.resource, check.action, check.data));
  }

  function allowedActions(
    principal: Principal,
    resource: string,
    knownActions: readonly TAction[],
    data?: TData,
  ): TAction[] {
    validatePrincipal(principal);

    return coreAllowedActions(entries, principal, resource, knownActions, data);
  }

  function rulesInScope(principal: Principal, resource: string, data?: TData): WardRule<TAction, TData>[] {
    validatePrincipal(principal);

    return coreRulesInScope(entries, principal, resource, data);
  }

  function trace(principal: Principal, resource: string, action: TAction, data?: TData): WardTrace<TAction, TData> {
    validatePrincipal(principal);

    // Collect all matching entries without short-circuiting
    const matching: CompiledEntry<TAction, TData>[] = [];

    for (const entry of entries) {
      if (matchesRule(entry, principal, resource, action, data)) {
        matching.push(entry);
      }
    }

    // Determine winner among matching entries
    let winner: CompiledEntry<TAction, TData> | undefined;

    for (const entry of matching) {
      if (!winner || isOverriddenBy(winner, entry)) winner = entry;
    }

    const decision = toDecision(winner);

    if (logger) {
      if (decision.allowed) {
        logger({ action, data, decision: 'allow', principal, resource, rule: decision.rule });
      } else if (decision.reason === 'explicit-deny') {
        logger({ action, data, decision: 'explicit-deny', principal, resource, rule: decision.rule });
      } else {
        logger({ action, data, decision: 'no-matching-rule', principal, resource });
      }
    }

    const candidates: WardTraceCandidate<TAction, TData>[] = matching.map((entry) => ({
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
      allowedActions: (resource, knownActions, data?) =>
        coreAllowedActions(entries, snap, resource, knownActions, data),
      can: (resource, action, data?) => evaluateAndLog(snap, resource, action, data).allowed,
      canAll: (resource, actions, data?) => {
        if (actions.length === 0) return true;

        return actions.every((action) => evaluateAndLog(snap, resource, action, data).allowed);
      },
      canAny: (resource, actions, data?) => {
        if (actions.length === 0) return false;

        return actions.some((action) => evaluateAndLog(snap, resource, action, data).allowed);
      },
      checkAll: (checks) => {
        if (checks.length === 0) return [];

        return checks.map((check) => evaluateAndLog(snap, check.resource, check.action, check.data));
      },
      explain: (resource, action, data?) => evaluateAndLog(snap, resource, action, data),
      rulesInScope: (resource, data?) => coreRulesInScope(entries, snap, resource, data),
      trace: (resource, action, data?) => trace(snap, resource, action, data),
    };
  }

  // -------------------------------------------------------------------------
  // Conflict detection (lazy, cached)
  // -------------------------------------------------------------------------

  let conflictsCache: WardConflict<TAction, TData>[] | undefined;

  function detectConflicts(): WardConflict<TAction, TData>[] {
    return (conflictsCache ??= computeConflicts(entries, maxConflicts));
  }

  if (options.strict || options.onConflict) {
    const conflicts = detectConflicts();

    if (conflicts.length > 0) {
      if (options.onConflict) conflicts.forEach(options.onConflict);

      if (options.strict) {
        const details = conflicts.map((c) => `Rule[${c.ruleIndex}] ${c.kind} by Rule[${c.shadowedByIndex}]`).join('; ');

        throw new Error(`[ward] ${conflicts.length} rule conflict(s) detected: ${details}`);
      }
    }
  }

  return { allowedActions, can, canAll, canAny, checkAll, detectConflicts, explain, forUser, rulesInScope, trace };
}
