import { WardConfigError } from './errors';
import type { WardAttributes, WardAttributeValue, WardRule } from './types';

function snapshotValue(value: unknown, path: string, ancestors: Set<object>): WardAttributeValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new WardConfigError(`${path} must contain only finite numbers`);
    return value;
  }

  if (typeof value !== 'object') {
    throw new WardConfigError(`${path} must contain only JSON-compatible values`);
  }

  if (ancestors.has(value)) throw new WardConfigError(`${path} must not contain circular references`);

  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new WardConfigError(`${path} must contain only arrays and plain objects`);
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      return Object.freeze(Array.from(value, (item, index) => snapshotValue(item, `${path}[${index}]`, ancestors)));
    }

    return Object.freeze(
      Object.fromEntries(
        Object.keys(value).map((key) => [
          key,
          snapshotValue((value as Record<string, unknown>)[key], `${path}.${key}`, ancestors),
        ]),
      ),
    );
  } finally {
    ancestors.delete(value);
  }
}

export function snapshotAttributes(value: unknown, path: string): WardAttributes | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new WardConfigError(`${path} must be a plain object`);
  }

  return snapshotValue(value, path, new Set()) as WardAttributes;
}

/**
 * Validates and snapshots a single rule definition at ward-creation time.
 * Throws {@link WardConfigError} with a `Rule[index]`-prefixed message on failure.
 */
export function compileRule<TAction extends string, TResource extends string, TAttributes extends WardAttributes>(
  rule: WardRule<TAction, TResource, TAttributes>,
  index: number,
): WardRule<TAction, TResource, TAttributes> {
  const at = `Rule[${index}]`;

  if (typeof rule !== 'object' || rule === null || Array.isArray(rule)) {
    throw new WardConfigError(`${at} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(rule);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new WardConfigError(`${at} must be a plain object`);
  }

  if (typeof rule.action !== 'string' || !rule.action.trim()) {
    throw new WardConfigError(`${at}.action must be a non-empty string`);
  }

  if (rule.action.endsWith(':')) {
    throw new WardConfigError(`${at}.action '${rule.action}' ends with ':' — did you mean '${rule.action}*'?`);
  }

  if (typeof rule.resource !== 'string' || !rule.resource.trim()) {
    throw new WardConfigError(`${at}.resource must be a non-empty string`);
  }

  if (rule.resource.endsWith(':')) {
    throw new WardConfigError(`${at}.resource '${rule.resource}' ends with ':' — did you mean '${rule.resource}*'?`);
  }

  if (rule.effect !== 'allow' && rule.effect !== 'deny') {
    throw new WardConfigError(`${at}.effect must be "allow" or "deny"`);
  }

  if (rule.condition !== undefined && typeof rule.condition !== 'function') {
    throw new WardConfigError(`${at}.condition must be a function`);
  }

  return Object.freeze({
    action: rule.action,
    ...(rule.attributes === undefined ? {} : { attributes: snapshotAttributes(rule.attributes, `${at}.attributes`) }),
    ...(rule.condition === undefined ? {} : { condition: rule.condition }),
    effect: rule.effect,
    resource: rule.resource,
  }) as WardRule<TAction, TResource, TAttributes>;
}
