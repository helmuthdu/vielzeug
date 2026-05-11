import type {
  BoundPermit,
  PermissionData,
  Permit,
  PermitDecision,
  PermitOptions,
  PermitRule,
  Principal,
  UserPrincipal,
} from './types';

import { WILDCARD, ANONYMOUS } from './constants';

type InternalRule<TAction extends string, TData extends PermissionData> = PermitRule<TAction, TData> & {
  priority: number;
};

type CompiledEntry<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  rule: InternalRule<TAction, TData>;
  score: number;
};

/**
 * Calculate specificity score for a rule (higher = more specific)
 * Specific roles/resources/actions score 1 point each, wildcards score 0
 */
function specificity(rule: { action: string; resource: string; role: string }): number {
  return (rule.role === WILDCARD ? 0 : 1) + (rule.resource === WILDCARD ? 0 : 1) + (rule.action === WILDCARD ? 0 : 1);
}

/**
 * Validate essential runtime fields that can bypass static typing.
 */
function validateRule<TAction extends string, TData extends PermissionData>(rule: PermitRule<TAction, TData>): void {
  if (rule.effect !== 'allow' && rule.effect !== 'deny') {
    throw new Error('[permit] Rule.effect must be "allow" or "deny"');
  }

  if (rule.when !== undefined && typeof rule.when !== 'function') {
    throw new Error('[permit] Rule.when must be a function');
  }
}

/**
 * Validate an authenticated principal.
 */
function validateUserPrincipal(input: unknown): asserts input is UserPrincipal {
  if (typeof input !== 'object' || !input) {
    throw new Error('[permit] Invalid principal: expected { id: string, roles: string[] }');
  }

  const principal = input as Record<string, unknown>;

  if (typeof principal.id !== 'string' || !principal.id.trim()) {
    throw new Error('[permit] Invalid principal: id must be a non-empty string');
  }

  if (!Array.isArray(principal.roles) || principal.roles.some((role) => typeof role !== 'string')) {
    throw new Error('[permit] Invalid principal: roles must be an array of strings');
  }
}

/**
 * Compile a rule once so evaluation can stay minimal.
 */
function compileEntry<TAction extends string, TData extends PermissionData>(
  source: PermitRule<TAction, TData>,
): CompiledEntry<TAction, TData> {
  validateRule<TAction, TData>(source);

  const rule: InternalRule<TAction, TData> = {
    ...source,
    priority: source.priority ?? 0,
  };

  return {
    rule,
    score: specificity(rule),
  };
}

function cloneRule<TAction extends string, TData extends PermissionData>(
  rule: InternalRule<TAction, TData>,
): PermitRule<TAction, TData> {
  return { ...rule };
}

/**
 * Check whether a rule applies to the current decision request.
 */
function matchesRule<TAction extends string, TData extends PermissionData>(
  entry: CompiledEntry<TAction, TData>,
  principal: Principal,
  resource: string,
  action: TAction,
  data: TData | undefined,
): boolean {
  const { rule } = entry;

  if (principal === null) {
    if (rule.role !== ANONYMOUS) return false;
  } else {
    if (rule.role === ANONYMOUS) return false;

    if (rule.role !== WILDCARD && !principal.roles.includes(rule.role)) return false;
  }

  if (rule.resource !== WILDCARD && rule.resource !== resource) return false;

  if (rule.action !== WILDCARD && rule.action !== action) return false;

  if (!rule.when) return true;

  if (principal === null) return false;

  return rule.when({ data, principal });
}

