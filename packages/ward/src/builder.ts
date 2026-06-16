import type { WardPredicate, WardRule } from './types';

import { WILDCARD } from './constants';

// ---------------------------------------------------------------------------
// RuleOptions — shared options for allow/deny/ruleFor
// ---------------------------------------------------------------------------

type RuleOptions<TData> = {
  priority?: number;
  when?: WardPredicate<TData>;
};

// ---------------------------------------------------------------------------
// ruleFor — multi-action rule factory (low-level, effect as first arg)
// ---------------------------------------------------------------------------

/**
 * Creates one `WardRule` per action for a given effect, role(s), and resource.
 *
 * Prefer `allow()` or `deny()` for ergonomic rule authoring.
 *
 * @example
 * ```ts
 * ruleFor('allow', 'viewer', 'posts', ['read'])
 * ruleFor('deny', 'blocked', 'posts', ['read', 'update'])
 * ```
 */
export function ruleFor<TAction extends string = string, TData = unknown>(
  effect: 'allow' | 'deny',
  role: string | readonly string[],
  resource: string | typeof WILDCARD,
  actions: readonly (TAction | typeof WILDCARD)[],
  options?: RuleOptions<TData>,
): WardRule<TAction, TData>[] {
  return actions.map((action) => ({
    action,
    effect,
    ...(options?.priority !== undefined ? { priority: options.priority } : {}),
    resource,
    role,
    ...(options?.when !== undefined ? { when: options.when } : {}),
  }));
}

// ---------------------------------------------------------------------------
// allow / deny — ergonomic factories (R12)
// ---------------------------------------------------------------------------

/**
 * Creates one `WardRule` per action with `effect: 'allow'`.
 *
 * Reads naturally: "allow editor to read/update posts".
 *
 * @example
 * ```ts
 * allow('editor', 'posts', ['read', 'update'])
 * allow(['editor', 'admin'], 'posts:*', ['read', 'update'], { when: predicate.owns('authorId') })
 * ```
 */
export function allow<TAction extends string = string, TData = unknown>(
  role: string | readonly string[],
  resource: string | typeof WILDCARD,
  actions: readonly (TAction | typeof WILDCARD)[],
  options?: RuleOptions<TData>,
): WardRule<TAction, TData>[] {
  return ruleFor('allow', role, resource, actions, options);
}

/**
 * Creates one `WardRule` per action with `effect: 'deny'`.
 *
 * Reads naturally: "deny blocked from reading posts".
 *
 * @example
 * ```ts
 * deny('blocked', 'posts', ['read', 'update'])
 * deny('guest', WILDCARD, [WILDCARD], { priority: 10 })
 * ```
 */
export function deny<TAction extends string = string, TData = unknown>(
  role: string | readonly string[],
  resource: string | typeof WILDCARD,
  actions: readonly (TAction | typeof WILDCARD)[],
  options?: RuleOptions<TData>,
): WardRule<TAction, TData>[] {
  return ruleFor('deny', role, resource, actions, options);
}

// ---------------------------------------------------------------------------
// predicate — grouped predicate helpers (R10)
// ---------------------------------------------------------------------------

/**
 * Grouped predicate factories. Import as a namespace to avoid name collisions:
 * ```ts
 * import { predicate } from '@vielzeug/ward';
 * allow('editor', 'posts:*', ['update'], { when: predicate.owns('authorId') })
 * allow('user', 'posts:*', ['read'], { when: predicate.and(predicate.owns('authorId'), myPred) })
 * ```
 */
export const predicate = {
  /**
   * Returns a `WardPredicate` that combines all given predicates with AND semantics —
   * all must return `true` for the rule to match.
   */
  and<TData = unknown>(...preds: WardPredicate<TData>[]): WardPredicate<TData> {
    return (ctx) => preds.every((p) => p(ctx));
  },

  /**
   * Returns a `WardPredicate` that inverts the given predicate.
   */
  not<TData = unknown>(pred: WardPredicate<TData>): WardPredicate<TData> {
    return (ctx) => !pred(ctx);
  },

  /**
   * Returns a `WardPredicate` that combines all given predicates with OR semantics —
   * at least one must return `true` for the rule to match.
   */
  or<TData = unknown>(...preds: WardPredicate<TData>[]): WardPredicate<TData> {
    return (ctx) => preds.some((p) => p(ctx));
  },

  /**
   * Returns a `WardPredicate` that checks whether the data object's `attributeKey` field
   * matches the principal's `id`. Use to express ownership constraints.
   *
   * Must be used with a rule that requires authentication (non-`ANONYMOUS` role).
   * Predicates only execute for authenticated principals — pairing `owns` with an
   * `ANONYMOUS`-role rule produces a rule that can never match because the predicate
   * is skipped for unauthenticated requests.
   *
   * @example
   * ```ts
   * allow('editor', 'posts:*', ['update'], { when: predicate.owns('authorId') })
   * ```
   */
  owns<TData = unknown>(attributeKey: keyof TData & string): WardPredicate<TData> {
    return ({ data, principal }) => {
      if (!data || typeof data !== 'object') return false;

      const record = data as Record<string, unknown>;

      if (!Object.hasOwn(record, attributeKey)) return false;

      return record[attributeKey] === principal.id;
    };
  },
} as const;

// ---------------------------------------------------------------------------
// owns — top-level re-export for backward-compatible usage
// ---------------------------------------------------------------------------

/**
 * Returns a `WardPredicate` that checks whether the data object's `attributeKey` field
 * matches the principal's `id`.
 *
 * Also available as `predicate.owns()` when using the grouped namespace.
 */
export function owns<TData = unknown>(attributeKey: keyof TData & string): WardPredicate<TData> {
  return predicate.owns(attributeKey);
}
