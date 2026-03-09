/* ============================================
   permit — Role-based permission engine
   ============================================ */

/* -------------------- Core Types -------------------- */

export type PermissionData = Record<string, unknown>;

export type BaseUser = {
  id: string;
  roles: string[];
};

export type PermissionCheck<TUser extends BaseUser = BaseUser> =
  | boolean
  | ((user: TUser, data?: PermissionData) => boolean);

export type PermissionActions<TAction extends string, TUser extends BaseUser = BaseUser> = Partial<
  Record<TAction, PermissionCheck<TUser>>
>;

/** Pre-bound guard for a specific user — returned by `permit.for(user)`. */
export type PermitGuard<TAction extends string = string> = {
  /** Returns true if the user can perform the action on the resource. */
  can(resource: string, action: TAction, data?: PermissionData): boolean;
  /** Returns true if the user can perform ANY of the given actions on the resource. */
  canAny(resource: string, actions: TAction[], data?: PermissionData): boolean;
  /** Returns true if the user can perform ALL of the given actions on the resource. */
  canAll(resource: string, actions: TAction[], data?: PermissionData): boolean;
};

/**
 * The public API returned by `createPermit`.
 * Defined as a named type so `register()` can return `Permit` without
 * creating a circular `ReturnType<typeof createPermit>` reference.
 */
