/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { Logit } from '@vielzeug/logit';

export type BaseUser = {
  id: string;
  roles: string[];
};
type PermissionAction = 'view' | 'create' | 'update' | 'delete';
type PermissionCheck<T extends BaseUser = BaseUser, D extends Record<string, any> = Record<string, any>> =
  | boolean
  | ((user: T, data: D) => boolean);
type ResourcePermissions<T extends BaseUser = BaseUser, D extends Record<string, any> = Record<string, any>> = Map<
  string,
  Partial<Record<PermissionAction, PermissionCheck<T, D>>>
>;
type RolesWithPermissions<T extends BaseUser = BaseUser, D extends Record<string, any> = Record<string, any>> = Map<
  string,
  ResourcePermissions<T, D>
>;

const Roles: RolesWithPermissions = new Map();

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
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
  check<T extends BaseUser, D extends Record<string, any>>(
    user: T,
    resource: string,
    action: PermissionAction,
    data?: D,
  ): boolean {
    // Use Set to avoid duplicate roles
    const allRoles = new Set([...(user.roles || []), '*']);
    for (const role of allRoles) {
      const rolePermissions = Roles.get(role);
      if (!rolePermissions) continue;
      const resourcePermissions = rolePermissions.get(resource) || rolePermissions.get('*');
      if (!resourcePermissions) continue;
      const permission = resourcePermissions[action];
      if (typeof permission === 'function') {
        if (data === undefined) continue;
        if (permission(user, data)) {
          Logit.debug(`Permission check: User ${user.id} - ${action} on ${resource} -> true`);
          return true;
        }
      } else if (permission) {
        Logit.debug(`Permission check: User ${user.id} - ${action} on ${resource} -> true`);
        return true;
      }
    }
    Logit.debug(`Permission check: User ${user.id} - ${action} on ${resource} -> false`);
    return false;
  },

  clear() {
    Roles.clear();
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
   * If a permission already exists for the role and resource, it will be updated with the new actions.
   *
   * @param role - The role to register permissions for (e.g., 'admin', 'user').
   * @param resource - The resource identifier (e.g., 'posts', 'comments').
   * @param actions - An object containing the actions and their corresponding permission checks.
   *
   * @throws {Error} If the role or resource is not provided.
   */
  register<T extends BaseUser, D extends Record<string, any>>(
    role: string,
    resource: string,
    actions: Partial<Record<PermissionAction, PermissionCheck<T, D>>>,
  ): void {
    if (!role || !resource) {
      throw new Error('Invalid arguments provided to register permissions.');
    }
    let rolePermissions = Roles.get(role);
    if (!rolePermissions) {
      rolePermissions = new Map();
      Roles.set(role, rolePermissions);
    }
    const existing = rolePermissions.get(resource) || {};
    // Merge new actions with existing ones
    const resourcePermissions = { ...existing, ...actions };
    rolePermissions.set(resource, resourcePermissions as any);
    Logit.debug(`Permissions for role '${role}' and resource '${resource}' registered/updated.`);
  },

  get roles() {
    return new Map(Roles);
  },
};
