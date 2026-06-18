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
 * A single authorization rule. `role` accepts a string or string array — it is
 * normalized to `readonly string[]` internally. `priority` defaults to `0`.
 * The compiled rule object returned from decisions is frozen and must not be mutated.
 *
 * A rule matches if the principal holds ANY of the listed roles (OR semantics).
 * Use `WILDCARD` to match all authenticated principals.
 */
export type WardRule<TAction extends string = string, TData = unknown> = {
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority?: number;
  resource: string | typeof WILDCARD;
  role: string | readonly string[];
  when?: WardPredicate<TData>;
};

/**
 * The result of an authorization decision.
 *
 * Three distinct variants for precise narrowing:
 * - `allowed: true` — access granted; the winning rule is always present.
 * - `allowed: false, reason: 'explicit-deny'` — a deny rule matched; the winning rule is present.
 * - `allowed: false, reason: 'no-matching-rule'` — no rule matched; no rule is attached.
 */
export type WardDecision<TAction extends string = string, TData = unknown> =
  | { allowed: true; rule: Readonly<WardRule<TAction, TData>> }
  | { allowed: false; reason: 'explicit-deny'; rule: Readonly<WardRule<TAction, TData>> }
  | { allowed: false; reason: 'no-matching-rule' };

export type WardCheck<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  resource: string;
};

/**
 * The result of a single check in `checkAll` — a `WardDecision` annotated with
 * the originating `resource` and `action` so callers do not need to zip by index.
 */
export type WardDecisionResult<TAction extends string = string, TData = unknown> = WardDecision<TAction, TData> & {
  action: TAction;
  resource: string;
};

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

export type ConflictKind = 'duplicate' | 'shadowed';

/**
 * Describes a rule conflict detected at creation time.
 *
 * Two variants, narrowable by `kind`:
 *
 * - `'duplicate'`: two **predicate-free** rules have identical (role set, resource, action) —
 *   one can never affect the outcome because the other always fires first.
 *   Fields: `ruleA`/`indexA` (first declared, wins) and `ruleB`/`indexB` (unreachable).
 *
 * - `'shadowed'`: the `shadowingRule` has a higher or equal effective rank AND its
 *   patterns are at least as broad as `shadowedRule`'s, AND it carries **no** `when`
 *   predicate — so `shadowedRule` can never win.
 *
 * Rules that carry a `when` predicate are excluded from both checks because their
 * applicability can only be determined at runtime, not statically.
 */
export type WardConflict<TAction extends string = string, TData = unknown> =
  | {
      /** Index of the first-declared (winning) rule in the input array. */
      indexA: number;
      /** Index of the second-declared (unreachable) rule in the input array. */
      indexB: number;
      kind: 'duplicate';
      /** First-declared rule (the one that always wins). */
      ruleA: Readonly<WardRule<TAction, TData>>;
      /** Second-declared rule (the unreachable duplicate). */
      ruleB: Readonly<WardRule<TAction, TData>>;
    }
  | {
      kind: 'shadowed';
      /** Index of the rule that can never win. */
      shadowedIndex: number;
      /** The rule that can never win. */
      shadowedRule: Readonly<WardRule<TAction, TData>>;
      /** Index of the rule that always wins instead. */
      shadowingIndex: number;
      /** The rule that always wins instead. */
      shadowingRule: Readonly<WardRule<TAction, TData>>;
    };

// ---------------------------------------------------------------------------
// Decision trace
// ---------------------------------------------------------------------------

