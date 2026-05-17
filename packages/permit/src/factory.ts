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
  source: PermitRule<TAction, TData>;
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
  if (typeof rule.role !== 'string' || !rule.role.trim()) {
    throw new Error('[permit] Rule.role must be a non-empty string');
  }

  if (typeof rule.resource !== 'string' || !rule.resource.trim()) {
    throw new Error('[permit] Rule.resource must be a non-empty string');
  }

  if (typeof rule.action !== 'string' || !(rule.action as string).trim()) {
    throw new Error('[permit] Rule.action must be a non-empty string');
  }

  if (rule.effect !== 'allow' && rule.effect !== 'deny') {
    throw new Error('[permit] Rule.effect must be "allow" or "deny"');
  }

  if (rule.priority !== undefined && (typeof rule.priority !== 'number' || !Number.isFinite(rule.priority))) {
    throw new Error('[permit] Rule.priority must be a finite number');
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

  const ruleSource: PermitRule<TAction, TData> = { ...source };

  const rule: InternalRule<TAction, TData> = {
    ...ruleSource,
    priority: ruleSource.priority ?? 0,
  };

  return {
    rule,
    score: specificity(rule),
    source: ruleSource,
  };
}

function cloneRule<TAction extends string, TData>(rule: PermitRule<TAction, TData>): PermitRule<TAction, TData> {
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

function matchesRuleData<TAction extends string, TData>(
  entry: CompiledEntry<TAction, TData>,
  principal: Principal,
  data: TData | undefined,
): boolean {
  if (!entry.rule.when) {
    return true;
  }

  if (principal === null) {
    return false;
  }

  return entry.rule.when({ data, principal });
}

function validatePrincipal(principal: Principal): void {
  if (principal !== null) {
    validateUserPrincipal(principal);
  }
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

  function toDecision(winner: CompiledEntry<TAction, TData> | undefined): PermitDecision<TAction, TData> {
    if (!winner) {
      return { allowed: false, reason: 'no-matching-rule' };
    }

    if (winner.rule.effect === 'deny') {
      return { allowed: false, reason: 'explicit-deny', rule: cloneRule(winner.source) };
    }

    return { allowed: true, rule: cloneRule(winner.source) };
  }

  function logDecision(
    principal: Principal,
    resource: string,
    action: TAction,
    data: TData | undefined,
    winner: CompiledEntry<TAction, TData> | undefined,
  ): void {
    if (!logger) {
      return;
    }

    logger({
      action,
      data,
      decision: winner?.rule.effect ?? 'deny',
      principal,
      resource,
      rule: winner ? cloneRule(winner.source) : undefined,
    });
  }

  function decide(
    principal: Principal,
    resource: string,
    action: TAction,
    data?: TData,
    options?: { log?: boolean; validated?: boolean },
  ): PermitDecision<TAction, TData> {
    if (!options?.validated) {
      validatePrincipal(principal);
    }

    const winner = evaluate(principal, resource, action, data);

    if (options?.log) {
      logDecision(principal, resource, action, data, winner);
    }

    return toDecision(winner);
  }

  function explain(
    principal: Principal,
    resource: string,
    action: TAction,
    data?: TData,
  ): PermitDecision<TAction, TData> {
    return decide(principal, resource, action, data, { log: true });
  }

  function can(principal: Principal, resource: string, action: TAction, data?: TData): boolean {
    return decide(principal, resource, action, data, { log: true }).allowed;
  }

  function canAll(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean {
    if (actions.length === 0) {
      return true;
    }

    validatePrincipal(principal);

    return actions.every((action) => decide(principal, resource, action, data, { log: true, validated: true }).allowed);
  }

  function canAny(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean {
    if (actions.length === 0) {
      return false;
    }

    validatePrincipal(principal);

    return actions.some((action) => decide(principal, resource, action, data, { log: true, validated: true }).allowed);
  }

  function checkAll(
    principal: Principal,
    checks: readonly PermitCheck<TAction, TData>[],
  ): PermitDecision<TAction, TData>[] {
    if (checks.length === 0) {
      return [];
    }

    validatePrincipal(principal);

    return checks.map((check) =>
      decide(principal, check.resource, check.action, check.data, { log: true, validated: true }),
    );
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
    validatePrincipal(principal);

    if (knownActions && knownActions.length > 0) {
      return uniqueActions(knownActions).filter(
        (action) => decide(principal, resource, action, data, { validated: true }).allowed,
      );
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

      if (decide(principal, resource, action, data, { validated: true }).allowed) {
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

  function rulesInScope(principal: Principal, resource: string, data?: TData): PermitRule<TAction, TData>[] {
    validatePrincipal(principal);

    const matchedRules: PermitRule<TAction, TData>[] = [];

    for (const entry of entries) {
      if (!matchesRuleScope(entry, principal, resource)) {
        continue;
      }

      if (data !== undefined && !matchesRuleData(entry, principal, data)) {
        continue;
      }

      matchedRules.push(cloneRule(entry.source));
    }

    return matchedRules;
  }

  function forUser(principal: UserPrincipal): BoundPermit<TAction, TData> {
    validateUserPrincipal(principal);

    const boundPrincipal: UserPrincipal = {
      attributes: principal.attributes ? structuredClone(principal.attributes) : undefined,
      id: principal.id,
      roles: [...principal.roles],
    };

    function canBound(resource: string, action: TAction, data?: TData): boolean {
      return decide(boundPrincipal, resource, action, data, { log: true, validated: true }).allowed;
    }

    function canAllBound(resource: string, actions: readonly TAction[], data?: TData): boolean {
      if (actions.length === 0) {
        return true;
      }

      return actions.every(
        (action) => decide(boundPrincipal, resource, action, data, { log: true, validated: true }).allowed,
      );
    }

    function canAnyBound(resource: string, actions: readonly TAction[], data?: TData): boolean {
      if (actions.length === 0) {
        return false;
      }

      return actions.some(
        (action) => decide(boundPrincipal, resource, action, data, { log: true, validated: true }).allowed,
      );
    }

    function allowedActionsBound(resource: string, data?: TData, knownActions?: readonly TAction[]): TAction[] {
      return allowedActionsFor(boundPrincipal, resource, data, knownActions);
    }

    function explainBound(resource: string, action: TAction, data?: TData): PermitDecision<TAction, TData> {
      return decide(boundPrincipal, resource, action, data, { log: true, validated: true });
    }

    function checkAllBound(checks: readonly PermitCheck<TAction, TData>[]): PermitDecision<TAction, TData>[] {
      return checkAll(boundPrincipal, checks);
    }

    function rulesInScopeBound(resource: string, data?: TData): PermitRule<TAction, TData>[] {
      return rulesInScope(boundPrincipal, resource, data);
    }

    const boundPerm: BoundPermit<TAction, TData> = {
      allowedActions: allowedActionsBound,
      can: canBound,
      canAll: canAllBound,
      canAny: canAnyBound,
      checkAll: checkAllBound,
      explain: explainBound,
      forUser,
      rulesInScope: rulesInScopeBound,
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
    rulesInScope,
  };

  return permit;
}
