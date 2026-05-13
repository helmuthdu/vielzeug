export const permitTypes = `
declare module '@vielzeug/permit' {
  export const ANONYMOUS: 'anonymous';
  export const WILDCARD: '*';

  export type UserPrincipal = {
    attributes?: Record<string, unknown>;
    id: string;
    roles: readonly string[];
  };
  export type Principal = UserPrincipal | null;

  export type RuleContext<TData = unknown> = {
    data?: TData;
    principal: UserPrincipal;
  };

  export type PermitPredicate<TData = unknown> = (ctx: RuleContext<TData>) => boolean;

  export type PermitRule<TAction extends string = string, TData = unknown> = {
    action: TAction | typeof WILDCARD;
    effect: 'allow' | 'deny';
    priority?: number;
    resource: string;
    role: string;
    when?: PermitPredicate<TData>;
  };

  export type PermitDecision<TAction extends string = string, TData = unknown> =
    | { allowed: true; rule: PermitRule<TAction, TData> }
    | { allowed: false; reason: 'no-matching-rule' | 'explicit-deny'; rule?: PermitRule<TAction, TData> };

  export type PermitCheck<TAction extends string = string, TData = unknown> = {
    action: TAction;
    data?: TData;
    resource: string;
  };

  export type PermitLoggerContext<TAction extends string = string, TData = unknown> = {
    action: TAction;
    data?: TData;
    decision: 'allow' | 'deny';
    principal: Principal;
    resource: string;
    rule?: PermitRule<TAction, TData>;
  };

  export type PermitOptions<TAction extends string = string, TData = unknown> = {
    logger?: (context: PermitLoggerContext<TAction, TData>) => void;
  };

  type BoundPermit<TAction extends string = string, TData = unknown> = {
    allowedActions(resource: string, data?: TData, knownActions?: readonly TAction[]): TAction[];
    can(resource: string, action: TAction, data?: TData): boolean;
    canAll(resource: string, actions: readonly TAction[], data?: TData): boolean;
    canAny(resource: string, actions: readonly TAction[], data?: TData): boolean;
    checkAll(checks: readonly PermitCheck<TAction, TData>[]): PermitDecision<TAction, TData>[];
    explain(resource: string, action: TAction, data?: TData): PermitDecision<TAction, TData>;
    forUser(principal: UserPrincipal): BoundPermit<TAction, TData>;
    rulesInScope(resource: string, data?: TData): PermitRule<TAction, TData>[];
  };

  export type Permit<TAction extends string = string, TData = unknown> = {
    allowedActions(principal: Principal, resource: string, data?: TData, knownActions?: readonly TAction[]): TAction[];
    can(principal: Principal, resource: string, action: TAction, data?: TData): boolean;
    canAll(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean;
    canAny(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean;
    checkAll(principal: Principal, checks: readonly PermitCheck<TAction, TData>[]): PermitDecision<TAction, TData>[];
    explain(principal: Principal, resource: string, action: TAction, data?: TData): PermitDecision<TAction, TData>;
    forUser(principal: UserPrincipal): BoundPermit<TAction, TData>;
    rulesInScope(principal: Principal, resource: string, data?: TData): PermitRule<TAction, TData>[];
  };

  export function createPermit<TAction extends string = string, TData = unknown>(
    rules?: readonly PermitRule<TAction, TData>[],
    options?: PermitOptions<TAction, TData>
  ): Permit<TAction, TData>;

  export function owns<TData extends Record<string, unknown>, K extends keyof TData & string>(
    attributeKey: K
  ): PermitPredicate<TData>;
}
`;
