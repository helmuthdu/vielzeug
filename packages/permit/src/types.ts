import { WILDCARD } from './constants';

export type PermissionData = unknown;

export type UserPrincipal = {
  attributes?: Record<string, unknown>;
  id: string;
  roles: readonly string[];
};

export type Principal = UserPrincipal | null;

export type PermitEffect = 'allow' | 'deny';

export type PredicateContext<TData extends PermissionData = PermissionData> = {
  data?: TData;
  principal: UserPrincipal;
};

export type PermitPredicate<TData extends PermissionData = PermissionData> = (ctx: PredicateContext<TData>) => boolean;

export type PermitRule<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  action: TAction | typeof WILDCARD;
  effect: PermitEffect;
  priority?: number;
  resource: string;
  role: string;
  when?: PermitPredicate<TData>;
};

export type PermitDecision<TAction extends string = string, TData extends PermissionData = PermissionData> =
  | { allowed: true; rule: PermitRule<TAction, TData> }
  | { allowed: false; reason: 'no-matching-rule' | 'explicit-deny'; rule?: PermitRule<TAction, TData> };

export type Permit<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  allowedActions(principal: Principal, resource: string, data?: TData): TAction[];
  can(principal: Principal, resource: string, action: TAction, data?: TData): boolean;
  canAll(principal: Principal, resource: string, actions: TAction[], data?: TData): boolean;
  canAny(principal: Principal, resource: string, actions: TAction[], data?: TData): boolean;
  clear(): Permit<TAction, TData>;
  explain(principal: Principal, resource: string, action: TAction, data?: TData): PermitDecision<TAction, TData>;
  forUser(principal: UserPrincipal, cache?: boolean): BoundPermit<TAction, TData>;
  replace(rules: readonly PermitRule<TAction, TData>[]): Permit<TAction, TData>;
  rules(): PermitRule<TAction, TData>[];
  set(rule: PermitRule<TAction, TData> | readonly PermitRule<TAction, TData>[]): Permit<TAction, TData>;
};

/**
 * Internal bound permit type. Do not use directly—the result of forUser() is typed as Permit.
 * @internal
 */
export type BoundPermit<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  allowedActions(resource: string, data?: TData): TAction[];
  can(resource: string, action: TAction, data?: TData): boolean;
  canAll(resource: string, actions: TAction[], data?: TData): boolean;
  canAny(resource: string, actions: TAction[], data?: TData): boolean;
  clear(): Permit<TAction, TData>;
  explain(resource: string, action: TAction, data?: TData): PermitDecision<TAction, TData>;
  forUser(principal: UserPrincipal, cache?: boolean): BoundPermit<TAction, TData>;
  replace(rules: readonly PermitRule<TAction, TData>[]): Permit<TAction, TData>;
  rules(): PermitRule<TAction, TData>[];
  set(rule: PermitRule<TAction, TData> | readonly PermitRule<TAction, TData>[]): Permit<TAction, TData>;
};

export type PermitLoggerContext<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  action: TAction;
  data?: TData;
  decision: PermitEffect;
  principal: Principal;
  resource: string;
  rule?: PermitRule<TAction, TData>;
};

export type PermitOptions<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  initial?: readonly PermitRule<TAction, TData>[];
  logger?: (context: PermitLoggerContext<TAction, TData>) => void;
};
