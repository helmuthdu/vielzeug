export const permitTypes = `
declare module '@vielzeug/permit' {
  export const ANONYMOUS: 'anonymous';
  export const WILDCARD: '*';

  export type PermissionData = unknown;
  export type UserPrincipal = { id: string; roles: readonly string[] };
  export type Principal = UserPrincipal | null;
  export type PermitEffect = 'allow' | 'deny';

  export type PredicateContext<TData extends PermissionData = PermissionData> = {
    principal: UserPrincipal;
    data?: TData;
  };

  export type PermitRule<TAction extends string = string, TData extends PermissionData = PermissionData> = {
    role: string;
    resource: string;
    action: TAction | typeof WILDCARD;
    effect: PermitEffect;
    priority?: number;
    when?: (ctx: PredicateContext<TData>) => boolean;
  };

  export type Permit<TAction extends string = string, TData extends PermissionData = PermissionData> = {
    set(rule: PermitRule<TAction, TData> | readonly PermitRule<TAction, TData>[]): Permit<TAction, TData>;
    can(principal: Principal, resource: string, action: TAction, data?: TData): boolean;
    forUser(principal: UserPrincipal): (resource: string, action: TAction, data?: TData) => boolean;
    rules(): PermitRule<TAction, TData>[];
    replace(rules: readonly PermitRule<TAction, TData>[]): Permit<TAction, TData>;
    clear(): Permit<TAction, TData>;
  };

  export function createPermit<TAction extends string = string, TData extends PermissionData = PermissionData>(opts?: {
    initial?: readonly PermitRule<TAction, TData>[];
    logger?: (context: {
      principal: Principal;
      resource: string;
      action: TAction;
      data?: TData;
      decision: PermitEffect;
      rule?: PermitRule<TAction, TData>;
    }) => void;
  }): Permit<TAction, TData>;
}
`;
