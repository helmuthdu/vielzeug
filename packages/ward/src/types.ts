import { WILDCARD } from './constants';

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
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number;
  resource: string | typeof WILDCARD;
  role: string | readonly string[];
  when?: WardPredicate<TData>;
};

export type WardDecision<TAction extends string = string, TData = unknown> =
  | { allowed: true; rule: Readonly<WardRule<TAction, TData>> }
  | { allowed: false; reason: 'explicit-deny'; rule: Readonly<WardRule<TAction, TData>> }
  | { allowed: false; reason: 'no-matching-rule' };

export type WardCheck<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  resource: string;
};

export type WardDecisionResult<TAction extends string = string, TData = unknown> = WardDecision<TAction, TData> & {
  action: TAction;
  resource: string;
};

export type WardDecisionInput<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
};

export type WardAllowedActionsInput<TAction extends string = string, TData = unknown> = {
  data?: TData;
  knownActions: readonly TAction[];
  principal: Principal;
  resource: string;
};

export type WardRulesInScopeInput<TData = unknown> = {
  data?: TData;
  principal: Principal;
  resource: string;
};

export type BoundWardDecisionInput<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  resource: string;
};

export type BoundWardAllowedActionsInput<TAction extends string = string, TData = unknown> = {
  data?: TData;
  knownActions: readonly TAction[];
  resource: string;
};

export type BoundWardRulesInScopeInput<TData = unknown> = {
  data?: TData;
  resource: string;
};

export type ConflictKind = 'duplicate' | 'shadowed';

export type WardConflict<TAction extends string = string, TData = unknown> =
  | {
      indexA: number;
      indexB: number;
      kind: 'duplicate';
      ruleA: Readonly<WardRule<TAction, TData>>;
      ruleB: Readonly<WardRule<TAction, TData>>;
    }
  | {
      kind: 'shadowed';
      shadowedIndex: number;
      shadowedRule: Readonly<WardRule<TAction, TData>>;
      shadowingIndex: number;
      shadowingRule: Readonly<WardRule<TAction, TData>>;
    };

export type WardTraceCandidate<TAction extends string = string, TData = unknown> = {
  index: number;
  priority: number;
  rule: Readonly<WardRule<TAction, TData>>;
  score: number;
  won: boolean;
};

export type WardTrace<TAction extends string = string, TData = unknown> = {
  candidates: WardTraceCandidate<TAction, TData>[];
  decision: WardDecision<TAction, TData>;
};

export type Ward<TAction extends string = string, TData = unknown> = {
  allowedActions(input: WardAllowedActionsInput<TAction, TData>): TAction[];
  checkAll(principal: Principal, checks: readonly WardCheck<TAction, TData>[]): WardDecisionResult<TAction, TData>[];
  detectConflicts(): readonly WardConflict<TAction, TData>[];
  explain(input: WardDecisionInput<TAction, TData>): WardDecision<TAction, TData>;
  forUser(principal: UserPrincipal): BoundWard<TAction, TData>;
  rulesInScope(input: WardRulesInScopeInput<TData>): ReadonlyArray<Readonly<WardRule<TAction, TData>>>;
  trace(input: WardDecisionInput<TAction, TData>): WardTrace<TAction, TData>;
};

export type BoundWard<TAction extends string = string, TData = unknown> = {
  allowedActions(input: BoundWardAllowedActionsInput<TAction, TData>): TAction[];
  checkAll(checks: readonly WardCheck<TAction, TData>[]): WardDecisionResult<TAction, TData>[];
  explain(input: BoundWardDecisionInput<TAction, TData>): WardDecision<TAction, TData>;
  rulesInScope(input: BoundWardRulesInScopeInput<TData>): ReadonlyArray<Readonly<WardRule<TAction, TData>>>;
  trace(input: BoundWardDecisionInput<TAction, TData>): WardTrace<TAction, TData>;
};

export type WardLoggerContext<TAction extends string = string, TData = unknown> = WardDecision<TAction, TData> & {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
};

export type WardOptions<TAction extends string = string, TData = unknown> = {
  logger?: (context: WardLoggerContext<TAction, TData>) => void;
  maxConflicts?: number;
  onConflict?: (conflict: WardConflict<TAction, TData>) => void;
  strict?: boolean;
};
