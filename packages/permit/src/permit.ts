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

type ResourcePermissions<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Map<
  string,
  Partial<Record<PermissionAction, PermissionCheck<T, D>>>
>;

type RolesWithPermissions<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Map<
  string,
  ResourcePermissions<T, D>
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
 * Gets all roles for a user including the wildcard role.
 * Validates that the user has the required structure.
 */
function getUserRoles(user: BaseUser): Set<string> {
  if (!user?.id || !Array.isArray(user.roles)) {
    Logit.warn('Invalid user object provided to permission check', { user });
    return new Set([WILDCARD]);
  }

  const roles = new Set(user.roles);
  roles.add(WILDCARD);
  return roles;
}

/**
 * Gets resource permissions for a specific role and resource.
 * Returns permissions for the specific resource or wildcard resource.
 */
function getResourcePermissions<T extends BaseUser, D extends PermissionData>(
  role: string,
  resource: string,
): Partial<Record<PermissionAction, PermissionCheck<T, D>>> | undefined {
  const rolePermissions = Roles.get(role);
  if (!rolePermissions) return undefined;

  return rolePermissions.get(resource) || rolePermissions.get(WILDCARD);
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
  Logit.setPrefix('Permit');
  Logit.debug(`Permission check: User ${user.id} - ${action} on ${resource} -> ${allowed}`);
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
   */
  check<T extends BaseUser, D extends PermissionData>(
    user: T,
    resource: string,
    action: PermissionAction,
    data?: D,
  ): boolean {
    const userRoles = getUserRoles(user);

    for (const role of userRoles) {
      const resourcePermissions = getResourcePermissions<T, D>(role, resource);
      if (!resourcePermissions) continue;

      const permission = resourcePermissions[action];
      if (permission === undefined) continue;

      if (evaluatePermission(permission, user, data)) {
        logPermissionCheck(user, resource, action, true);
        return true;
      }
    }

    logPermissionCheck(user, resource, action, false);
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
    Logit.setPrefix('Permit');
    Logit.debug('All permissions have been cleared.');
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

    if (!Roles.has(role)) {
      Roles.set(role, new Map());
    }

    const rolePermissions = Roles.get(role);
    if (rolePermissions) {
      const existingPermissions = rolePermissions.get(resource) || {};

      // Merge new actions with existing ones
      const mergedPermissions = { ...existingPermissions, ...actions };
      rolePermissions.set(resource, mergedPermissions as Partial<Record<PermissionAction, PermissionCheck>>);
    }

    Logit.setPrefix('Permit');
    Logit.debug(`Permissions for role '${role}' and resource '${resource}' registered/updated.`);
  },

  /**
   * Returns a copy of all registered roles and their permissions.
   *
   * @remarks
   * This returns a shallow copy of the permissions registry to prevent direct external modification.
   * Note: Nested Maps are not deep-cloned, so modifying nested structures may affect the internal state.
   * Useful for debugging or inspecting the current permission configuration.
   */
  get roles(): RolesWithPermissions {
    return new Map(Roles);
  },
};
