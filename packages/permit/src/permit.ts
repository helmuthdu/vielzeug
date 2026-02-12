import { Logit } from '@vielzeug/logit';

/* -------------------- Core Types -------------------- */

export type PermissionData = Record<string, unknown>;

export type BaseUser = {
  id: string;
  roles: string[];
};

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export type PermissionCheck<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> =
  | boolean
  | ((user: T, data?: D) => boolean);

/* -------------------- Constants -------------------- */

export const WILDCARD = '*';
export const ANONYMOUS = 'anonymous';

const VALID_ACTIONS = new Set<PermissionAction>(['create', 'read', 'update', 'delete']);

/* -------------------- Internal Storage -------------------- */

type PermissionMap<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Partial<
  Record<PermissionAction, PermissionCheck<T, D>>
>;

type ResourcePermissions<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Map<
  string,
  PermissionMap<T, D>
>;

type RolesMap<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Map<
  string,
  ResourcePermissions<T, D>
>;

const permissions: RolesMap = new Map();

/* -------------------- Helper Functions -------------------- */

/**
 * Normalizes a string to lowercase and trimmed.
 * Prevents case-sensitivity and whitespace issues.
 */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Gets all roles for a user, including WILDCARD.
 * Returns an ANONYMOUS role if the user is invalid.
 */
function getUserRoles(user: BaseUser): string[] {
  // Validate user structure
  if (!user?.id || !Array.isArray(user.roles)) {
    return [ANONYMOUS, WILDCARD];
  }

  // Return user roles + wildcard (checked last for proper precedence)
  return [...user.roles.map(normalize), WILDCARD];
}

/**
 * Evaluates a permission check (boolean or function).
 */
function evaluatePermission<T extends BaseUser, D extends PermissionData>(
  permission: PermissionCheck<T, D>,
  user: T,
  data?: D,
): boolean {
  if (typeof permission === 'function') {
    return permission(user, data);
  }
  return Boolean(permission);
}

/**
 * Validates that an action is valid.
 */
function validateAction(action: string): void {
  if (!VALID_ACTIONS.has(action as PermissionAction)) {
    throw new Error(`Invalid action '${action}'. Valid actions: ${Array.from(VALID_ACTIONS).join(', ')}`);
  }
}

/* -------------------- Public API -------------------- */

