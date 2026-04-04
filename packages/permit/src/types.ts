import { WILDCARD } from './constants';

export type PermissionData = Record<string, unknown>;

export type AnonymousPrincipal = {
  kind: 'anonymous';
};

export type UserPrincipal = {
  id: string;
  kind: 'user';
  roles: readonly string[];
};

export type PermitPrincipal = AnonymousPrincipal | UserPrincipal;

export type PrincipalInput =
  | PermitPrincipal
  | {
      id: string;
      roles: readonly string[];
    }
  | null
  | undefined;

export type PermitEffect = 'allow' | 'deny';

export type PredicateContext<TData extends PermissionData = PermissionData> = {
  data?: TData;
  principal: UserPrincipal;
};

export type PermitPredicate<TData extends PermissionData = PermissionData> = (ctx: PredicateContext<TData>) => boolean;

export type PermitRule<TAction extends string = string> = {
  action: TAction | typeof WILDCARD;
  effect: PermitEffect;
  priority?: number;
  resource: string;
  role: string;
  when?: string;
};

export type PermitPolicy<TAction extends string = string> = {
  rules: PermitRule<TAction>[];
};

export type PermitGuard<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  can(resource: string, action: TAction, data?: TData): boolean;
};

export type Permit<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  can(principal: PrincipalInput, resource: string, action: TAction, data?: TData): boolean;
  clear(): Permit<TAction, TData>;
  exportPolicy(): PermitPolicy<TAction>;
  importPolicy(policy: PermitPolicy<TAction>): Permit<TAction, TData>;
  set(rule: PermitRule<TAction>): Permit<TAction, TData>;
  withUser(principal: PrincipalInput): PermitGuard<TAction, TData>;
};

export type PermitOptions<TAction extends string = string, TData extends PermissionData = PermissionData> = {
  initial?: PermitPolicy<TAction>;
  logger?: (result: PermitEffect, principal: PermitPrincipal, resource: string, action: string, data?: TData) => void;
  predicates?: Record<string, PermitPredicate<TData>>;
};