/** One candidate entry in a `WardTrace` — shows why it won or lost. */
export type WardTraceCandidate<TAction extends string = string, TData = unknown> = {
  /** Original index of this rule in the input array passed to `createWard`. */
  index: number;
  priority: number;
  rule: Readonly<WardRule<TAction, TData>>;
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

export type Ward<TAction extends string = string, TData = unknown> = {
  /**
   * Returns allowed concrete actions for a principal on a resource.
   * Pass `knownActions` to resolve wildcard-action rules.
   *
   * **Does not invoke the logger** — this is a side-effect-free enumeration helper.
   * Use `checkAll` if you need an auditable batch decision that fires the logger
   * for each action checked.
   */
  allowedActions(principal: Principal, resource: string, knownActions: readonly TAction[], data?: TData): TAction[];
  /** Evaluates multiple checks and returns one `WardDecisionResult` per check. Invokes the logger for each. */
  checkAll(principal: Principal, checks: readonly WardCheck<TAction, TData>[]): WardDecisionResult<TAction, TData>[];
  /** Returns all rule conflicts in the policy. Lazily computed and cached after first call. @complexity O(n²) */
  detectConflicts(): WardConflict<TAction, TData>[];
  /** Returns the full `WardDecision` for the given principal, resource, and action. Invokes the logger. */
  explain(principal: Principal, resource: string, action: TAction, data?: TData): WardDecision<TAction, TData>;
  forUser(principal: UserPrincipal): BoundWard<TAction, TData>;
  /**
   * Returns all rules whose role, resource, and action patterns match `principal` and `resource`.
   * When `data` is omitted, predicate-gated rules are **included** without evaluating their `when`
   * condition — useful for introspection. Pass `data` to apply predicates and get the runtime-accurate set.
   *
   * **Does not invoke the logger.**
   */
  rulesInScope(principal: Principal, resource: string, data?: TData): ReadonlyArray<Readonly<WardRule<TAction, TData>>>;
  /** Returns the full decision trace showing all matching candidates and why the winner was selected. **Does not invoke the logger** — use `explain` when you need the logger to fire. */
  trace(principal: Principal, resource: string, action: TAction, data?: TData): WardTrace<TAction, TData>;
};

/**
 * A principal-bound view of a Ward. All methods are identical to `Ward` but
 * without the leading `principal` argument — it is captured at `forUser()` time.
 * `forUser` and `detectConflicts` are not available on a bound view.
 */
export type BoundWard<TAction extends string = string, TData = unknown> = {
  /**
   * Returns allowed concrete actions for this principal on a resource.
   * Pass `knownActions` to resolve wildcard-action rules.
   *
   * @remarks Side-effect-free enumeration helper — does **not** invoke the logger.
   * Use `checkAll` if you need an auditable batch decision.
   */
  allowedActions(resource: string, knownActions: readonly TAction[], data?: TData): TAction[];
  /** Evaluates multiple checks in a single call and returns one `WardDecisionResult` per check. */
  checkAll(checks: readonly WardCheck<TAction, TData>[]): WardDecisionResult<TAction, TData>[];
  /** Returns the full `WardDecision` for this principal on the given resource and action. Invokes the logger. */
  explain(resource: string, action: TAction, data?: TData): WardDecision<TAction, TData>;
  /**
   * Returns all rules whose role, resource, and action patterns match this principal and resource.
   * When `data` is omitted, predicate-gated rules are included without evaluating their `when` condition.
   *
   * **Does not invoke the logger.**
   */
  rulesInScope(resource: string, data?: TData): ReadonlyArray<Readonly<WardRule<TAction, TData>>>;
  /** Returns the full decision trace showing all matching candidates and why the winner was selected. **Does not invoke the logger** — use `explain` when you need the logger to fire. */
  trace(resource: string, action: TAction, data?: TData): WardTrace<TAction, TData>;
};

/**
 * Logger context passed to `WardOptions.logger` on every decision.
 *
 * Structurally identical to `WardDecision` plus the request fields, so you can
 * narrow `rule` with the same `if (ctx.allowed)` pattern you already know.
 *
 * @example
 * ```ts
 * createWard(rules, {
 *   logger: (ctx) => {
 *     if (ctx.allowed) {
 *       console.log(ctx.rule.role); // no ?. needed
 *     }
 *   },
 * });
 * ```
 */
export type WardLoggerContext<TAction extends string = string, TData = unknown> = WardDecision<TAction, TData> & {
  action: TAction;
  data?: TData;
  principal: Principal;
  resource: string;
};

export type WardOptions<TAction extends string = string, TData = unknown> = {
  logger?: (context: WardLoggerContext<TAction, TData>) => void;
  /**
   * Maximum number of conflicts returned by `detectConflicts()`. Defaults to `Infinity`.
   * Use to cap the O(n²) overhead for large auto-generated policies.
   * Setting this to `0` disables conflict detection entirely — `detectConflicts()` will always return `[]`.
   */
  maxConflicts?: number;
  /**
   * Called synchronously for each detected rule conflict immediately after
   * the ward is compiled. Use this to surface conflicts as warnings or errors.
   *
   * @example
   * ```ts
   * createWard(rules, {
   *   onConflict: (c) => c.kind === 'duplicate'
   *     ? console.warn(`[ward] duplicate: Rule[${c.indexB}] unreachable (Rule[${c.indexA}] always wins)`)
   *     : console.warn(`[ward] shadowed: Rule[${c.shadowedIndex}] by Rule[${c.shadowingIndex}]`),
   * });
   * ```
   */
  onConflict?: (conflict: WardConflict<TAction, TData>) => void;
  /**
   * When `true`, `createWard` throws immediately if any rule conflicts are
   * detected. Use `detectConflicts()` on the returned ward for non-throwing
   * inspection.
   *
   * @remarks When both `strict` and `onConflict` are set, `onConflict` is
   * called for each conflict **before** the throw, so all conflicts are
   * reported even in strict mode.
   */
  strict?: boolean;
};
