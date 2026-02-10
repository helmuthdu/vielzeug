/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { Logit } from '@vielzeug/logit';

/**
 * Type alias for contextual data used in permission checks.
 */
export type PermissionData = Record<string, any>;

export type BaseUser = {
  id: string;
  roles: string[];
};

export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

export type PermissionCheck<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> =
  | boolean
  | ((user: T, data: D) => boolean);

export type ResourcePermissions<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Map<
  string,
  Partial<Record<PermissionAction, PermissionCheck<T, D>>>
>;

export type RolesWithPermissions<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Map<
  string,
  ResourcePermissions<T, D>
>;

export type PermissionMap<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Partial<
  Record<PermissionAction, PermissionCheck<T, D>>
>;

/**
 * Global registry of role-based permissions.
 */
const Roles: RolesWithPermissions = new Map();

/**
 * Wildcard role/resource identifier that matches any role or resource.
 * Can be used to define permissions that apply to all roles or all resources.
 */
export const WILDCARD = '*';

/**
 * Anonymous role identifier for unauthenticated users.
 * Safer than using wildcard for malformed user objects.
 */
export const ANONYMOUS = 'anonymous';

/**
 * Valid permission actions for runtime validation.
 */
const VALID_ACTIONS: Set<PermissionAction> = new Set(['view', 'create', 'update', 'delete']);

/**
 * Normalizes a role or resource string by trimming and converting to lowercase.
 * Prevents subtle mismatches due to whitespace or casing differences.
 */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Gets all roles for a user including the wildcard role.
 * Validates that the user has the required structure.
 *
 * @remarks
 * - If user is malformed (missing id or roles), returns only the ANONYMOUS role.
 * - ANONYMOUS role should be used for permissions that apply to unauthenticated users.
 * - WILDCARD role is added last to ensure specific roles are checked first.
 * - Roles are normalized (trimmed and lowercased) to prevent mismatches.
 */
function getUserRoles(user: BaseUser): string[] {
  if (!user?.id || !Array.isArray(user.roles)) {
    Logit.warn('Invalid user object provided to permission check', { user });
    return [normalize(ANONYMOUS), normalize(WILDCARD)];
  }

  // Normalize all roles and add wildcard last for proper precedence
  const normalizedRoles = user.roles.map(normalize);
  normalizedRoles.push(normalize(WILDCARD));

  return normalizedRoles;
}

/**
 * Gets resource permissions for a specific role and resource.
 * Returns permissions for the specific resource or wildcard resource.
 */
function getResourcePermissions<T extends BaseUser, D extends PermissionData>(
  role: string,
  resource: string,
): PermissionMap<T, D> | undefined {
  const rolePermissions = Roles.get(normalize(role));
  if (!rolePermissions) return undefined;

  return rolePermissions.get(normalize(resource)) || rolePermissions.get(normalize(WILDCARD));
}

/**
 * Evaluates a permission check (boolean or function).
 * Function-based permissions require data to be provided.
 */
function evaluatePermission<T extends BaseUser, D extends PermissionData>(
  permission: PermissionCheck<T, D>,
  user: T,
  data?: D,
): boolean {
  if (typeof permission === 'function') {
    // Function permissions require data to evaluate
    return data !== undefined && permission(user, data);
  }

  return Boolean(permission);
}

/**
 * Logs the result of a permission check with a consistent prefix.
 */
function logPermissionCheck(user: BaseUser, resource: string, action: PermissionAction, allowed: boolean): void {
  const userId = user?.id || 'malformed-user';
  Logit.setPrefix('Permit');
  Logit.debug(`Permission check: User ${userId} - ${action} on ${resource} -> ${allowed}`);
}

/**
 * Logs a debug message with Permit prefix.
 */
function logDebug(message: string): void {
  Logit.setPrefix('Permit');
  Logit.debug(message);
}

