import type {
  PermissionData,
  Permit,
  PermitGuard,
  PermitOptions,
  PermitPolicy,
  PermitRule,
  PrincipalInput,
} from './types';

import { WILDCARD } from './constants';
import { getRoles, isUserPrincipal, normalize, toPrincipal } from './utils';

type StoredRule<TAction extends string = string> = PermitRule<TAction> & {
  action: TAction | typeof WILDCARD;
  priority: number;
  resource: string;
  role: string;
};

function specificity(rule: StoredRule): number {
  return (rule.role === WILDCARD ? 0 : 1) + (rule.resource === WILDCARD ? 0 : 1) + (rule.action === WILDCARD ? 0 : 1);
}

function normalizeRule<TAction extends string>(rule: PermitRule<TAction>): StoredRule<TAction> {
  if (!rule.role || rule.role.trim().length === 0) throw new Error('[permit] Rule.role is required');

  if (!rule.resource || rule.resource.trim().length === 0) throw new Error('[permit] Rule.resource is required');

  if (!rule.action || rule.action.trim().length === 0) throw new Error('[permit] Rule.action is required');

  return {
    ...rule,
    action: normalize(rule.action) as TAction | typeof WILDCARD,
    priority: rule.priority ?? 0,
    resource: normalize(rule.resource),
    role: normalize(rule.role),
  };
}

export function createPermit<TAction extends string = string, TData extends PermissionData = PermissionData>(
  opts: PermitOptions<TAction, TData> = {},
): Permit<TAction, TData> {
  const { initial, logger, predicates = {} } = opts;
  const rules: StoredRule<TAction>[] = [];

  function set(rule: PermitRule<TAction>): Permit<TAction, TData> {
    const normalizedRule = normalizeRule(rule);

    if (normalizedRule.when && !predicates[normalizedRule.when]) {
      throw new Error(`[permit] Unknown predicate '${normalizedRule.when}'`);
    }

    rules.push(normalizedRule);

    return permit;
  }

  function can(principalInput: PrincipalInput, resource: string, action: TAction, data?: TData): boolean {
    const principal = toPrincipal(principalInput);
    const normalizedResource = normalize(resource);
    const normalizedAction = normalize(action) as TAction;
    const principalRoles = getRoles(principal);

    const candidates = rules
      .filter((rule) => {
        if (!principalRoles.has(rule.role)) return false;

        if (rule.resource !== WILDCARD && rule.resource !== normalizedResource) return false;

        if (rule.action !== WILDCARD && rule.action !== normalizedAction) return false;

        if (!rule.when) return true;

        if (!isUserPrincipal(principal)) return false;

        const predicate = predicates[rule.when];

        if (!predicate) throw new Error(`[permit] Missing predicate '${rule.when}'`);

        return predicate({ data, principal });
      })
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;

        return specificity(b) - specificity(a);
      });

    if (candidates.length === 0) {
      logger?.('deny', principal, normalizedResource, normalizedAction, data);

      return false;
    }

    const highest = candidates[0]!;
    const highestPriority = highest.priority;
    const highestSpecificity = specificity(highest);
    const top = candidates.filter(
      (rule) => rule.priority === highestPriority && specificity(rule) === highestSpecificity,
    );
    const denied = top.some((rule) => rule.effect === 'deny');
    const result = denied ? 'deny' : 'allow';

    logger?.(result, principal, normalizedResource, normalizedAction, data);

    return result === 'allow';
  }

  function withUser(principal: PrincipalInput): PermitGuard<TAction, TData> {
    return {
      can: (resource, action, data) => can(principal, resource, action, data),
    };
  }

  function clear(): Permit<TAction, TData> {
    rules.length = 0;

    return permit;
  }

  function exportPolicy(): PermitPolicy<TAction> {
    return {
      rules: rules.map((rule) => ({ ...rule })),
    };
  }

  function importPolicy(policy: PermitPolicy<TAction>): Permit<TAction, TData> {
    clear();

    for (const rule of policy.rules) {
      set(rule);
    }

    return permit;
  }

  const permit: Permit<TAction, TData> = {
    can,
    clear,
    exportPolicy,
    importPolicy,
    set,
    withUser,
  };

  if (initial) {
    importPolicy(initial);
  }

  return permit;
}
