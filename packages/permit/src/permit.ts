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

export type PermissionActions<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Partial<
  Record<PermissionAction, PermissionCheck<T, D>>
>;

/* -------------------- Constants -------------------- */

export const WILDCARD = '*';
export const ANONYMOUS = 'anonymous';

const VALID_ACTIONS = new Set<PermissionAction>(['create', 'read', 'update', 'delete']);

/* -------------------- Internal Storage -------------------- */

export type RolesMap<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> = Map<
  string,
  Map<string, PermissionActions<T, D>>
>;

/* -------------------- Helper Functions -------------------- */

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getUserRoles(user: BaseUser): string[] {
  if (!user?.id || !Array.isArray(user.roles)) return [ANONYMOUS, WILDCARD];
  return [...user.roles.map(normalize), WILDCARD];
}

function evaluatePermission<T extends BaseUser, D extends PermissionData>(
  permission: PermissionCheck<T, D>,
  user: T,
  data?: D,
): boolean {
  return typeof permission === 'function' ? permission(user, data) : Boolean(permission);
}

function validateActions(actions: object): void {
  for (const action of Object.keys(actions)) {
    if (!VALID_ACTIONS.has(action as PermissionAction)) {
      throw new Error(`Invalid action '${action}'. Valid actions: ${[...VALID_ACTIONS].join(', ')}`);
    }
  }
}

/* -------------------- Permit Class -------------------- */

export class Permit<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData> {
  private permissions: RolesMap<T, D> = new Map();
  private log = Logit.scope('Permit');

  /**
   * Checks if a user has permission to perform an action on a resource.
   *
   * @example
   * ```ts
   * const user = { id: '123', roles: ['editor'] };
   * permit.check(user, 'posts', 'read');
   * permit.check(user, 'posts', 'update', { authorId: '123' });
   * ```
   */
  check(user: T, resource: string, action: PermissionAction, data?: D): boolean {
    const normalizedResource = normalize(resource);

    for (const role of getUserRoles(user)) {
      const rolePerms = this.permissions.get(role);
      if (!rolePerms) continue;

      const resourcePerms = rolePerms.get(normalizedResource) ?? rolePerms.get(WILDCARD);
      if (!resourcePerms) continue;

      const permission = resourcePerms[action];
      if (permission === undefined) continue;

      if (evaluatePermission(permission, user, data)) {
        this.log.debug(`✅ ${user?.id ?? 'unknown'} can ${action} ${normalizedResource}`);
        return true;
      }
    }

    this.log.debug(`❌ ${user?.id ?? 'unknown'} cannot ${action} ${normalizedResource}`);
    return false;
  }

  /**
   * Registers or updates permissions for a role and resource.
   * Merges with existing by default; pass `replace=true` to overwrite entirely.
   *
   * @example
   * ```ts
   * permit.set('admin', '*', { create: true, read: true, update: true, delete: true });
   * permit.set('editor', 'posts', { update: (user, data) => user.id === data?.authorId });
   * permit.set('admin', 'posts', { delete: true }, true); // replace
   * ```
   */
  set(role: string, resource: string, actions: PermissionActions<T, D>, replace = false): void {
    if (!role) throw new Error('Role is required');
    if (!resource) throw new Error('Resource is required');

    validateActions(actions);

    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    if (!this.permissions.has(normalizedRole)) this.permissions.set(normalizedRole, new Map());

    const rolePerms = this.permissions.get(normalizedRole)!;
    const merged = replace ? {} : (rolePerms.get(normalizedResource) ?? {});

    rolePerms.set(normalizedResource, { ...merged, ...actions } as PermissionActions<T, D>);
    this.log.debug(`${replace ? 'Replaced' : 'Set'} permissions for ${normalizedRole}:${normalizedResource}`);
  }

  /**
   * Removes permissions for a role/resource, or a single action if specified.
   * Cleans up empty role and resource entries automatically.
   *
   * @example
   * ```ts
   * permit.remove('editor', 'posts');           // remove all actions
   * permit.remove('editor', 'posts', 'delete'); // remove one action
   * ```
   */
  remove(role: string, resource: string, action?: PermissionAction): void {
    const normalizedRole = normalize(role);
    const normalizedResource = normalize(resource);

    const rolePerms = this.permissions.get(normalizedRole);
    if (!rolePerms) return;

    if (action) {
      const resourcePerms = rolePerms.get(normalizedResource);
      if (resourcePerms) {
        delete resourcePerms[action];
        if (Object.keys(resourcePerms).length === 0) rolePerms.delete(normalizedResource);
      }
    } else {
      rolePerms.delete(normalizedResource);
    }

    if (rolePerms.size === 0) this.permissions.delete(normalizedRole);

    this.log.debug(`Removed ${normalizedRole}:${normalizedResource}${action ? `:${action}` : ''}`);
  }

  /**
   * Checks if a user has a specific role (case-insensitive).
   */
  hasRole(user: BaseUser, role: string): boolean {
    if (!user?.id || !Array.isArray(user.roles)) return normalize(role) === ANONYMOUS;
    const normalizedRole = normalize(role);
    return user.roles.some((r) => normalize(r) === normalizedRole);
  }

  /**
   * Returns a deep copy of all registered permissions.
   */
  get roles(): RolesMap<T, D> {
    const copy: RolesMap<T, D> = new Map();
    for (const [role, resourcePerms] of this.permissions) {
      const resourceCopy = new Map<string, PermissionActions<T, D>>();
      for (const [resource, actions] of resourcePerms) resourceCopy.set(resource, { ...actions });
      copy.set(role, resourceCopy);
    }
    return copy;
  }

  /**
   * Clears all registered permissions.
   */
  clear(): void {
    this.permissions.clear();
    this.log.debug('All permissions cleared');
  }
}

/* -------------------- Factory Function -------------------- */

export function createPermit<T extends BaseUser = BaseUser, D extends PermissionData = PermissionData>(): Permit<T, D> {
  return new Permit<T, D>();
}