export const Permit = {
  /**
   * Determines whether a user has permission to perform a specific action on a given resource.
   *
   * @example
   * ```ts
   * const user = { id: '123', roles: ['admin'] };
   * const resource = 'posts';
   * Permit.check(user, resource, 'view'); // true;
   * ```
   *
   * @param user - The user object containing information about the user's roles.
   * @param resource - The resource identifier to check permissions for.
   * @param action - The action to check permission for, such as "view", "create", "update", or "delete".
   * @param [data] - Optional contextual data used for evaluating dynamic permissions.
   *
   * @return Returns true if the user is allowed to perform the action on the resource; otherwise, false.
   *
   * @remarks
   * - Permission check uses "allow on any true" policy - first matching allow grants access.
   * - Specific roles are checked before wildcard role for proper precedence.
   * - Resource names and roles are normalized (trimmed and lowercased).
   */
  check<T extends BaseUser, D extends PermissionData>(
    user: T,
    resource: string,
    action: PermissionAction,
    data?: D,
  ): boolean {
    const normalizedResource = normalize(resource);
    const userRoles = getUserRoles(user);

    for (const role of userRoles) {
      const resourcePermissions = getResourcePermissions<T, D>(role, normalizedResource);
      if (!resourcePermissions) continue;

      const permission = resourcePermissions[action];
      if (permission === undefined) continue;

      if (evaluatePermission(permission, user, data)) {
        logPermissionCheck(user, normalizedResource, action, true);
        return true;
      }
    }

    logPermissionCheck(user, normalizedResource, action, false);
    return false;
  },

  /**
   * Clears all registered permissions.
   *
   * @remarks
   * This removes all role-resource-action mappings from the permission registry.
   * Useful for resetting permissions during testing or application reinitialization.
   */
  clear(): void {
    Roles.clear();
    logDebug('All permissions have been cleared.');
  },

  /**
   * Checks if a user has a specific role.
   *
   * @param user - The user object.
   * @param role - The role to check for.
   * @returns True if the user has the role, false otherwise.
   *
   * @remarks
   * Performs normalized role comparison (case-insensitive, trimmed).
   */
  hasRole(user: BaseUser, role: string): boolean {
    if (!user?.id || !Array.isArray(user.roles)) {
      return normalize(role) === normalize(ANONYMOUS);
    }

    const normalizedRole = normalize(role);
    return user.roles.some((r) => normalize(r) === normalizedRole);
  },

  /**
   * Registers a new permission for a specific role and resource.
   *
   * @example
   * ```ts
   * Permit.register('admin', 'posts', {
   *   view: true,
   *   create: (user, data) => user.id === data.authorId,
   *   update: (user, data) => user.id === data.authorId,
   *   delete: false,
   * });
   * ```
   *
   * @remarks
   * This function allows you to define permissions for a specific role and resource.
   * You can specify which actions (view, create, update, delete) are allowed for that role on the resource.
   * If a permission already exists for the role and resource, it will be merged with the new actions.
   *
   * @param role - The role to register permissions for (e.g., 'admin', 'user').
   * @param resource - The resource identifier (e.g., 'posts', 'comments').
   * @param actions - An object containing the actions and their corresponding permission checks.
   *
   * @throws {Error} If the role or resource is not provided.
   * @throws {Error} If an invalid action is provided.
   */
  register<T extends BaseUser, D extends PermissionData>(
    role: string,
    resource: string,
    actions: Partial<Record<PermissionAction, PermissionCheck<T, D>>>,
  ): void {
    if (!role) {
      throw new Error('Role is required to register permissions.');
    }
    if (!resource) {
      throw new Error('Resource is required to register permissions.');
    }

    // Validate action keys
    for (const action of Object.keys(actions)) {
      if (!VALID_ACTIONS.has(action as PermissionAction)) {
        throw new Error(`Invalid action '${action}'. Valid actions are: ${Array.from(VALID_ACTIONS).join(', ')}`);
      }
    }

    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    if (!Roles.has(normalizedRole)) {
      Roles.set(normalizedRole, new Map());
    }

    const rolePermissions = Roles.get(normalizedRole);
    if (rolePermissions) {
      const existingPermissions = rolePermissions.get(normalizedResource) || {};

      // Merge new actions with existing ones
      const mergedPermissions = { ...existingPermissions, ...actions };
      rolePermissions.set(normalizedResource, mergedPermissions as Partial<Record<PermissionAction, PermissionCheck>>);
    }

    logDebug(`Permissions for role '${normalizedRole}' and resource '${normalizedResource}' registered/updated.`);
  },

  /**
   * Returns a deep copy of all registered roles and their permissions.
   *
   * @remarks
   * Returns a deep copy of the permissions registry to prevent external modification.
   * Useful for debugging or inspecting the current permission configuration.
   */
  get roles(): RolesWithPermissions {
    const copy = new Map();

    for (const [role, resourcePermissions] of Roles.entries()) {
      const resourceCopy = new Map();

      for (const [resource, actions] of resourcePermissions.entries()) {
        resourceCopy.set(resource, { ...actions });
      }

      copy.set(role, resourceCopy);
    }

    return copy;
  },

  /**
   * Sets permissions for a role and resource, optionally replacing existing permissions.
   *
   * @param role - The role to set permissions for.
   * @param resource - The resource identifier.
   * @param actions - The permission actions to set.
   * @param replace - If true, replaces existing permissions; if false, merges (default: false).
   *
   * @throws {Error} If the role or resource is not provided.
   * @throws {Error} If an invalid action is provided.
   */
  set<T extends BaseUser, D extends PermissionData>(
    role: string,
    resource: string,
    actions: Partial<Record<PermissionAction, PermissionCheck<T, D>>>,
    replace = false,
  ): void {
    if (!role) {
      throw new Error('Role is required to set permissions.');
    }
    if (!resource) {
      throw new Error('Resource is required to set permissions.');
    }

    // Validate action keys
    for (const action of Object.keys(actions)) {
      if (!VALID_ACTIONS.has(action as PermissionAction)) {
        throw new Error(`Invalid action '${action}'. Valid actions are: ${Array.from(VALID_ACTIONS).join(', ')}`);
      }
    }

    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    if (!Roles.has(normalizedRole)) {
      Roles.set(normalizedRole, new Map());
    }

    const rolePermissions = Roles.get(normalizedRole);
    if (rolePermissions) {
      if (replace) {
        rolePermissions.set(normalizedResource, actions as Partial<Record<PermissionAction, PermissionCheck>>);
      } else {
        const existingPermissions = rolePermissions.get(normalizedResource) || {};
        const mergedPermissions = { ...existingPermissions, ...actions };
        rolePermissions.set(
          normalizedResource,
          mergedPermissions as Partial<Record<PermissionAction, PermissionCheck>>,
        );
      }
    }

    logDebug(
      `Permissions for role '${normalizedRole}' and resource '${normalizedResource}' ${replace ? 'replaced' : 'updated'}.`,
    );
  },

  /**
   * Unregisters permissions for a role and resource.
   *
   * @param role - The role to unregister permissions from.
   * @param resource - The resource identifier.
   * @param action - Optional specific action to remove. If not provided, removes all actions for the resource.
   */
  unregister(role: string, resource: string, action?: PermissionAction): void {
    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    const rolePermissions = Roles.get(normalizedRole);
    if (!rolePermissions) return;

    if (action) {
      const resourcePermissions = rolePermissions.get(normalizedResource);
      if (resourcePermissions) {
        delete resourcePermissions[action];

        // Remove resource entry if no actions remain
        if (Object.keys(resourcePermissions).length === 0) {
          rolePermissions.delete(normalizedResource);
        }
      }
    } else {
      rolePermissions.delete(normalizedResource);
    }

    // Remove role entry if no resources remain
    if (rolePermissions.size === 0) {
      Roles.delete(normalizedRole);
    }

    logDebug(
      `Permissions for role '${normalizedRole}' and resource '${normalizedResource}'${action ? ` action '${action}'` : ''} unregistered.`,
    );
  },
};
