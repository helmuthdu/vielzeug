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

export type DefineOptions = {
  /** Replace existing actions instead of merging. Default: false */
  replace?: boolean;
};

/**
 * The public API returned by `createPermit`.
 * Defined as a named interface so `define()` can return `Permit` without
 * creating a circular `ReturnType<typeof createPermit>` reference.
 */
export type Permit<TUser extends BaseUser = BaseUser, TAction extends string = string> = {
  check(user: TUser, resource: string, action: TAction, data?: PermissionData): boolean;
  define(
    role: string,
    resource: string,
    actions: PermissionActions<TAction, TUser>,
    opts?: DefineOptions,
  ): Permit<TUser, TAction>;
  for(user: TUser): (resource: string, action: TAction, data?: PermissionData) => boolean;
  remove(role: string, resource?: string, action?: TAction): void;
  snapshot(): PermitSnapshot<TAction, TUser>;
  clear(): void;
};

/** A plain-object snapshot of all registered permissions. */
export type PermitSnapshot<TAction extends string, TUser extends BaseUser = BaseUser> = Record<
  string,
  Record<string, PermissionActions<TAction, TUser>>
>;

export type PermitOptions<TUser extends BaseUser = BaseUser, TAction extends string = string> = {
  /** Called after every check. Useful for audit logging. */
  logger?: (result: 'allow' | 'deny', user: TUser, resource: string, action: string) => void;
  /** Pre-load initial permissions at creation time. */
  roles?: Record<string, Record<string, PermissionActions<TAction, TUser>>>;
};

/* -------------------- Constants -------------------- */

export const WILDCARD = '*';
export const ANONYMOUS = 'anonymous';

/* -------------------- Helpers -------------------- */

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getUserRoles(user: BaseUser): string[] {
  if (!user?.id || !Array.isArray(user.roles)) return [ANONYMOUS, WILDCARD];
  // WILDCARD is appended last so specific roles always take precedence.
  return user.roles.map(normalize).concat(WILDCARD);
}

/* -------------------- Standalone Utilities -------------------- */

/**
 * Returns true if the user has the given role (case-insensitive).
 * Treats a null / missing-id / missing-roles user as `anonymous`.
 */
export function hasRole(user: BaseUser, role: string): boolean {
  if (!user?.id || !Array.isArray(user.roles)) return normalize(role) === ANONYMOUS;
  return user.roles.some((r) => normalize(r) === normalize(role));
}

/** Returns true if the user is unauthenticated (null, missing id, or missing roles). */
export function isAnonymous(user: BaseUser): boolean {
  return !user?.id || !Array.isArray(user.roles);
}

/* -------------------- Factory -------------------- */

export function createPermit<TUser extends BaseUser = BaseUser, TAction extends string = string>(
  opts: PermitOptions<TUser, TAction> = {},
): Permit<TUser, TAction> {
  const { logger } = opts;
  const permissions = new Map<string, Map<string, PermissionActions<TAction, TUser>>>();

  // Forward-declared so fluent define() can return the instance.
  let permit!: Permit<TUser, TAction>;

  function check(user: TUser, resource: string, action: TAction, data?: PermissionData): boolean {
    const normalizedResource = normalize(resource);

    for (const role of getUserRoles(user)) {
      const rolePerms = permissions.get(role);
      if (!rolePerms) continue;

      // Prefer specific resource; if it exists but lacks this action, fall back
      // to the wildcard resource rather than skipping to the next role.
      const specific = rolePerms.get(normalizedResource);
      const resourcePerms =
        specific !== undefined
          ? specific[action] !== undefined
            ? specific
            : rolePerms.get(WILDCARD)
          : rolePerms.get(WILDCARD);
      if (!resourcePerms) continue;

      const permission = resourcePerms[action];
      if (permission === undefined) continue;

      // First role that has any opinion (true OR false) wins — stops here.
      const result = typeof permission === 'function' ? permission(user, data) : Boolean(permission);
      logger?.(result ? 'allow' : 'deny', user, normalizedResource, action);
      return result;
    }

    logger?.('deny', user, normalizedResource, action);
    return false;
  }

  function define(
    role: string,
    resource: string,
    actions: PermissionActions<TAction, TUser>,
    defineOpts: DefineOptions = {},
  ): Permit<TUser, TAction> {
    if (!role) throw new Error('Role is required');
    if (!resource) throw new Error('Resource is required');

    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    if (!permissions.has(normalizedRole)) permissions.set(normalizedRole, new Map());

    const rolePerms = permissions.get(normalizedRole)!;
    const existing = defineOpts.replace ? {} : (rolePerms.get(normalizedResource) ?? {});

    rolePerms.set(normalizedResource, { ...existing, ...actions });

    return permit;
  }

  function remove(role: string, resource?: string, action?: TAction): void {
    const normalizedRole = normalize(role);
    const rolePerms = permissions.get(normalizedRole);
    if (!rolePerms) return;

    if (!resource) {
      permissions.delete(normalizedRole);
      return;
    }

    const normalizedResource = normalize(resource);

    if (action) {
      const resourcePerms = rolePerms.get(normalizedResource);
      if (resourcePerms) {
        delete resourcePerms[action];
        if (Object.keys(resourcePerms).length === 0) rolePerms.delete(normalizedResource);
      }
    } else {
      rolePerms.delete(normalizedResource);
    }

    if (rolePerms.size === 0) permissions.delete(normalizedRole);
  }

  /**
   * Returns a pre-bound guard for a specific user.
   * Useful when making multiple checks for the same user in one scope.
   *
   * @example
   * ```ts
   * const can = permit.for(user);
   * can('posts', 'read');
   * can('posts', 'update', { authorId: user.id });
   * ```
   */
  function forUser(user: TUser): (resource: string, action: TAction, data?: PermissionData) => boolean {
    return (resource, action, data) => check(user, resource, action, data);
  }

  /** Returns a plain-object snapshot of all registered permissions. */
  function snapshot(): PermitSnapshot<TAction, TUser> {
    const result: PermitSnapshot<TAction, TUser> = {};
    for (const [role, resourceMap] of permissions) {
      result[role] = {};
      for (const [resource, actions] of resourceMap) {
        result[role][resource] = { ...actions };
      }
    }
    return result;
  }

  function clear(): void {
    permissions.clear();
  }

  permit = { check, define, for: forUser, remove, snapshot, clear };

  // Seed any initial permissions provided at construction time.
  if (opts.roles) {
    for (const [role, resources] of Object.entries(opts.roles)) {
      for (const [resource, actions] of Object.entries(resources)) {
        define(role, resource, actions);
      }
    }
  }

  return permit;
}
