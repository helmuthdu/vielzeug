import { WILDCARD } from './constants';

export type PermissionData = unknown;

export type UserPrincipal = {
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

export type Permit<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  can(principal: Principal, resource: string, action: TAction, data?: TData): boolean;
  clear(): Permit<TAction, TData>;
  forUser(principal: UserPrincipal): (resource: string, action: TAction, data?: TData) => boolean;
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