export type Permit<TUser extends BaseUser = BaseUser, TAction extends string = string> = {
  check(user: TUser | null | undefined, resource: string, action: TAction, data?: PermissionData): boolean;
  register(role: string, resource: string, actions: PermissionActions<TAction, TUser>): Permit<TUser, TAction>;
  /** Shorthand to allow one or more actions for a role on a resource. */
  grant(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction>;
  /** Shorthand to deny one or more actions for a role on a resource. */
  deny(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction>;
  /** Returns a pre-bound guard for a specific user. */
  for(user: TUser | null | undefined): PermitGuard<TAction>;
  remove(role: string, resource?: string, action?: TAction): Permit<TUser, TAction>;
  snapshot(): PermitSnapshot<TUser, TAction>;
  restore(snapshot: PermitSnapshot<TUser, TAction>): Permit<TUser, TAction>;
  clear(): Permit<TUser, TAction>;
};

/** A plain-object snapshot of all registered permissions. */
export type PermitSnapshot<TUser extends BaseUser = BaseUser, TAction extends string = string> = Record<
  string,
  Record<string, PermissionActions<TAction, TUser>>
>;

export type PermitOptions<TUser extends BaseUser = BaseUser, TAction extends string = string> = {
  /** Called after every check. Useful for audit logging. */
  logger?: (
    result: 'allow' | 'deny',
    user: TUser | null | undefined,
    resource: string,
    action: string,
    data?: PermissionData,
  ) => void;
  /** Pre-load initial permissions at creation time. */
  initial?: PermitSnapshot<TUser, TAction>;
};

/* -------------------- Constants -------------------- */

export const WILDCARD = '*' as const;
export const ANONYMOUS = 'anonymous' as const;

/* -------------------- Helpers -------------------- */

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getUserRoles(user: BaseUser | null | undefined): string[] {
  if (!user?.id || !Array.isArray(user.roles)) return [ANONYMOUS, WILDCARD];
  // WILDCARD is appended last so specific roles always take precedence.
  return user.roles.map(normalize).concat(WILDCARD);
}

/* -------------------- Standalone Utilities -------------------- */

/**
 * Returns true if the user has the given role (case-insensitive).
 * Treats a null / missing-id / missing-roles user as `anonymous`.
 */
export function hasRole(user: BaseUser | null | undefined, role: string): boolean {
  if (!user?.id || !Array.isArray(user.roles)) return normalize(role) === ANONYMOUS;
  return user.roles.some((r) => normalize(r) === normalize(role));
}

/** Returns true if the user is unauthenticated (null, missing id, or missing roles). */
export function isAnonymous(user: BaseUser | null | undefined): boolean {
  return !user?.id || !Array.isArray(user.roles);
}

/* -------------------- Factory -------------------- */

export function createPermit<TUser extends BaseUser = BaseUser, TAction extends string = string>(
  opts: PermitOptions<TUser, TAction> = {},
): Permit<TUser, TAction> {
  const { logger } = opts;
  const permissions = new Map<string, Map<string, PermissionActions<TAction, TUser>>>();

  // Forward-declared so fluent register() can return the instance.
  let permit!: Permit<TUser, TAction>;

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: role iteration with rule precedence logic is inherently multi-branch
  function check(user: TUser | null | undefined, resource: string, action: TAction, data?: PermissionData): boolean {
    const normalizedResource = normalize(resource);
    const normalizedAction = normalize(action) as TAction;

    for (const role of getUserRoles(user)) {
      const rolePerms = permissions.get(role);
      if (!rolePerms) continue;

      const specific = rolePerms.get(normalizedResource);
      const resourcePerms = specific?.[normalizedAction] !== undefined ? specific : rolePerms.get(WILDCARD);
      if (!resourcePerms) continue;

      const permission = resourcePerms[normalizedAction];
      if (permission === undefined) continue;

      // The first role that has any opinion (true OR false) wins — stops here.
      // Null/undefined users cannot satisfy dynamic ownership checks — always false.
      const result =
        typeof permission === 'function' ? (user != null ? permission(user, data) : false) : Boolean(permission);
      logger?.(result ? 'allow' : 'deny', user, normalizedResource, normalizedAction, data);
      return result;
    }

    logger?.('deny', user, normalizedResource, normalizedAction, data);
    return false;
  }

  function register(
    role: string,
    resource: string,
    actions: PermissionActions<TAction, TUser>,
  ): Permit<TUser, TAction> {
    if (!role) throw new Error('Role is required');
    if (!resource) throw new Error('Resource is required');

    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    if (!permissions.has(normalizedRole)) permissions.set(normalizedRole, new Map());

    const rolePerms = permissions.get(normalizedRole)!;
    const existing = rolePerms.get(normalizedResource) ?? {};
    const normalizedActions = Object.fromEntries(
      Object.entries(actions).map(([k, v]) => [normalize(k), v]),
    ) as PermissionActions<TAction, TUser>;

    rolePerms.set(normalizedResource, { ...existing, ...normalizedActions });

    return permit;
  }

  function grant(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction> {
    return register(
      role,
      resource,
      Object.fromEntries(actions.map((a) => [a, true])) as PermissionActions<TAction, TUser>,
    );
  }

  function deny(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction> {
    return register(
      role,
      resource,
      Object.fromEntries(actions.map((a) => [a, false])) as PermissionActions<TAction, TUser>,
    );
  }

  function remove(role: string, resource?: string, action?: TAction): Permit<TUser, TAction> {
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
  function forUser(user: TUser | null | undefined): PermitGuard<TAction> {
    return {
      can: (resource, action, data) => check(user, resource, action, data),
      canAll: (resource, actions, data) => actions.every((a) => check(user, resource, a, data)),
      canAny: (resource, actions, data) => actions.some((a) => check(user, resource, a, data)),
    };
  }

  /** Returns a plain-object snapshot of all registered permissions. */
  function snapshot(): PermitSnapshot<TUser, TAction> {
    const result: PermitSnapshot<TUser, TAction> = {};
    for (const [role, resourceMap] of permissions) {
      result[role] = {};
      for (const [resource, actions] of resourceMap) {
        result[role][resource] = { ...actions };
      }
    }
    return result;
  }

  /** Restores permissions from a previously captured snapshot, replacing current state. */
  function restore(snap: PermitSnapshot<TUser, TAction>): Permit<TUser, TAction> {
    permissions.clear();
    for (const [role, resourceMap] of Object.entries(snap)) {
      for (const [resource, actions] of Object.entries(resourceMap)) {
        register(role, resource, actions);
      }
    }
    return permit;
  }

  function clear(): Permit<TUser, TAction> {
    permissions.clear();
    return permit;
  }

  permit = { check, clear, deny, for: forUser, grant, register, remove, restore, snapshot };

  if (opts.initial) restore(opts.initial);

  return permit;
}
