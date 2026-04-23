import type { PermitRule, UserPrincipal } from './types';

/**
 * Validate that a rule has required fields
 */
function validateRule<TAction extends string, TData>(rule: unknown): asserts rule is PermitRule<TAction, TData> {
  if (typeof rule !== 'object' || !rule) {
    throw new Error('[permit] Rule must be an object');
  }

  const r = rule as Record<string, unknown>;

  if (typeof r.role !== 'string' || !r.role.trim()) {
    throw new Error('[permit] Rule.role must be a non-empty string');
  }

  if (typeof r.resource !== 'string' || !r.resource.trim()) {
    throw new Error('[permit] Rule.resource must be a non-empty string');
  }

  if (typeof r.action !== 'string' || !r.action.trim()) {
    throw new Error('[permit] Rule.action must be a non-empty string');
  }

  if (!['allow', 'deny'].includes(r.effect as string)) {
    throw new Error('[permit] Rule.effect must be "allow" or "deny"');
  }

  if (r.priority !== undefined && typeof r.priority !== 'number') {
    throw new Error('[permit] Rule.priority must be a number');
  }

  if (r.when !== undefined && typeof r.when !== 'function') {
    throw new Error('[permit] Rule.when must be a function');
  }
}

/**
 * Validate an authenticated principal
 */
function validateUserPrincipal(input: unknown): asserts input is UserPrincipal {
  if (typeof input !== 'object' || !input) {
    throw new Error('[permit] Invalid principal: expected { id: string, roles: string[] }');
  }

  const p = input as Record<string, unknown>;

  if (typeof p.id !== 'string' || !p.id.trim()) {
    throw new Error('[permit] Invalid principal: id must be a non-empty string');
  }

  if (!Array.isArray(p.roles) || p.roles.some((r) => typeof r !== 'string')) {
    throw new Error('[permit] Invalid principal: roles must be an array of strings');
  }
}

export { validateRule, validateUserPrincipal };
