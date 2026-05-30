import type {
  BoundWard,
  Ward,
  WardCheck,
  WardConflict,
  WardDecision,
  WardOptions,
  WardRule,
  Principal,
  UserPrincipal,
} from './types';

import { ANONYMOUS, WILDCARD } from './constants';
import { matchesPattern } from './resource';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A compiled entry stores the authored rule plus pre-computed lookup values. */
type CompiledEntry<TAction extends string, TData> = {
  /** Deny bonus (1 for deny, 0 for allow): tiebreaker when priority and score match. */
  denyBonus: 0 | 1;
  /** Original rule index, used in predicate error messages. */
  index: number;
  /** Resolved priority (defaults to 0 when not authored). */
  priority: number;
  /** Normalized roles array (always an array internally). */
  roles: readonly string[];
  /** The authored rule, frozen so it can be returned directly without cloning. */
  rule: Readonly<WardRule<TAction, TData>>;
  /** Specificity score (0–5): roleScore(0|1) + resourceScore(0|1|2) + actionScore(0|1|2). */
  score: number;
};

// ---------------------------------------------------------------------------
// Validation (module-scope pure functions)
// ---------------------------------------------------------------------------

function validateRule<TAction extends string, TData>(rule: WardRule<TAction, TData>, index: number): void {
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
function specificity<TAction extends string, TData>(rule: WardRule<TAction, TData>, roles: readonly string[]): number {
  const roleScore = roles.includes(WILDCARD) ? 0 : 1;

  return roleScore + patternScore(rule.resource as string) + patternScore(rule.action as string);
}

function compileEntry<TAction extends string, TData>(
  rule: WardRule<TAction, TData>,
  index: number,
): CompiledEntry<TAction, TData> {
  validateRule(rule, index);

  // Freeze the role array and rule so they can be returned directly without
  // defensive cloning on every decision call.
  const frozenRole = Array.isArray(rule.role) ? Object.freeze([...rule.role]) : rule.role;

  const snapshot = Object.freeze({ ...rule, role: frozenRole }) as Readonly<WardRule<TAction, TData>>;

  const roles: readonly string[] = Array.isArray(frozenRole)
    ? (frozenRole as readonly string[])
    : [frozenRole as string];
  const score = specificity(snapshot, roles);
  const priority = snapshot.priority ?? 0;
  const denyBonus = snapshot.effect === 'deny' ? 1 : 0;

  return {
    denyBonus,
    index,
    priority,
    roles,
    rule: snapshot,
    score,
  };
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
 * Returns true if `challenger` would displace `current` as the pickWinner result.
 * Used both in pickWinner and conflict detection.
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

/**
 * Returns true if every principal that satisfies `narrowRoles` also satisfies `broadRoles`.
 * ANONYMOUS and WILDCARD are handled as distinct tokens.
 */
function roleCoversRoles(broadRoles: readonly string[], narrowRoles: readonly string[]): boolean {
  const narrowHasAnonymous = narrowRoles.includes(ANONYMOUS);
  const narrowHasAuthenticated = narrowRoles.some((r) => r !== ANONYMOUS);

  // broad must cover the anonymous case if narrow can fire for null principals
  if (narrowHasAnonymous && !broadRoles.includes(ANONYMOUS)) return false;

  if (narrowHasAuthenticated) {
    // WILDCARD covers all authenticated principals
    if (broadRoles.includes(WILDCARD)) return true;

    // Every non-anonymous role in narrow must be present in broad
    return narrowRoles.filter((r) => r !== ANONYMOUS).every((r) => broadRoles.includes(r));
  }

  return true;
}

/** Returns true if every request that triggers `narrow` would also trigger `broad`. */
function ruleCovers<TAction extends string, TData>(
  broad: CompiledEntry<TAction, TData>,
  narrow: CompiledEntry<TAction, TData>,
): boolean {
  return (
    roleCoversRoles(broad.roles, narrow.roles) &&
    matchesPattern(broad.rule.resource as string, narrow.rule.resource as string) &&
    matchesPattern(broad.rule.action as string, narrow.rule.action as string)
  );
}

function rolesSetsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;

  const setA = new Set(a);

  return b.every((r) => setA.has(r));
}

/**
 * Detects conflicts between compiled entries.
 *
 * For entries at positions i < j (a before b in the scan order):
 * - `'duplicate'`: identical (role set, resource, action) — b can never fire.
 * - `'shadowed'`:  broad covers narrow AND the broad entry always wins rank comparison.
 */
function computeConflicts<TAction extends string, TData>(
  entries: CompiledEntry<TAction, TData>[],
): WardConflict<TAction, TData>[] {
  const conflicts: WardConflict<TAction, TData>[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]; // earlier in scan order
      const b = entries[j];

      // Exact duplicate: identical normalized (roles, resource, action) — b can never win
      if (rolesSetsEqual(a.roles, b.roles) && a.rule.resource === b.rule.resource && a.rule.action === b.rule.action) {
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

      // a always wins over b AND a's scope covers b's scope → a shadows b
      if (!bCanOverrideA && ruleCovers(a, b)) {
        conflicts.push({
          kind: 'shadowed',
          rule: b.rule,
          ruleIndex: b.index,
          shadowedBy: a.rule,
          shadowedByIndex: a.index,
        });
      } else if (bCanOverrideA && ruleCovers(b, a)) {
        // b always wins over a AND b's scope covers a's scope → b shadows a
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
// Factory
// ---------------------------------------------------------------------------

export function createWard<TAction extends string = string, TData = unknown>(
  rules: readonly WardRule<TAction, TData>[] = [],
  options: WardOptions<TAction, TData> = {},
): Ward<TAction, TData> {
  const { logger } = options;
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
      logger({
        action,
        data,
        decision: decision.allowed ? 'allow' : decision.reason,
        principal,
        resource,
        rule: 'rule' in decision ? decision.rule : undefined,
      });
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

  function rulesInScope(principal: Principal, resource: string, data?: TData): WardRule<TAction, TData>[] {
    validatePrincipal(principal);

    // When no data is provided we still want predicate-gated rules to appear
    // in the scope list (the predicate isn't evaluated; the rule is shown as-is).
    const skipPredicate = data === undefined;
    const result: WardRule<TAction, TData>[] = [];

    for (const entry of entries) {
      if (!matchesRule(entry, principal, resource, undefined, data, skipPredicate)) continue;

      result.push(entry.rule);
    }

    return result;
  }

  function forUser(principal: UserPrincipal): BoundWard<TAction, TData> {
    assertUserPrincipal(principal);

    // Snapshot the principal at bind time — mutations to the caller's object
    // must not affect decisions made through the bound view.
    const snap: UserPrincipal = {
      attributes: principal.attributes ? structuredClone(principal.attributes) : undefined,
      id: principal.id,
      roles: [...principal.roles],
    };

    // Delegate directly to internal functions, bypassing repeated principal
    // validation since the snapshot is already validated and immutable in practice.
    return {
      allowedActions: (resource, knownActions, data?) => {
        const seen = new Set<TAction>();
        const result: TAction[] = [];

        for (const action of knownActions) {
          if (seen.has(action)) continue;

          seen.add(action);

          const winner = pickWinner(entries, snap, resource, action, data);

          if (winner?.rule.effect === 'allow') result.push(action);
        }

        return result;
      },
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
      detectConflicts,
      explain: (resource, action, data?) => evaluateAndLog(snap, resource, action, data),
      rulesInScope: (resource, data?) => {
        const skipPredicate = data === undefined;
        const result: WardRule<TAction, TData>[] = [];

        for (const entry of entries) {
          if (!matchesRule(entry, snap, resource, undefined, data, skipPredicate)) continue;

          result.push(entry.rule);
        }

        return result;
      },
    };
  }

  // -------------------------------------------------------------------------
  // Conflict detection (lazy, cached)
  // -------------------------------------------------------------------------

  let conflictsCache: WardConflict<TAction, TData>[] | undefined;

  function detectConflicts(): WardConflict<TAction, TData>[] {
    return (conflictsCache ??= computeConflicts(entries));
  }

  // Eager conflict check when strict mode or onConflict callback is requested
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

  return { allowedActions, can, canAll, canAny, checkAll, detectConflicts, explain, forUser, rulesInScope };
}