export function createPermit<TAction extends string = string, TData extends PermissionData = PermissionData>(
  opts: PermitOptions<TAction, TData> = {},
): Permit<TAction, TData> {
  const { initial = [], logger } = opts;
  const entries: CompiledEntry<TAction, TData>[] = [];

  function evaluate(
    principal: Principal,
    resource: string,
    action: TAction,
    data?: TData,
  ): CompiledEntry<TAction, TData> | undefined {
    let winner: CompiledEntry<TAction, TData> | undefined;

    for (const entry of entries) {
      if (!matchesRule(entry, principal, resource, action, data)) continue;

      if (!winner) {
        winner = entry;
        continue;
      }

      const entryPriority = entry.rule.priority;
      const winnerPriority = winner.rule.priority;
      const entryBeatsWinner =
        entryPriority > winnerPriority ||
        (entryPriority === winnerPriority && entry.score > winner.score) ||
        (entryPriority === winnerPriority && entry.score === winner.score && entry.rule.effect === 'deny');

      if (entryBeatsWinner) {
        winner = entry;
      }
    }

    return winner;
  }

  function explain(
    principal: Principal,
    resource: string,
    action: TAction,
    data?: TData,
  ): PermitDecision<TAction, TData> {
    // Validation once at the start
    if (principal !== null) {
      validateUserPrincipal(principal);
    }

    // Evaluate decision
    const winner = evaluate(principal, resource, action, data);

    // Log (centralized)
    logger?.({
      action,
      data,
      decision: winner?.rule.effect ?? 'deny',
      principal,
      resource,
      rule: winner ? cloneRule(winner.rule) : undefined,
    });

    // Build decision result
    let decision: PermitDecision<TAction, TData>;

    if (!winner) {
      decision = { allowed: false, reason: 'no-matching-rule' };
    } else if (winner.rule.effect === 'deny') {
      decision = { allowed: false, reason: 'explicit-deny', rule: cloneRule(winner.rule) };
    } else {
      decision = { allowed: true, rule: cloneRule(winner.rule) };
    }

    return decision;
  }

  function can(principal: Principal, resource: string, action: TAction, data?: TData): boolean {
    return explain(principal, resource, action, data).allowed;
  }

  function canAll(principal: Principal, resource: string, actions: TAction[], data?: TData): boolean {
    return actions.every((action) => can(principal, resource, action, data));
  }

  function canAny(principal: Principal, resource: string, actions: TAction[], data?: TData): boolean {
    return actions.some((action) => can(principal, resource, action, data));
  }

  function allowedActions(principal: Principal, resource: string, data?: TData): TAction[] {
    if (principal !== null) {
      validateUserPrincipal(principal);
    }

    const allowed: TAction[] = [];
    const seenActions = new Set<TAction>();

    // Collect unique non-wildcard actions from matching rules
    for (const entry of entries) {
      if (entry.rule.action === WILDCARD) continue;

      const action = entry.rule.action as TAction;

      if (seenActions.has(action)) continue;

      if (!matchesRule(entry, principal, resource, action, data)) continue;

      seenActions.add(action);

      if (can(principal, resource, action, data)) {
        allowed.push(action);
      }
    }

    return allowed;
  }

  function set(rule: PermitRule<TAction, TData> | readonly PermitRule<TAction, TData>[]): Permit<TAction, TData> {
    const nextRules = Array.isArray(rule) ? rule : [rule];

    for (const nextRule of nextRules) {
      entries.push(compileEntry(nextRule));
    }

    return permit;
  }

  function forUser(principal: UserPrincipal, cache?: boolean): BoundPermit<TAction, TData> {
    validateUserPrincipal(principal);

    const boundPrincipal: UserPrincipal = {
      attributes: principal.attributes ? { ...principal.attributes } : undefined,
      id: principal.id,
      roles: [...principal.roles],
    };
    const decisionCache = cache ? new Map<string, PermitDecision<TAction, TData>>() : undefined;

    function explainBound(resource: string, action: TAction, data?: TData): PermitDecision<TAction, TData> {
      if (!decisionCache) {
        return explain(boundPrincipal, resource, action, data);
      }

      const cacheKey = `${resource}:${action}:${JSON.stringify(data ?? null)}`;
      const cached = decisionCache.get(cacheKey);

      if (cached) {
        return cached;
      }

      const decision = explain(boundPrincipal, resource, action, data);

      decisionCache.set(cacheKey, decision);

      return decision;
    }

    function canBound(resource: string, action: TAction, data?: TData): boolean {
      return explainBound(resource, action, data).allowed;
    }

    function canAllBound(resource: string, actions: TAction[], data?: TData): boolean {
      return actions.every((action) => canBound(resource, action, data));
    }

    function canAnyBound(resource: string, actions: TAction[], data?: TData): boolean {
      return actions.some((action) => canBound(resource, action, data));
    }

    function allowedActionsBound(resource: string, data?: TData): TAction[] {
      const allowed: TAction[] = [];
      const seenActions = new Set<TAction>();

      for (const entry of entries) {
        if (entry.rule.action === WILDCARD) continue;

        const entryAction = entry.rule.action as TAction;

        if (seenActions.has(entryAction)) continue;

        if (!matchesRule(entry, boundPrincipal, resource, entryAction, data)) continue;

        seenActions.add(entryAction);

        if (canBound(resource, entryAction, data)) {
          allowed.push(entryAction);
        }
      }

      return allowed;
    }

    const boundPerm: BoundPermit<TAction, TData> = {
      allowedActions: allowedActionsBound,
      can: canBound,
      canAll: canAllBound,
      canAny: canAnyBound,
      clear,
      explain: explainBound,
      forUser,
      replace,
      rules,
      set,
    };

    return boundPerm;
  }

  function clear(): Permit<TAction, TData> {
    entries.length = 0;

    return permit;
  }

  function rules(): PermitRule<TAction, TData>[] {
    return entries.map((entry) => cloneRule(entry.rule));
  }

  function replace(nextRules: readonly PermitRule<TAction, TData>[]): Permit<TAction, TData> {
    entries.length = 0;

    set(nextRules);

    return permit;
  }

  const permit: Permit<TAction, TData> = {
    allowedActions,
    can,
    canAll,
    canAny,
    clear,
    explain,
    forUser,
    replace,
    rules,
    set,
  };

  if (initial.length > 0) {
    replace(initial);
  }

  return permit;
}
