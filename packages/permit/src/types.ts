/* ============================================
   permit — Role-based permission engine
   ============================================ */

import { WILDCARD } from './constants';

/* -------------------- Core Types -------------------- */

export type PermissionData = Record<string, unknown>;

export type BaseUser = {
  id: string;
  roles: string[];
};

export type PermissionCheck<TUser extends BaseUser = BaseUser, TData extends PermissionData = PermissionData> =
  | boolean
  | ((user: TUser, data?: TData) => boolean);

/** Actions map for a role+resource pair. The `'*'` key acts as a wildcard action. */
export type PermissionActions<
  TAction extends string,
  TUser extends BaseUser = BaseUser,
  TData extends PermissionData = PermissionData,
> = Partial<Record<TAction | typeof WILDCARD, PermissionCheck<TUser, TData>>>;

/** Pre-bound guard for a specific user — returned by `permit.for(user)`. */
export type PermitGuard<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  /** Returns true if the user can perform the action on the resource. */
  can(resource: string, action: TAction, data?: TData): boolean;
  /** Returns true if the user can perform ALL of the given actions on the resource. */
  canAll(resource: string, actions: TAction[], data?: TData): boolean;
  /** Returns true if the user can perform ANY of the given actions on the resource. */
  canAny(resource: string, actions: TAction[], data?: TData): boolean;
};

/**
 * The public API returned by `createPermit`.
 * Defined as a named type so fluent methods can return `Permit` without
 * creating a circular `ReturnType<typeof createPermit>` reference.
 */
export type Permit<
  TUser extends BaseUser = BaseUser,
  TAction extends string = string,
  TData extends PermissionData = PermissionData,
> = {
  /** Check if user can perform the action on the resource. */
  check(user: TUser | null | undefined, resource: string, action: TAction, data?: TData): boolean;
  /** Returns true if the user can perform ALL of the given actions on the resource. */
  checkAll(user: TUser | null | undefined, resource: string, actions: TAction[], data?: TData): boolean;
  /** Returns true if the user can perform ANY of the given actions on the resource. */
  checkAny(user: TUser | null | undefined, resource: string, actions: TAction[], data?: TData): boolean;
  clear(): Permit<TUser, TAction, TData>;
  /** Define permissions for a role/resource pair using an actions map. Merges with existing. */
  define(
    role: string,
    resource: string,
    actions: PermissionActions<TAction, TUser, TData>,
  ): Permit<TUser, TAction, TData>;
  /** Shorthand to block one or more actions for a role on a resource. */
  deny(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction, TData>;
  /** Declares that `childRole` inherits all permissions of `parentRole`. Supports multiple levels. */
  extend(childRole: string, parentRole: string): Permit<TUser, TAction, TData>;
  /** Returns a pre-bound guard for a specific user. */
  for(user: TUser | null | undefined): PermitGuard<TAction, TData>;
  /** Shorthand to allow one or more actions for a role on a resource. */
  grant(role: string, resource: string, ...actions: TAction[]): Permit<TUser, TAction, TData>;
  remove(role: string): Permit<TUser, TAction, TData>;
  remove(role: string, resource: string): Permit<TUser, TAction, TData>;
  remove(role: string, resource: string, action: TAction): Permit<TUser, TAction, TData>;
  restore(state: PermitState<TUser, TAction, TData>): Permit<TUser, TAction, TData>;
  snapshot(): PermitState<TUser, TAction, TData>;
  /** Removes an inherited parent role. Omit `parentRole` to remove all parents for `childRole`. */
  unextend(childRole: string, parentRole?: string): Permit<TUser, TAction, TData>;
};

/**
 * Serializable permissions map (role → resource → actions).
 * Warning: dynamic (function) permissions are not JSON-serializable — use for in-memory transfer only.
 */
export type PermitSnapshot<
  TUser extends BaseUser = BaseUser,
  TAction extends string = string,
  TData extends PermissionData = PermissionData,
> = Record<string, Record<string, PermissionActions<TAction, TUser, TData>>>;

/**
 * Full state of a permit instance: permissions and role inheritance hierarchy.
 * Produced by `snapshot()` and accepted by `restore()` and `opts.initial`.
 * Warning: dynamic (function) permissions are not JSON-serializable — use for in-memory transfer only.
 */
export type PermitState<
  TUser extends BaseUser = BaseUser,
  TAction extends string = string,
  TData extends PermissionData = PermissionData,
> = {
  /** Role inheritance: child → parent roles. Omitted when empty. */
  hierarchy?: Record<string, string[]>;
  permissions: PermitSnapshot<TUser, TAction, TData>;
};

export type PermitOptions<
  TUser extends BaseUser = BaseUser,
  TAction extends string = string,
  TData extends PermissionData = PermissionData,
> = {
  /** Pre-load initial state (permissions and hierarchy) at creation time. */
  initial?: PermitState<TUser, TAction, TData>;
  /** Called after every check. Useful for audit logging. */
  logger?: (
    result: 'allow' | 'deny',
    user: TUser | null | undefined,
    resource: string,
    action: string,
    data?: TData,
  ) => void;
  /**
   * When `true`, configuration errors (e.g. calling `define()` with an empty actions map)
   * throw instead of silently continuing. Defaults to `false`.
   */
  strict?: boolean;
  /**
   * When `false`, registering a specific resource disables wildcard-resource fallback
   * for that resource entirely. Defaults to `true` (partial-override behaviour).
   */
  wildcardFallback?: boolean;
};