export const Permit = {
  /**
   * Checks if a user has permission to perform an action on a resource.
   *
   * @example
   * ```ts
   * const user = { id: '123', roles: ['editor'] };
   *
   * // Simple boolean permission
   * Permit.check(user, 'posts', 'read'); // true/false
   *
   * // Function-based permission with data
   * Permit.check(user, 'posts', 'update', { authorId: '123' }); // true if user owns post
   * ```
   *
   * @param user - User object with id and roles
   * @param resource - Resource identifier (e.g., 'posts', 'comments')
   * @param action - Action to check ('create', 'read', 'update', 'delete')
   * @param data - Optional contextual data for function-based permissions
   * @returns True if permission granted, false otherwise
   */
  check<T extends BaseUser, D extends PermissionData>(
    user: T,
    resource: string,
    action: PermissionAction,
    data?: D,
  ): boolean {
    const normalizedResource = normalize(resource);
    const userRoles = getUserRoles(user);

    // Check each role until we find a match
    for (const role of userRoles) {
      const rolePerms = permissions.get(normalize(role));
      if (!rolePerms) continue;

      // Check specific resource, then wildcard resource
      const resourcePerms = rolePerms.get(normalizedResource) || rolePerms.get(WILDCARD);
      if (!resourcePerms) continue;

      const permission = resourcePerms[action];
      if (permission === undefined) continue;

      // Found a permission - evaluate it
      if (evaluatePermission(permission, user, data)) {
        Logit.scope('Permit').debug(`✅ ${user?.id || 'unknown'} can ${action} ${normalizedResource}`);
        return true;
      }
    }

    Logit.scope('Permit').debug(`❌ ${user?.id || 'unknown'} cannot ${action} ${normalizedResource}`);
    return false;
  },

  /**
   * Clears all registered permissions.
   * Useful for testing or reinitializing the permission system.
   */
  clear(): void {
    permissions.clear();
    Logit.scope('Permit').debug('All permissions cleared');
  },

  /**
   * Checks if a user has a specific role.
   *
   * @example
   * ```ts
   * const user = { id: '123', roles: ['admin', 'editor'] };
   * Permit.hasRole(user, 'admin'); // true
   * Permit.hasRole(user, 'viewer'); // false
   * ```
   */
  hasRole(user: BaseUser, role: string): boolean {
    if (!user?.id || !Array.isArray(user.roles)) {
      return normalize(role) === ANONYMOUS;
    }

    const normalizedRole = normalize(role);
    return user.roles.some((r) => normalize(r) === normalizedRole);
  },

  /**
   * Registers permissions for a role and resource.
   *
   * @example
   * ```ts
   * // Simple boolean permissions
   * Permit.register('viewer', 'posts', {
   *   read: true,
   *   create: false
   * });
   *
   * // Function-based permissions
   * Permit.register('editor', 'posts', {
   *   read: true,
   *   update: (user, data) => user.id === data?.authorId,
   *   delete: (user, data) => user.id === data?.authorId
   * });
   *
   * // Wildcard permissions
   * Permit.register('admin', '*', {
   *   create: true,
   *   read: true,
   *   update: true,
   *   delete: true
   * });
   * ```
   *
   * @param role - Role name (e.g., 'admin', 'editor', 'viewer')
   * @param resource - Resource name or '*' for all resources
   * @param actions - Permission actions to register
   */
  register<T extends BaseUser, D extends PermissionData>(
    role: string,
    resource: string,
    actions: Partial<Record<PermissionAction, PermissionCheck<T, D>>>,
  ): void {
    if (!role) throw new Error('Role is required');
    if (!resource) throw new Error('Resource is required');

    // Validate actions
    for (const action of Object.keys(actions)) {
      validateAction(action);
    }

    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    // Get or create role permissions
    if (!permissions.has(normalizedRole)) {
      permissions.set(normalizedRole, new Map());
    }

    const rolePerms = permissions.get(normalizedRole)!;
    const existingPerms = rolePerms.get(normalizedResource) || {};

    // Merge permissions
    rolePerms.set(normalizedResource, { ...existingPerms, ...actions } as PermissionMap);

    Logit.scope('Permit').debug(`Registered permissions for ${normalizedRole}:${normalizedResource}`);
  },

  /**
   * Gets all registered permissions as a deep copy.
   * Alias for snapshot() to maintain backward compatibility.
   *
   * @example
   * ```ts
   * const allPerms = Permit.roles;
   * console.log(allPerms.get('admin')?.get('posts')?.read);
   * ```
   */
  get roles(): RolesMap {
    return this.snapshot();
  },

  /**
   * Sets permissions for a role and resource.
   * By default, merges with existing permissions. Use replace=true to replace entirely.
   *
   * @example
   * ```ts
   * // Merge with existing
   * Permit.set('admin', 'posts', { read: true });
   * Permit.set('admin', 'posts', { create: true }); // Now has both read and create
   *
   * // Replace existing
   * Permit.set('admin', 'posts', { delete: true }, true); // Now only has delete
   * ```
   */
  set<T extends BaseUser, D extends PermissionData>(
    role: string,
    resource: string,
    actions: Partial<Record<PermissionAction, PermissionCheck<T, D>>>,
    replace = false,
  ): void {
    if (!role) throw new Error('Role is required');
    if (!resource) throw new Error('Resource is required');

    // Validate actions
    for (const action of Object.keys(actions)) {
      validateAction(action);
    }

    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    // Get or create role permissions
    if (!permissions.has(normalizedRole)) {
      permissions.set(normalizedRole, new Map());
    }

    const rolePerms = permissions.get(normalizedRole)!;

    if (replace) {
      // Replace entirely
      rolePerms.set(normalizedResource, actions as PermissionMap);
    } else {
      // Merge with existing
      const existingPerms = rolePerms.get(normalizedResource) || {};
      rolePerms.set(normalizedResource, { ...existingPerms, ...actions } as PermissionMap);
    }

    Logit.scope('Permit').debug(
      `${replace ? 'Replaced' : 'Set'} permissions for ${normalizedRole}:${normalizedResource}`,
    );
  },

  /**
   * Gets a snapshot of all registered permissions.
   * Returns a deep copy to prevent external modification.
   *
   * @example
   * ```ts
   * const snapshot = Permit.snapshot();
   * console.log(snapshot.get('admin')?.get('posts')?.read); // true/false/function
   * ```
   */
  snapshot(): RolesMap {
    const copy = new Map();

    for (const [role, resourcePerms] of permissions.entries()) {
      const resourceCopy = new Map();

      for (const [resource, actions] of resourcePerms.entries()) {
        resourceCopy.set(resource, { ...actions });
      }

      copy.set(role, resourceCopy);
    }

    return copy;
  },

  /**
   * Unregisters permissions for a role and resource.
   *
   * @example
   * ```ts
   * // Remove all permissions for a role-resource combo
   * Permit.unregister('editor', 'posts');
   *
   * // Remove specific action
   * Permit.unregister('editor', 'posts', 'delete');
   * ```
   */
  unregister(role: string, resource: string, action?: PermissionAction): void {
    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    const rolePerms = permissions.get(normalizedRole);
    if (!rolePerms) return;

    if (action) {
      // Remove a specific action
      const resourcePerms = rolePerms.get(normalizedResource);
      if (resourcePerms) {
        delete resourcePerms[action];

        // Clean up if no actions remain
        if (Object.keys(resourcePerms).length === 0) {
          rolePerms.delete(normalizedResource);
        }
      }
    } else {
      // Remove all actions for resource
      rolePerms.delete(normalizedResource);
    }

    // Clean up if no resources remain
    if (rolePerms.size === 0) {
      permissions.delete(normalizedRole);
    }

    Logit.scope('Permit').debug(`Unregistered ${normalizedRole}:${normalizedResource}${action ? `:${action}` : ''}`);
  },
};
