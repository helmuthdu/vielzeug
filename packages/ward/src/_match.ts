import { snapshotAttributes } from './_compile';
import { WardConditionError, WardConfigError } from './errors';
import { matchesPattern } from './resource';
import type {
  Principal,
  UserPrincipal,
  WardAttributes,
  WardAttributeValue,
  WardDecisionInput,
  WardRule,
} from './types';

/** Asserts that `input` is a valid `UserPrincipal`. Throws with a clear message otherwise. */
export function assertUserPrincipal(input: unknown): asserts input is UserPrincipal {
  if (typeof input !== 'object' || !input) {
    throw new WardConfigError('Invalid principal: expected { id: string, roles: string[] }');
  }

  const principal = input as Record<string, unknown>;

  if (typeof principal.id !== 'string' || !principal.id.trim()) {
    throw new WardConfigError('Invalid principal: id must be a non-empty string');
  }

  if (!Array.isArray(principal.roles) || principal.roles.some((role) => typeof role !== 'string' || !role.trim())) {
    throw new WardConfigError('Invalid principal: roles must be an array of non-empty strings');
  }
}

export function snapshotPrincipal(principal: Principal | undefined): Principal {
  if (principal === undefined || principal === null) return null;

  assertUserPrincipal(principal);

  return Object.freeze({
    ...(principal.attributes === undefined
      ? {}
      : { attributes: snapshotAttributes(principal.attributes, 'Principal.attributes') }),
    id: principal.id,
    roles: Object.freeze([...principal.roles]),
  });
}

export function snapshotDecisionInput<
  TAction extends string,
  TResource extends string,
  TAttributes extends WardAttributes,
>(
  input: WardDecisionInput<TAction, TResource, TAttributes>,
): WardDecisionInput<TAction, TResource, TAttributes> & {
  principal: Principal;
} {
  if (typeof input.action !== 'string' || !input.action.trim()) {
    throw new WardConfigError('Decision.action must be a non-empty string');
  }
  if (typeof input.resource !== 'string' || !input.resource.trim()) {
    throw new WardConfigError('Decision.resource must be a non-empty string');
  }

  return Object.freeze({
    action: input.action,
    ...(input.attributes === undefined
      ? {}
      : { attributes: snapshotAttributes(input.attributes, 'Decision.attributes') as TAttributes }),
    principal: snapshotPrincipal(input.principal),
    resource: input.resource,
  });
}

function deepEqual(left: WardAttributeValue, right: WardAttributeValue): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => deepEqual(value, right[index]))
    );
  }

  const leftRecord = left as Record<string, WardAttributeValue>;
  const rightRecord = right as Record<string, WardAttributeValue>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.hasOwn(rightRecord, key) && deepEqual(leftRecord[key], rightRecord[key]))
  );
}

export function attributesMatch(expected: WardAttributes | undefined, actual: WardAttributes | undefined): boolean {
  if (!expected) return true;
  if (!actual) return false;

  return Object.keys(expected).every((key) => Object.hasOwn(actual, key) && deepEqual(expected[key], actual[key]));
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function') ||
    (typeof value === 'function' && 'then' in value && typeof value.then === 'function')
  );
}

export function ruleMatches<TAction extends string, TResource extends string, TAttributes extends WardAttributes>(
  rule: WardRule<TAction, TResource, TAttributes>,
  index: number,
  input: WardDecisionInput<TAction, TResource, TAttributes> & { principal: Principal },
): boolean {
  if (!matchesPattern(rule.action, input.action)) return false;
  if (!matchesPattern(rule.resource, input.resource)) return false;
  if (!attributesMatch(rule.attributes, input.attributes)) return false;
  if (!rule.condition) return true;

  try {
    const result: unknown = rule.condition({ attributes: input.attributes, principal: input.principal });

    if (isThenable(result)) {
      throw new TypeError('Async conditions are not supported; return a boolean');
    }
    if (typeof result !== 'boolean') {
      throw new TypeError('Conditions must return a boolean');
    }

    return result;
  } catch (error) {
    throw new WardConditionError(index, error);
  }
}
