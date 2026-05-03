import type { PermissionData, Permit, PermitOptions, PermitRule, Principal, UserPrincipal } from './types';

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

  function logDecision(
    principal: Principal,
    resource: string,
    action: TAction,
    data: TData | undefined,
    winner?: CompiledEntry<TAction, TData>,
  ): void {
    logger?.({
      action,
      data,
      decision: winner?.rule.effect ?? 'deny',
      principal,
      resource,
      rule: winner ? cloneRule(winner.rule) : undefined,
    });
  }

  function set(rule: PermitRule<TAction, TData> | readonly PermitRule<TAction, TData>[]): Permit<TAction, TData> {
    const nextRules = Array.isArray(rule) ? rule : [rule];

    for (const nextRule of nextRules) {
      entries.push(compileEntry(nextRule));
    }

    return permit;
  }

  function can(principal: Principal, resource: string, action: TAction, data?: TData): boolean {
    if (principal !== null) {
      validateUserPrincipal(principal);
    }

    const winner = evaluate(principal, resource, action, data);

    logDecision(principal, resource, action, data, winner);

    return winner?.rule.effect === 'allow';
  }

  function forUser(principal: UserPrincipal): (resource: string, action: TAction, data?: TData) => boolean {
    validateUserPrincipal(principal);

    const boundPrincipal: UserPrincipal = {
      id: principal.id,
      roles: [...principal.roles],
    };

    return (resource, action, data) => {
      const winner = evaluate(boundPrincipal, resource, action, data);

      logDecision(boundPrincipal, resource, action, data, winner);

      return winner?.rule.effect === 'allow';
    };
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
    can,
    clear,
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
