import type { WardRule } from './types';

import { WILDCARD } from './constants';

// ---------------------------------------------------------------------------
// Internal types (shared across modules)
// ---------------------------------------------------------------------------

/** Normalized compiled rule — role always readonly string[], priority always number. */
export type CompiledRule<TAction extends string, TData> = Readonly<{
  action: TAction | typeof WILDCARD;
  effect: 'allow' | 'deny';
  priority: number;
  resource: string | typeof WILDCARD;
  role: readonly string[];
  when?: WardRule<TAction, TData>['when'];
}>;

/** A compiled entry stores the normalized rule plus pre-computed lookup values. */
export type CompiledEntry<TAction extends string, TData> = {
  /** Deny bonus (1 for deny, 0 for allow): tiebreaker when priority and score match. */
  denyBonus: 0 | 1;
  /** Original rule index, used in predicate error messages. */
  index: number;
  /** Resolved priority (defaults to 0 when not authored). */
  priority: number;
  /** Normalized roles array (always an array). */
  roles: readonly string[];
  /** The normalized, frozen compiled rule. */
  rule: CompiledRule<TAction, TData>;
  /** Specificity score (0–5): roleScore(0|1) + resourceScore(0|1|2) + actionScore(0|1|2). */
  score: number;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateRuleInput<TAction extends string, TData>(rule: WardRule<TAction, TData>, index: number): void {
  const at = `Rule[${index}]`;
  const roles = Array.isArray(rule.role) ? rule.role : [rule.role];

  if (roles.length === 0 || roles.some((r) => typeof r !== 'string' || !r.trim())) {
    throw new Error(`[ward] ${at}.role must be a non-empty string or non-empty array of strings`);
  }

  if (typeof rule.resource !== 'string' || !rule.resource.trim()) {
    throw new Error(`[ward] ${at}.resource must be a non-empty string`);
  }

  if ((rule.resource as string).endsWith(':')) {
    throw new Error(
      `[ward] ${at}.resource '${String(rule.resource)}' ends with ':' — did you mean '${String(rule.resource)}*'?`,
    );
  }

  if (typeof rule.action !== 'string' || !(rule.action as string).trim()) {
    throw new Error(`[ward] ${at}.action must be a non-empty string`);
  }

  if ((rule.action as string).endsWith(':')) {
    throw new Error(
      `[ward] ${at}.action '${String(rule.action)}' ends with ':' — did you mean '${String(rule.action)}*'?`,
    );
  }

  if (rule.effect !== 'allow' && rule.effect !== 'deny') {
    throw new Error(`[ward] ${at}.effect must be "allow" or "deny"`);
  }

  if (rule.priority !== undefined && (typeof rule.priority !== 'number' || !Number.isFinite(rule.priority))) {
    throw new Error(`[ward] ${at}.priority must be a finite number`);
  }

  if (rule.when !== undefined && typeof rule.when !== 'function') {
    throw new Error(`[ward] ${at}.when must be a function`);
  }
}

// ---------------------------------------------------------------------------
// Specificity
// ---------------------------------------------------------------------------

/**
 * Returns the specificity score for a single pattern field:
 * - 0: global wildcard (`*`)
 * - 1: namespace wildcard (e.g. `posts:*` or `read:*`)
 * - 2: exact string
 */
export function patternScore(pattern: string): number {
  if (pattern === WILDCARD) return 0;

  if (pattern.endsWith(':*')) return 1;

  return 2;
}

/**
 * Specificity: role(0|1) + resource(0|1|2) + action(0|1|2) = max 5.
 * Higher score = more specific = wins ties in priority.
 */
function specificity<TAction extends string, TData>(rule: CompiledRule<TAction, TData>): number {
  const roleScore = rule.role.includes(WILDCARD) ? 0 : 1;

  return roleScore + patternScore(rule.resource as string) + patternScore(rule.action as string);
}

// ---------------------------------------------------------------------------
// Compilation
// ---------------------------------------------------------------------------

export function compileEntry<TAction extends string, TData>(
  input: WardRule<TAction, TData>,
  index: number,
): CompiledEntry<TAction, TData> {
  validateRuleInput(input, index);

  const rawRoles = Array.isArray(input.role) ? [...input.role] : [input.role];
  const roles: readonly string[] = Object.freeze([...new Set(rawRoles)]);

  const rule = Object.freeze({
    action: input.action,
    effect: input.effect,
    priority: input.priority ?? 0,
    resource: input.resource,
    role: roles,
    ...(input.when !== undefined ? { when: input.when } : {}),
  }) as CompiledRule<TAction, TData>;

  const score = specificity(rule);
  const priority = rule.priority;
  const denyBonus: 0 | 1 = rule.effect === 'deny' ? 1 : 0;

  return { denyBonus, index, priority, roles, rule, score };
}
