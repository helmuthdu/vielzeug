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

/**
 * Input shape accepted by `createWard` and the fluent `rule()` builder.
 * `role` may be a string or string array — it is normalized to `readonly string[]`
 * internally and the normalized form is exposed on `WardRule` (the output shape).
 */
export type WardRuleInput<TAction extends string = string, TData = unknown> = {
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number;
  resource: string | typeof WILDCARD;
  /**
   * One role string or an array of role strings. A rule matches if the
   * principal holds ANY of the listed roles (OR semantics). Use `WILDCARD`
   * to match all authenticated principals.
   */
  role: string | readonly string[];
  when?: WardPredicate<TData>;
};

/**
 * Output shape returned from decisions, `rulesInScope`, and `WardConflict`.
 * `role` is always a `readonly string[]` — normalized from the input form.
 * The rule object is frozen and must not be mutated.
 */
export type WardRule<TAction extends string = string, TData = unknown> = Readonly<{
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number;
  resource: string | typeof WILDCARD;
  role: readonly string[];
  when?: WardPredicate<TData>;
}>;

/**
 * The result of an authorization decision.
 *
 * Three distinct variants for precise narrowing:
 * - `allowed: true` — access granted; the winning rule is always present.
 * - `allowed: false, reason: 'explicit-deny'` — a deny rule matched; the winning rule is present.
 * - `allowed: false, reason: 'no-matching-rule'` — no rule matched; no rule is attached.
 */
export type WardDecision<TAction extends string = string, TData = unknown> =
  | { allowed: true; rule: WardRule<TAction, TData> }
  | { allowed: false; reason: 'explicit-deny'; rule: WardRule<TAction, TData> }
  | { allowed: false; reason: 'no-matching-rule' };

export type WardCheck<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  resource: string;
};

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

export type ConflictKind = 'duplicate' | 'shadowed';

/**
 * Describes a rule conflict detected at creation time.
 *
 * - `'duplicate'`: two **predicate-free** rules have identical (role set, resource, action) —
 *   one can never affect the outcome because the other always fires first.
 * - `'shadowed'`: the `shadowedBy` rule has a higher or equal effective rank AND its
 *   patterns are at least as broad as `rule`'s, AND it carries **no** `when` predicate —
 *   so `rule` can never win.
 *
 * Rules that carry a `when` predicate are excluded from both checks because their
 * applicability can only be determined at runtime, not statically.
 */
export type WardConflict<TAction extends string = string, TData = unknown> = {
  kind: ConflictKind;
  rule: WardRule<TAction, TData>;
  ruleIndex: number;
  shadowedBy: WardRule<TAction, TData>;
  shadowedByIndex: number;
};

// ---------------------------------------------------------------------------
// Decision trace (F4)
// ---------------------------------------------------------------------------

/** One candidate entry in a `WardTrace` — shows why it won or lost. */
export type WardTraceCandidate<TAction extends string = string, TData = unknown> = {
  denyBonus: 0 | 1;
  priority: number;
  rule: WardRule<TAction, TData>;
  score: number;
  won: boolean;
};

/**
 * Full decision trace returned by `ward.trace()`.
 * Lists every rule that matched the request (before winner selection) so you can
 * see exactly which rule won and why other candidates lost.
 */
export type WardTrace<TAction extends string = string, TData = unknown> = {
  candidates: WardTraceCandidate<TAction, TData>[];
  decision: WardDecision<TAction, TData>;
};

// ---------------------------------------------------------------------------
// Helper for deriving BoundWard: drops the first Principal param from each method.
// ---------------------------------------------------------------------------
type DropPrincipal<T> = T extends (p: Principal, ...args: infer R) => infer Ret ? (...args: R) => Ret : T;

export type Ward<TAction extends string = string, TData = unknown> = {
  /**
   * Returns allowed concrete actions for a principal on a resource.
   * Pass `knownActions` to resolve wildcard-action rules.
   *
   * @remarks This is a side-effect-free enumeration helper and does **not**
   * invoke the logger. Use `checkAll` if you need an auditable batch decision.
   */
  allowedActions(principal: Principal, resource: string, knownActions: readonly TAction[], data?: TData): TAction[];
  can(principal: Principal, resource: string, action: TAction, data?: TData): boolean;
  canAll(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean;
  canAny(principal: Principal, resource: string, actions: readonly TAction[], data?: TData): boolean;
  checkAll(principal: Principal, checks: readonly WardCheck<TAction, TData>[]): WardDecision<TAction, TData>[];
  /** Returns all rule conflicts in the policy. Lazily computed and cached after first call. @complexity O(n²) */
  detectConflicts(): WardConflict<TAction, TData>[];
  explain(principal: Principal, resource: string, action: TAction, data?: TData): WardDecision<TAction, TData>;
  forUser(principal: UserPrincipal): BoundWard<TAction, TData>;
  rulesInScope(principal: Principal, resource: string, data?: TData): WardRule<TAction, TData>[];
  /** Returns the full decision trace showing all matching candidates and why the winner was selected. */
  trace(principal: Principal, resource: string, action: TAction, data?: TData): WardTrace<TAction, TData>;
};

/**
 * A principal-bound view of a Ward. All methods are identical to `Ward` but
 * without the leading `principal` argument — it is captured at `forUser()` time.
 * `forUser` and `detectConflicts` are not available on a bound view.
 */
export type BoundWard<TAction extends string = string, TData = unknown> = {
  [K in Exclude<keyof Ward<TAction, TData>, 'detectConflicts' | 'forUser'>]: DropPrincipal<Ward<TAction, TData>[K]>;
};

/**
 * Discriminated logger context — mirrors `WardDecision` so `rule` can be
 * narrowed without a separate null check.
 *
 * @example
 * ```ts
 * createWard(rules, {
 *   logger: (ctx) => {
 *     if (ctx.decision !== 'no-matching-rule') {
 *       console.log(ctx.rule.role); // no ?. needed
 *     }
 *   },
 * });
 * ```
 */
export type WardLoggerContext<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
} & (
  | { decision: 'allow'; rule: WardRule<TAction, TData> }
  | { decision: 'explicit-deny'; rule: WardRule<TAction, TData> }
  | { decision: 'no-matching-rule' }
);

export type WardOptions<TAction extends string = string, TData = unknown> = {
  logger?: (context: WardLoggerContext<TAction, TData>) => void;
  /**
   * Maximum number of conflicts returned by `detectConflicts()`. Defaults to `Infinity`.
   * Use to cap the O(n²) overhead for large auto-generated policies.
   */
  maxConflicts?: number;
  /**
   * Called synchronously for each detected rule conflict immediately after
   * the ward is compiled. Use this to surface conflicts as warnings or errors.
   *
   * @example
   * ```ts
   * createWard(rules, {
   *   onConflict: (c) => console.warn(`[ward] ${c.kind}: Rule[${c.ruleIndex}] shadowed by Rule[${c.shadowedByIndex}]`),
   * });
   * ```
   */
  onConflict?: (conflict: WardConflict<TAction, TData>) => void;
  /**
   * When `true`, `createWard` throws immediately if any rule conflicts are
   * detected. Use `detectConflicts()` on the returned ward for non-throwing
   * inspection.
   */
  strict?: boolean;
};
