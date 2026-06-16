export const wardTypes = `
declare module '@vielzeug/ward' {
  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  export const ANONYMOUS: 'anonymous';
  export const WILDCARD: '*';

  // ---------------------------------------------------------------------------
  // Principal types
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Rule type (input and compiled share the same shape; priority defaults to 0)
  // ---------------------------------------------------------------------------

  export type WardRule<TAction extends string = string, TData = unknown> = {
    readonly action: TAction | '*';
    readonly effect: 'allow' | 'deny';
    readonly priority?: number;
    readonly resource: string | '*';
    readonly role: string | readonly string[];
    readonly when?: WardPredicate<TData>;
  };

  // ---------------------------------------------------------------------------
  // Decision types
  // ---------------------------------------------------------------------------

  export type WardDecision<TAction extends string = string, TData = unknown> =
    | { allowed: true; rule: WardRule<TAction, TData> }
    | { allowed: false; reason: 'explicit-deny'; rule: WardRule<TAction, TData> }
    | { allowed: false; reason: 'no-matching-rule' };

  /** WardDecision annotated with the originating resource and action — returned by checkAll(). */
  export type WardDecisionResult<TAction extends string = string, TData = unknown> =
    WardDecision<TAction, TData> & { action: TAction; resource: string };

  export type WardCheck<TAction extends string = string, TData = unknown> = {
    action: TAction;
    data?: TData;
    resource: string;
  };

  // ---------------------------------------------------------------------------
  // Conflict detection types
  // ---------------------------------------------------------------------------

  export type ConflictKind = 'duplicate' | 'shadowed';

  export type WardConflict<TAction extends string = string, TData = unknown> =
    | {
        /** Index of the earlier (winning) rule in the input array. */
        indexA: number;
        /** Index of the later (shadowed/unreachable) rule in the input array. */
        indexB: number;
        kind: 'duplicate';
        ruleA: WardRule<TAction, TData>;
        ruleB: WardRule<TAction, TData>;
      }
    | {
        kind: 'shadowed';
        /** Index of the rule that is always overridden. */
        shadowedIndex: number;
        shadowedRule: WardRule<TAction, TData>;
        /** Index of the rule that always wins instead. */
        shadowingIndex: number;
        shadowingRule: WardRule<TAction, TData>;
      };

  // ---------------------------------------------------------------------------
  // Trace types
  // ---------------------------------------------------------------------------

  export type WardTraceCandidate<TAction extends string = string, TData = unknown> = {
    /** Original index of this rule in the input array passed to createWard. */
    index: number;
    priority: number;
    rule: WardRule<TAction, TData>;
    score: number;
    won: boolean;
  };

  export type WardTrace<TAction extends string = string, TData = unknown> = {
    candidates: WardTraceCandidate<TAction, TData>[];
    decision: WardDecision<TAction, TData>;
  };

  // ---------------------------------------------------------------------------
  // Logger context
  // ---------------------------------------------------------------------------

  export type WardLoggerContext<TAction extends string = string, TData = unknown> = {
    action: TAction;
    data?: TData;
    principal: Principal;
    resource: string;
  } & (
    | { allowed: true; rule: WardRule<TAction, TData> }
    | { allowed: false; reason: 'explicit-deny'; rule: WardRule<TAction, TData> }
    | { allowed: false; reason: 'no-matching-rule' }
  );

  // ---------------------------------------------------------------------------
  // Ward options
  // ---------------------------------------------------------------------------

  export type WardOptions<TAction extends string = string, TData = unknown> = {
    logger?: (context: WardLoggerContext<TAction, TData>) => void;
    /** Cap the number of conflicts returned by detectConflicts(). Set to 0 to disable detection. */
    maxConflicts?: number;
    /** Called for each detected conflict at creation time. */
    onConflict?: (conflict: WardConflict<TAction, TData>) => void;
    /** Throw immediately when any conflict is detected at creation time. */
    strict?: boolean;
  };

  // ---------------------------------------------------------------------------
  // BoundWard — principal-bound view (via ward.forUser)
  // ---------------------------------------------------------------------------

  export type BoundWard<TAction extends string = string, TData = unknown> = {
    allowedActions(resource: string, knownActions: readonly TAction[], data?: TData): TAction[];
    checkAll(checks: readonly WardCheck<TAction, TData>[]): WardDecisionResult<TAction, TData>[];
    explain(resource: string, action: TAction, data?: TData): WardDecision<TAction, TData>;
    rulesInScope(resource: string, data?: TData): readonly WardRule<TAction, TData>[];
    /** Does not fire the logger. */
    trace(resource: string, action: TAction, data?: TData): WardTrace<TAction, TData>;
  };

  // ---------------------------------------------------------------------------
  // Ward — main instance
  // ---------------------------------------------------------------------------

  export type Ward<TAction extends string = string, TData = unknown> = {
    allowedActions(principal: Principal, resource: string, knownActions: readonly TAction[], data?: TData): TAction[];
    checkAll(principal: Principal, checks: readonly WardCheck<TAction, TData>[]): WardDecisionResult<TAction, TData>[];
    detectConflicts(): WardConflict<TAction, TData>[];
    explain(principal: Principal, resource: string, action: TAction, data?: TData): WardDecision<TAction, TData>;
    forUser(principal: UserPrincipal): BoundWard<TAction, TData>;
    rulesInScope(principal: Principal, resource: string, data?: TData): readonly WardRule<TAction, TData>[];
    /** Does not fire the logger — use explain() when logger output is needed. */
    trace(principal: Principal, resource: string, action: TAction, data?: TData): WardTrace<TAction, TData>;
  };

  // ---------------------------------------------------------------------------
  // Factory function
  // ---------------------------------------------------------------------------

  export function createWard<TAction extends string = string, TData = unknown>(
    rules?: readonly WardRule<TAction, TData>[],
    options?: WardOptions<TAction, TData>
  ): Ward<TAction, TData>;

  // ---------------------------------------------------------------------------
  // Rule factories
  // ---------------------------------------------------------------------------

  type RuleOptions<TData> = {
    priority?: number;
    when?: WardPredicate<TData>;
  };

  /** Creates allow rules — one per action. Spread into createWard([ ...allow(...) ]). */
  export function allow<TAction extends string = string, TData = unknown>(
    role: string | readonly string[],
    resource: string,
    actions: readonly (TAction | '*')[],
    options?: RuleOptions<TData>
  ): WardRule<TAction, TData>[];

  /** Creates deny rules — one per action. Spread into createWard([ ...deny(...) ]). */
  export function deny<TAction extends string = string, TData = unknown>(
    role: string | readonly string[],
    resource: string,
    actions: readonly (TAction | '*')[],
    options?: RuleOptions<TData>
  ): WardRule<TAction, TData>[];

  /** Low-level rule factory with effect as first argument. Prefer allow/deny. */
  export function ruleFor<TAction extends string = string, TData = unknown>(
    effect: 'allow' | 'deny',
    role: string | readonly string[],
    resource: string,
    actions: readonly (TAction | '*')[],
    options?: RuleOptions<TData>
  ): WardRule<TAction, TData>[];

  // ---------------------------------------------------------------------------
  // Predicate helpers (grouped namespace)
  // ---------------------------------------------------------------------------

  export const predicate: {
    and<TData = unknown>(...preds: WardPredicate<TData>[]): WardPredicate<TData>;
    not<TData = unknown>(pred: WardPredicate<TData>): WardPredicate<TData>;
    or<TData = unknown>(...preds: WardPredicate<TData>[]): WardPredicate<TData>;
    owns<TData = unknown>(attributeKey: keyof TData & string): WardPredicate<TData>;
  };

  /** Top-level alias for predicate.owns. */
  export function owns<TData = unknown>(
    attributeKey: keyof TData & string
  ): WardPredicate<TData>;

  // ---------------------------------------------------------------------------
  // Resource pattern utilities
  // ---------------------------------------------------------------------------

  /** Returns true when value matches the given pattern (exact, ns:*, or *). */
  export function matchesPattern(pattern: string, value: string): boolean;

  /** Returns true when broad statically covers every value that narrow could match. */
  export function patternCovers(broad: string, narrow: string): boolean;

  // ---------------------------------------------------------------------------
  // Error types
  // ---------------------------------------------------------------------------

  export class WardPredicateError extends Error {
    readonly ruleIndex: number;
    constructor(ruleIndex: number, cause: unknown);
  }

  // ---------------------------------------------------------------------------
  // Middleware (framework-agnostic guards)
  // ---------------------------------------------------------------------------

  export type WardRequest = Record<string, unknown>;
  export type PrincipalExtractor<TReq extends WardRequest = WardRequest> = (
    req: TReq
  ) => Principal | Promise<Principal>;

  export type GuardResult<TAction extends string, TData> =
    | { granted: true; principal: Principal }
    | {
        decision: WardDecision<TAction, TData>;
        granted: false;
        principal: Principal;
        reason: 'explicit-deny' | 'no-matching-rule';
      };

  export function guardRequest<TAction extends string, TData>(
    ward: Ward<TAction, TData>,
    principal: Principal,
    resource: string,
    action: TAction,
    data?: TData
  ): GuardResult<TAction, TData>;

  export function guardRequestWith<TAction extends string, TData, TReq extends WardRequest>(
    ward: Ward<TAction, TData>,
    req: TReq,
    extractPrincipal: PrincipalExtractor<TReq>,
    resource: string,
    action: TAction,
    data?: TData
  ): Promise<GuardResult<TAction, TData>>;
}

declare module '@vielzeug/ward/devtools' {
  import type { Ward, WardOptions, WardRule } from '@vielzeug/ward';

  export function debugWard<TAction extends string = string, TData = unknown>(
    rules: readonly WardRule<TAction, TData>[],
    options?: Omit<WardOptions<TAction, TData>, 'logger'>
  ): Ward<TAction, TData>;
}
`;
