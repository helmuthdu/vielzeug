import type {
  BoundPermit,
  Permit,
  PermitCheck,
  PermitDecision,
  PermitOptions,
  PermitRule,
  Principal,
  UserPrincipal,
} from './types';

import { WILDCARD, ANONYMOUS } from './constants';

type InternalRule<TAction extends string, TData> = PermitRule<TAction, TData> & {
  priority: number;
};

type CompiledEntry<TAction extends string = string, TData = unknown> = {
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
function validateRule<TAction extends string, TData>(rule: PermitRule<TAction, TData>): void {
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
function compileEntry<TAction extends string, TData>(
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

function cloneRule<TAction extends string, TData>(rule: InternalRule<TAction, TData>): PermitRule<TAction, TData> {
  return { ...rule };
}

/**
 * Check whether a rule applies to the current decision request.
 */
function matchesRule<TAction extends string, TData>(
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

function matchesRuleScope<TAction extends string, TData>(
  entry: CompiledEntry<TAction, TData>,
  principal: Principal,
  resource: string,
): boolean {
  const { rule } = entry;

  if (principal === null) {
    if (rule.role !== ANONYMOUS) return false;
  } else {
    if (rule.role === ANONYMOUS) return false;

    if (rule.role !== WILDCARD && !principal.roles.includes(rule.role)) return false;
  }

  if (rule.resource !== WILDCARD && rule.resource !== resource) return false;

  return true;
}

export function createPermit<TAction extends string = string, TData = unknown>(
  rules: readonly PermitRule<TAction, TData>[] = [],
  options: PermitOptions<TAction, TData> = {},
): Permit<TAction, TData> {
  const { logger } = options;
  const entries: CompiledEntry<TAction, TData>[] = rules.map((rule) => compileEntry(rule));

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

    // Build decision result
    let decision: PermitDecision<TAction, TData>;

    if (!winner) {
      decision = { allowed: false, reason: 'no-matching-rule' };
    } else if (winner.rule.effect === 'deny') {
      decision = { allowed: false, reason: 'explicit-deny', rule: cloneRule(winner.rule) };
    } else {
      decision = { allowed: true, rule: cloneRule(winner.rule) };
    }

    // Log (centralized)
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

    return decision;
  }

  function can(principal: Principal, resource: string, action: TAction, data?: TData): boolean {
    return explain(principal, resource, action, data).allowed;
  }

  function isAllowedWinner(winner: CompiledEntry<TAction, TData> | undefined): boolean {
    return winner?.rule.effect === 'allow';
  }

  function canAll(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean {
    if (principal !== null) {
      validateUserPrincipal(principal);
    }

    return actions.every((action) => isAllowedWinner(evaluate(principal, resource, action, data)));
  }

  function canAny(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean {
    if (principal !== null) {
      validateUserPrincipal(principal);
    }

    return actions.some((action) => isAllowedWinner(evaluate(principal, resource, action, data)));
  }

  function checkAll(
    principal: Principal,
    checks: readonly PermitCheck<TAction, TData>[],
  ): PermitDecision<TAction, TData>[] {
    if (principal !== null) {
      validateUserPrincipal(principal);
    }

    return checks.map((check) => explain(principal, check.resource, check.action, check.data));
  }

  function uniqueActions(actions: readonly TAction[]): TAction[] {
    const seen = new Set<TAction>();
    const output: TAction[] = [];

    for (const action of actions) {
      if (seen.has(action)) continue;

      seen.add(action);
      output.push(action);
    }

    return output;
  }

  function allowedActionsFor(
    principal: Principal,
    resource: string,
    data?: TData,
    knownActions?: readonly TAction[],
  ): TAction[] {
    if (principal !== null) {
      validateUserPrincipal(principal);
    }

    if (knownActions && knownActions.length > 0) {
      return uniqueActions(knownActions).filter((action) => can(principal, resource, action, data));
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

  function allowedActions(
    principal: Principal,
    resource: string,
    data?: TData,
    knownActions?: readonly TAction[],
  ): TAction[] {
    return allowedActionsFor(principal, resource, data, knownActions);
  }

  function rulesFor(principal: Principal, resource: string): PermitRule<TAction, TData>[] {
    if (principal !== null) {
      validateUserPrincipal(principal);
    }

    const matchedRules: PermitRule<TAction, TData>[] = [];

    for (const entry of entries) {
      if (!matchesRuleScope(entry, principal, resource)) {
        continue;
      }

      matchedRules.push(cloneRule(entry.rule));
    }

    return matchedRules;
  }

  function forUser(principal: UserPrincipal): BoundPermit<TAction, TData> {
    validateUserPrincipal(principal);

    const boundPrincipal: UserPrincipal = {
      attributes: principal.attributes ? { ...principal.attributes } : undefined,
      id: principal.id,
      roles: [...principal.roles],
    };

    function canBound(resource: string, action: TAction, data?: TData): boolean {
      return explain(boundPrincipal, resource, action, data).allowed;
    }

    function canAllBound(resource: string, actions: readonly TAction[], data?: TData): boolean {
      return actions.every((action) => canBound(resource, action, data));
    }

    function canAnyBound(resource: string, actions: readonly TAction[], data?: TData): boolean {
      return actions.some((action) => canBound(resource, action, data));
    }

    function allowedActionsBound(resource: string, data?: TData, knownActions?: readonly TAction[]): TAction[] {
      return allowedActionsFor(boundPrincipal, resource, data, knownActions);
    }

    function explainBound(resource: string, action: TAction, data?: TData): PermitDecision<TAction, TData> {
      return explain(boundPrincipal, resource, action, data);
    }

    function checkAllBound(checks: readonly PermitCheck<TAction, TData>[]): PermitDecision<TAction, TData>[] {
      return checkAll(boundPrincipal, checks);
    }

    function rulesForBound(resource: string): PermitRule<TAction, TData>[] {
      return rulesFor(boundPrincipal, resource);
    }

    const boundPerm: BoundPermit<TAction, TData> = {
      allowedActions: allowedActionsBound,
      can: canBound,
      canAll: canAllBound,
      canAny: canAnyBound,
      checkAll: checkAllBound,
      explain: explainBound,
      forUser,
      rulesFor: rulesForBound,
    };

    return boundPerm;
  }

  const permit: Permit<TAction, TData> = {
    allowedActions,
    can,
    canAll,
    canAny,
    checkAll,
    explain,
    forUser,
    rulesFor,
  };

  return permit;
}
