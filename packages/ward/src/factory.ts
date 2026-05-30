import type {
  BoundWard,
  Ward,
  WardCheck,
  WardDecision,
  WardOptions,
  WardRule,
  Principal,
  UserPrincipal,
} from './types';

import { ANONYMOUS, WILDCARD } from './constants';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** A compiled entry stores the authored rule plus pre-computed lookup values. */
type CompiledEntry<TAction extends string, TData> = {
  /** Resolved priority (defaults to 0 when not authored). */
  priority: number;
  /**
   * Normalized roles array derived from `rule.role`. Always an array
   * internally so matching logic has a single path.
   */
  roles: readonly string[];
  /** The authored rule, preserved verbatim for public return values. */
  rule: WardRule<TAction, TData>;
  /** Specificity score: 1 point per non-wildcard field (role, resource, action). */
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

  if (typeof rule.action !== 'string' || !(rule.action as string).trim()) {
    throw new Error(`[ward] ${at}.action must be a non-empty string`);
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

function validateUserPrincipal(input: unknown): asserts input is UserPrincipal {
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
    validateUserPrincipal(principal);
  }
}

// ---------------------------------------------------------------------------
// Compilation (module-scope pure functions)
// ---------------------------------------------------------------------------

/**
 * Specificity: 1 point per non-wildcard field (role, resource, action).
 * Multi-role rules use the authored role array for display; score is 1 if
 * the roles array is not a sole wildcard.
 */
function specificity<TAction extends string, TData>(rule: WardRule<TAction, TData>, roles: readonly string[]): number {
  const roleScore = roles.includes(WILDCARD) ? 0 : 1;
  const resourceScore = rule.resource === WILDCARD ? 0 : 1;
  const actionScore = rule.action === WILDCARD ? 0 : 1;

  return roleScore + resourceScore + actionScore;
}

function compileEntry<TAction extends string, TData>(
  rule: WardRule<TAction, TData>,
  index: number,
): CompiledEntry<TAction, TData> {
  validateRule(rule, index);

  // Copy the role array before storing so post-creation mutations to the
  // caller's rule object cannot affect compiled entries or returned decisions.
  // The authored shape (string vs array) is preserved so public return values
  // match what the caller wrote.
  const snapshot: WardRule<TAction, TData> = {
    ...rule,
    role: Array.isArray(rule.role) ? [...rule.role] : rule.role,
  };
  const roles: readonly string[] = Array.isArray(snapshot.role)
    ? (snapshot.role as readonly string[])
    : [snapshot.role as string];

  return {
    priority: snapshot.priority ?? 0,
    roles,
    rule: snapshot,
    score: specificity(snapshot, roles),
  };
}

// ---------------------------------------------------------------------------
// Matching (module-scope pure functions)
// ---------------------------------------------------------------------------

/** Returns true if the principal's role set intersects with the rule's roles. */
function principalMatchesRoles(roles: readonly string[], principal: Principal): boolean {
  if (principal === null) {
    // A null principal only matches rules that include ANONYMOUS (in any position).
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

  if (entry.rule.resource !== WILDCARD && entry.rule.resource !== resource) return false;

  if (action !== undefined && entry.rule.action !== WILDCARD && entry.rule.action !== action) return false;

  if (skipPredicate || !entry.rule.when) return true;

  // Predicates require an authenticated principal
  if (principal === null) return false;

  return entry.rule.when({ data, principal });
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

    if (!winner) {
      winner = entry;
      continue;
    }

    const beats =
      entry.priority > winner.priority ||
      (entry.priority === winner.priority && entry.score > winner.score) ||
      (entry.priority === winner.priority && entry.score === winner.score && entry.rule.effect === 'deny');

    if (beats) winner = entry;
  }

  return winner;
}

/** Clone a rule for public return values, ensuring the role array is also copied. */
function cloneRule<TAction extends string, TData>(rule: WardRule<TAction, TData>): WardRule<TAction, TData> {
  return {
    ...rule,
    role: Array.isArray(rule.role) ? [...rule.role] : rule.role,
  };
}

function toDecision<TAction extends string, TData>(
  winner: CompiledEntry<TAction, TData> | undefined,
): WardDecision<TAction, TData> {
  if (!winner) return { allowed: false, reason: 'no-matching-rule' };

  if (winner.rule.effect === 'deny') {
    return { allowed: false, reason: 'explicit-deny', rule: cloneRule(winner.rule) };
  }

  return { allowed: true, rule: cloneRule(winner.rule) };
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

    if (logger) {
      logger({
        action,
        data,
        decision: winner?.rule.effect ?? 'deny',
        principal,
        resource,
        rule: winner ? cloneRule(winner.rule) : undefined,
      });
    }

    return toDecision(winner);
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

      result.push(cloneRule(entry.rule));
    }

    return result;
  }

  function forUser(principal: UserPrincipal): BoundWard<TAction, TData> {
    validateUserPrincipal(principal);

    // Snapshot the principal at bind time — mutations to the caller's object
    // must not affect decisions made through the bound view.
    const snap: UserPrincipal = {
      attributes: principal.attributes ? structuredClone(principal.attributes) : undefined,
      id: principal.id,
      roles: [...principal.roles],
    };

    // Delegate to the top-level closures so all validation, logging, and
    // short-circuit semantics stay in one place.
    return {
      allowedActions: (resource, knownActions, data?) => allowedActions(snap, resource, knownActions, data),
      can: (resource, action, data?) => can(snap, resource, action, data),
      canAll: (resource, actions, data?) => canAll(snap, resource, actions, data),
      canAny: (resource, actions, data?) => canAny(snap, resource, actions, data),
      checkAll: (checks) => checkAll(snap, checks),
      explain: (resource, action, data?) => explain(snap, resource, action, data),
      rulesInScope: (resource, data?) => rulesInScope(snap, resource, data),
    };
  }

  return { allowedActions, can, canAll, canAny, checkAll, explain, forUser, rulesInScope };
}
