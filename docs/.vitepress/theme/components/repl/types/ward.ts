export const wardTypes = `
declare module '@vielzeug/ward' {
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

  export type WardPredicate<TData = unknown> = (ctx: RuleContext<TData>) => boolean;

  export type WardRule<TAction extends string = string, TData = unknown> = {
    action: TAction | '*';
    effect: 'allow' | 'deny';
    priority?: number;
    resource: string | '*';
    role: string | readonly string[];
    when?: WardPredicate<TData>;
  };

  export type WardDecision<TAction extends string = string, TData = unknown> =
    | { allowed: true; rule: WardRule<TAction, TData> }
    | { allowed: false; reason: 'no-matching-rule' | 'explicit-deny'; rule?: WardRule<TAction, TData> };

  export type WardCheck<TAction extends string = string, TData = unknown> = {
    action: TAction;
    data?: TData;
    resource: string;
  };

  export type WardLoggerContext<TAction extends string = string, TData = unknown> = {
    action: TAction;
    data?: TData;
    decision: 'allow' | 'deny';
    principal: Principal;
    resource: string;
    rule?: WardRule<TAction, TData>;
  };

  export type WardOptions<TAction extends string = string, TData = unknown> = {
    logger?: (context: WardLoggerContext<TAction, TData>) => void;
  };

  export type BoundWard<TAction extends string = string, TData = unknown> = {
    allowedActions(resource: string, knownActions: readonly TAction[], data?: TData): TAction[];
    can(resource: string, action: TAction, data?: TData): boolean;
    canAll(resource: string, actions: readonly TAction[], data?: TData): boolean;
    canAny(resource: string, actions: readonly TAction[], data?: TData): boolean;
    checkAll(checks: readonly WardCheck<TAction, TData>[]): WardDecision<TAction, TData>[];
    explain(resource: string, action: TAction, data?: TData): WardDecision<TAction, TData>;
    rulesInScope(resource: string, data?: TData): WardRule<TAction, TData>[];
  };

  export type Ward<TAction extends string = string, TData = unknown> = {
    allowedActions(principal: Principal, resource: string, knownActions: readonly TAction[], data?: TData): TAction[];
    can(principal: Principal, resource: string, action: TAction, data?: TData): boolean;
    canAll(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean;
    canAny(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean;
    checkAll(principal: Principal, checks: readonly WardCheck<TAction, TData>[]): WardDecision<TAction, TData>[];
    explain(principal: Principal, resource: string, action: TAction, data?: TData): WardDecision<TAction, TData>;
    forUser(principal: UserPrincipal): BoundWard<TAction, TData>;
    rulesInScope(principal: Principal, resource: string, data?: TData): WardRule<TAction, TData>[];
  };

  export function createWard<TAction extends string = string, TData = unknown>(
    rules?: readonly WardRule<TAction, TData>[],
    options?: WardOptions<TAction, TData>
  ): Ward<TAction, TData>;

  export function owns<TData = unknown>(
    attributeKey: keyof TData & string
  ): WardPredicate<TData>;
}
`;
