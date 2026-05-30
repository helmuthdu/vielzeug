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
  /**
   * One role string or an array of role strings. A rule matches if the
   * principal holds ANY of the listed roles (OR semantics). Use `WILDCARD`
   * to match all authenticated principals.
   */
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
 * - `'duplicate'`: two rules have identical (role, resource, action) — one can
 *   never affect the outcome because the other always fires first.
 * - `'shadowed'`: the `shadowedBy` rule has a higher or equal effective rank
 *   AND its patterns are at least as broad as `rule`'s — so `rule` can never win.
 */
export type WardConflict<TAction extends string = string, TData = unknown> = {
  kind: ConflictKind;
  rule: WardRule<TAction, TData>;
  ruleIndex: number;
  shadowedBy: WardRule<TAction, TData>;
  shadowedByIndex: number;
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
  /** Returns all rule conflicts in the policy. Lazily computed and cached after first call. */
  detectConflicts(): WardConflict<TAction, TData>[];
  explain(principal: Principal, resource: string, action: TAction, data?: TData): WardDecision<TAction, TData>;
  forUser(principal: UserPrincipal): BoundWard<TAction, TData>;
  rulesInScope(principal: Principal, resource: string, data?: TData): WardRule<TAction, TData>[];
};

/**
 * A principal-bound view of a Ward. All methods are identical to `Ward` but
 * without the leading `principal` argument — it is captured at `forUser()` time.
 * `forUser` itself is not available on a bound view.
 */
export type BoundWard<TAction extends string = string, TData = unknown> = {
  [K in Exclude<keyof Ward<TAction, TData>, 'forUser'>]: DropPrincipal<Ward<TAction, TData>[K]>;
};

/**
 * The `decision` field mirrors `WardDecision.reason` so logger consumers can
 * distinguish default-deny from an explicit deny rule without inspecting `rule`.
 */
export type WardLoggerContext<TAction extends string = string, TData = unknown> = {
  action: TAction;
  data?: TData;
  decision: 'allow' | 'explicit-deny' | 'no-matching-rule';
  principal: Principal;
  resource: string;
  rule?: WardRule<TAction, TData>;
};

export type WardOptions<TAction extends string = string, TData = unknown> = {
  logger?: (context: WardLoggerContext<TAction, TData>) => void;
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
