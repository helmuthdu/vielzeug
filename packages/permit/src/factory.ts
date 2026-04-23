import type { PermissionData, Permit, PermitOptions, PermitRule, Principal, UserPrincipal } from './types';

import { WILDCARD, ANONYMOUS } from './constants';
import { validateRule, validateUserPrincipal } from './utils';

type CompiledRule<TAction extends string = string, TData extends PermissionData = PermissionData> = PermitRule<
  TAction,
  TData
> & {
  priority: number;
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
 * Compile a rule once so evaluation can stay minimal.
 */
function compileRule<TAction extends string, TData extends PermissionData>(
  rule: PermitRule<TAction, TData>,
): CompiledRule<TAction, TData> {
  validateRule<TAction, TData>(rule);

  return {
    ...rule,
    priority: rule.priority ?? 0,
    score: specificity(rule),
  };
}

function toPublicRule<TAction extends string, TData extends PermissionData>(
  rule: CompiledRule<TAction, TData>,
): PermitRule<TAction, TData> {
  const { score: _score, ...publicRule } = rule;

  return { ...publicRule };
}

/**
 * Check whether a rule applies to the current decision request.
 */
function matchesRule<TAction extends string, TData extends PermissionData>(
  rule: CompiledRule<TAction, TData>,
  principal: Principal,
  resource: string,
  action: TAction,
  data: TData | undefined,
): boolean {
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
  const rules: CompiledRule<TAction, TData>[] = [];

  function set(rule: PermitRule<TAction, TData>): Permit<TAction, TData> {
    rules.push(compileRule(rule));

    return permit;
  }

  function can(principal: Principal, resource: string, action: TAction, data?: TData): boolean {
    if (principal !== null) {
      validateUserPrincipal(principal);
    }

    let winner: CompiledRule<TAction, TData> | undefined;
    let decision: 'allow' | 'deny' = 'deny';

    for (const rule of rules) {
      if (!matchesRule(rule, principal, resource, action, data)) continue;

      if (
        !winner ||
        rule.priority > winner.priority ||
        (rule.priority === winner.priority && rule.score > winner.score)
      ) {
        winner = rule;
        decision = rule.effect;

        continue;
      }

      if (rule.priority === winner.priority && rule.score === winner.score && rule.effect === 'deny') {
        winner = rule;
        decision = 'deny';
      }
    }

    if (!winner) {
      logger?.({
        action,
        data,
        decision: 'deny',
        principal,
        resource,
        rule: undefined,
      });

      return false;
    }

    logger?.({
      action,
      data,
      decision,
      principal,
      resource,
      rule: toPublicRule(winner),
    });

    return decision === 'allow';
  }

  function forUser(principal: UserPrincipal): (resource: string, action: TAction, data?: TData) => boolean {
    validateUserPrincipal(principal);

    const boundPrincipal: UserPrincipal = {
      id: principal.id,
      roles: [...principal.roles],
    };

    return (resource, action, data) => can(boundPrincipal, resource, action, data);
  }

  function clear(): Permit<TAction, TData> {
    rules.length = 0;

    return permit;
  }

  function rulesSnapshot(): PermitRule<TAction, TData>[] {
    return rules.map((rule) => toPublicRule(rule));
  }

  function replace(nextRules: readonly PermitRule<TAction, TData>[]): Permit<TAction, TData> {
    clear();

    for (const rule of nextRules) {
      set(rule);
    }

    return permit;
  }

  const permit: Permit<TAction, TData> = {
    can,
    clear,
    forUser,
    replace,
    rules: rulesSnapshot,
    set,
  };

  if (initial.length > 0) {
    replace(initial);
  }

  return permit;
}
