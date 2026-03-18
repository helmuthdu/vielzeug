/* ============================================
   permit — Role-based permission engine
   ============================================ */

import type {
  BaseUser,
  PermissionActions,
  PermissionCheck,
  PermissionData,
  Permit,
  PermitGuard,
  PermitOptions,
  PermitSnapshot,
  PermitState,
} from './types';

import { WILDCARD } from './constants';
import { getEffectiveRoles, isAnonymous, normalize } from './utils';

/* -------------------- Factory -------------------- */

export function createPermit<
  TUser extends BaseUser = BaseUser,
  TAction extends string = string,
  TData extends PermissionData = PermissionData,
>(opts: PermitOptions<TUser, TAction, TData> = {}): Permit<TUser, TAction, TData> {
  const { logger, strict = false, wildcardFallback = true } = opts;
  const permissions = new Map<string, Map<string, PermissionActions<TAction, TUser, TData>>>();
  const hierarchy = new Map<string, Set<string>>();

  function check(user: TUser | null | undefined, resource: string, action: TAction, data?: TData): boolean {
    const normalizedResource = normalize(resource);
    const normalizedAction = normalize(action) as TAction;

    for (const role of getEffectiveRoles(user, hierarchy)) {
      const rolePerms = permissions.get(role);

      if (!rolePerms) continue;

      const specific = rolePerms.get(normalizedResource);
      let permission: PermissionCheck<TUser, TData> | undefined;

      if (specific !== undefined) {
        // Specific action, then wildcard action on the specific resource.
        permission = specific[normalizedAction] ?? specific[WILDCARD];

        // Fall back to the wildcard resource only when wildcardFallback is enabled.
        if (permission === undefined && wildcardFallback) {
          const wildcardPerms = rolePerms.get(WILDCARD);

          permission = wildcardPerms?.[normalizedAction] ?? wildcardPerms?.[WILDCARD];
        }
      } else {
        const wildcardPerms = rolePerms.get(WILDCARD);

        permission = wildcardPerms?.[normalizedAction] ?? wildcardPerms?.[WILDCARD];
      }

      if (permission === undefined) continue;

      // The first role that has any opinion (true OR false) wins — stops here.
      // Anonymous users cannot satisfy dynamic ownership checks — always false.
      const result =
        typeof permission === 'function' ? (isAnonymous(user) ? false : permission(user!, data)) : Boolean(permission);

      logger?.(result ? 'allow' : 'deny', user, normalizedResource, normalizedAction, data);

      return result;
    }

    logger?.('deny', user, normalizedResource, normalizedAction, data);

    return false;
  }

  function define(
    role: string,
    resource: string,
    actions: PermissionActions<TAction, TUser, TData>,
  ): Permit<TUser, TAction, TData> {
    if (!role) throw new Error('Role is required');

    if (!resource) throw new Error('Resource is required');

    if (Object.keys(actions).length === 0) {
      const msg = `[permit] define('${role}', '${resource}', {}) has no actions — is this intentional?`;

      if (strict) throw new Error(msg);

      return permit;
    }

    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    if (!permissions.has(normalizedRole)) permissions.set(normalizedRole, new Map());

    const rolePerms = permissions.get(normalizedRole)!;
    const existing = rolePerms.get(normalizedResource) ?? {};
    const normalizedActions = Object.fromEntries(
      Object.entries(actions).map(([k, v]) => [normalize(k), v]),
    ) as PermissionActions<TAction, TUser, TData>;

    rolePerms.set(normalizedResource, { ...existing, ...normalizedActions });

    return permit;
  }

  function grant(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction, TData> {
    return define(
      role,
      resource,
      Object.fromEntries(actions.map((a) => [a, true])) as PermissionActions<TAction, TUser, TData>,
    );
  }

  function deny(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction, TData> {
    return define(
      role,
      resource,
      Object.fromEntries(actions.map((a) => [a, false])) as PermissionActions<TAction, TUser, TData>,
    );
  }

  function extend(childRole: string, parentRole: string): Permit<TUser, TAction, TData> {
    const normalizedChild = normalize(childRole);
    const normalizedParent = normalize(parentRole);

    if (!hierarchy.has(normalizedChild)) hierarchy.set(normalizedChild, new Set());

    hierarchy.get(normalizedChild)!.add(normalizedParent);

    return permit;
  }

  function unextend(childRole: string, parentRole?: string): Permit<TUser, TAction, TData> {
    const normalizedChild = normalize(childRole);

    if (!parentRole) {
      hierarchy.delete(normalizedChild);
    } else {
      const parents = hierarchy.get(normalizedChild);

      if (parents) {
        parents.delete(normalize(parentRole));

        if (parents.size === 0) hierarchy.delete(normalizedChild);
      }
    }

    return permit;
  }

  function remove(role: string): Permit<TUser, TAction, TData>;
  function remove(role: string, resource: string): Permit<TUser, TAction, TData>;
  function remove(role: string, resource: string, action: TAction): Permit<TUser, TAction, TData>;
  function remove(role: string, resource?: string, action?: TAction): Permit<TUser, TAction, TData> {
    const normalizedRole = normalize(role);
    const rolePerms = permissions.get(normalizedRole);

    if (!rolePerms) return permit;

    if (!resource) {
      permissions.delete(normalizedRole);

      return permit;
    }

    const normalizedResource = normalize(resource);

    if (action) {
      const resourcePerms = rolePerms.get(normalizedResource);

      if (resourcePerms) {
        delete resourcePerms[normalize(action) as TAction];

        if (Object.keys(resourcePerms).length === 0) rolePerms.delete(normalizedResource);
      }
    } else {
      rolePerms.delete(normalizedResource);
    }

    if (rolePerms.size === 0) permissions.delete(normalizedRole);

    return permit;
  }

  /**
   * Returns a pre-bound guard for a specific user.
   * Useful when making multiple checks for the same user in one scope.
   *
   * @example
   * ```ts
   * const guard = permit.for(user);
   * guard.can('posts', 'read');
   * guard.can('posts', 'update', { authorId: user.id });
   * guard.canAll('posts', ['read', 'write']);
   * guard.canAny('posts', ['read', 'write']);
   * ```
   */
  function forUser(user: TUser | null | undefined): PermitGuard<TAction, TData> {
    return {
      can: (resource, action, data) => check(user, resource, action, data),
      canAll: (resource, actions, data) => actions.every((a) => check(user, resource, a, data)),
      canAny: (resource, actions, data) => actions.some((a) => check(user, resource, a, data)),
    };
  }

  function snapshot(): PermitState<TUser, TAction, TData> {
    const perms: PermitSnapshot<TUser, TAction, TData> = {};

    for (const [role, resourceMap] of permissions) {
      perms[role] = {};
      for (const [resource, actions] of resourceMap) {
        perms[role][resource] = { ...actions };
      }
    }

    const hier: Record<string, string[]> = {};

    for (const [child, parents] of hierarchy) {
      hier[child] = [...parents];
    }

    return {
      permissions: perms,
      ...(Object.keys(hier).length > 0 && { hierarchy: hier }),
    };
  }

  function restore(state: PermitState<TUser, TAction, TData>): Permit<TUser, TAction, TData> {
    permissions.clear();
    hierarchy.clear();

    for (const [role, resourceMap] of Object.entries(state.permissions)) {
      const roleMap = new Map<string, PermissionActions<TAction, TUser, TData>>();

      for (const [resource, actions] of Object.entries(resourceMap)) {
        roleMap.set(normalize(resource), { ...actions });
      }

      permissions.set(normalize(role), roleMap);
    }

    for (const [child, parents] of Object.entries(state.hierarchy ?? {})) {
      hierarchy.set(normalize(child), new Set(parents.map(normalize)));
    }

    return permit;
  }

  function clear(): Permit<TUser, TAction, TData> {
    permissions.clear();
    hierarchy.clear();

    return permit;
  }

  const permit: Permit<TUser, TAction, TData> = {
    check,
    checkAll: (user, resource, actions, data) => actions.every((a) => check(user, resource, a, data)),
    checkAny: (user, resource, actions, data) => actions.some((a) => check(user, resource, a, data)),
    clear,
    define,
    deny,
    extend,
    for: forUser,
    grant,
    remove,
    restore,
    snapshot,
    unextend,
  };

  if (opts.initial) restore(opts.initial);

  return permit;
}
