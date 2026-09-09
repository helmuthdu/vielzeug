import { isPlainObject as isRecord } from '@vielzeug/arsenal';

import { ForgeConfigError } from '../errors.js';
import type { ValidationIssue } from '../types.js';

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

export { isRecord };

export function isUnsafeKey(key: string): boolean {
  return !key || unsafeKeys.has(key);
}

type RecordValue = Record<string, unknown>;
type TreeValue = RecordValue | readonly unknown[];
type MetaTree = true | MetaNode;
interface MetaNode {
  readonly [key: string]: MetaTree;
}
export type MetaRoot = MetaNode;

export function assertSafeKey(key: string): void {
  if (isUnsafeKey(key)) throw new ForgeConfigError(`Invalid field key '${key}'.`);
}

export function assertArrayIndex(index: number): void {
  if (!Number.isSafeInteger(index) || index < 0) throw new ForgeConfigError(`Invalid array index ${index}.`);
}

function tag(value: object): string {
  return Object.prototype.toString.call(value);
}

function isBlobLeaf(value: object): boolean {
  return tag(value) === '[object Blob]' || tag(value) === '[object File]';
}

function invalidValue(): never {
  throw new ForgeConfigError(
    'Form values must contain only finite JSON primitives, plain objects, arrays, Date, File, or Blob.',
  );
}

export function immutable<T>(value: T, ancestors = new Set<object>()): T {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : invalidValue();
  if (typeof value !== 'object') return invalidValue();

  const date = value as unknown as Date;
  if (tag(value) === '[object Date]' && typeof date.getTime === 'function') {
    const time = date.getTime();
    if (!Number.isFinite(time)) return invalidValue();
    return Object.freeze(new Date(time)) as T;
  }

  if (isBlobLeaf(value)) return value;
  if (ancestors.has(value)) throw new ForgeConfigError('Form values must not contain circular references.');

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const copy: unknown[] = [];
      for (let index = 0; index < value.length; index++) {
        if (!Object.hasOwn(value, index)) throw new ForgeConfigError('Form arrays must not contain empty slots.');
        copy.push(immutable(value[index], ancestors));
      }
      return Object.freeze(copy) as T;
    }

    if (!isRecord(value)) return invalidValue();
    const entries = Object.entries(value).map(([key, child]) => {
      assertSafeKey(key);
      return [key, immutable(child, ancestors)] as const;
    });
    return Object.freeze(Object.fromEntries(entries)) as T;
  } finally {
    ancestors.delete(value);
  }
}

export function readAtPath<T>(value: unknown, path: readonly (string | number)[]): T | undefined {
  let current: unknown = value;

  for (const key of path) {
    if (typeof key === 'number') {
      if (
        !Array.isArray(current) ||
        !Number.isSafeInteger(key) ||
        key < 0 ||
        key >= current.length ||
        !Object.hasOwn(current, key)
      )
        return undefined;

      current = current[key];
    } else {
      if (!isRecord(current) || !Object.hasOwn(current, key)) return undefined;

      current = current[key];
    }
  }

  return current as T | undefined;
}

export function hasAtPath(value: unknown, path: readonly (string | number)[]): boolean {
  let current: unknown = value;

  for (const key of path) {
    if (typeof key === 'number') {
      if (
        !Array.isArray(current) ||
        !Number.isSafeInteger(key) ||
        key < 0 ||
        key >= current.length ||
        !Object.hasOwn(current, key)
      )
        return false;

      current = current[key];
    } else {
      if (!isRecord(current) || !Object.hasOwn(current, key)) return false;

      current = current[key];
    }
  }

  return true;
}

export function writeAtPath<T extends TreeValue>(value: T, path: readonly (string | number)[], next: unknown): T {
  const [key, ...rest] = path;

  if (typeof key === 'number') {
    assertArrayIndex(key);
    if (!Array.isArray(value)) {
      throw new ForgeConfigError(`Cannot index ${key} because the current value is not an array.`);
    }

    if (key < 0 || key >= value.length) {
      throw new ForgeConfigError(`Index ${key} is out of range for array of length ${value.length}.`);
    }

    if (rest.length === 0) {
      const copy = [...value];

      copy[key] = immutable(next);

      return Object.freeze(copy) as T;
    }

    const copy = [...value];

    copy[key] = writeAtPath(value[key] as TreeValue, rest, next);

    return Object.freeze(copy) as T;
  }

  assertSafeKey(key);

  if (!isRecord(value)) {
    throw new ForgeConfigError(`Cannot select '${key}' because the current value is not an object.`);
  }

  if (rest.length === 0) return Object.freeze({ ...value, [key]: immutable(next) }) as T;

  const child = value[key];

  if (child !== undefined && !isRecord(child) && !Array.isArray(child)) {
    throw new ForgeConfigError(`Cannot select '${key}' because it is not an object or array.`);
  }

  const childTree = (child ?? {}) as TreeValue;

  return Object.freeze({ ...value, [key]: writeAtPath(childTree, rest, next) }) as T;
}

export function resetAtPath<T extends TreeValue>(value: T, baseline: T, path: readonly (string | number)[]): T {
  const [key, ...rest] = path;

  if (typeof key === 'number') {
    assertArrayIndex(key);
    if (!Array.isArray(value)) return value;
    if (!Array.isArray(baseline) || key >= baseline.length || key >= value.length) return value;

    if (rest.length === 0) {
      const copy = [...value];

      copy[key] = baseline[key];

      return Object.freeze(copy) as T;
    }

    const copy = [...value];

    copy[key] = resetAtPath(value[key] as TreeValue, baseline[key] as TreeValue, rest);

    return Object.freeze(copy) as T;
  }

  if (!isRecord(value)) return value;

  if (rest.length === 0) {
    if (Object.hasOwn(baseline, key)) return Object.freeze({ ...value, [key]: (baseline as RecordValue)[key] }) as T;

    const { [key]: _removed, ...next } = value;

    return Object.freeze(next) as T;
  }

  const baselineChild = (baseline as RecordValue)[key];

  if (!isRecord(baselineChild) && !Array.isArray(baselineChild)) {
    if (Object.hasOwn(baseline, key)) return Object.freeze({ ...value, [key]: baselineChild }) as T;

    const { [key]: _removed, ...next } = value;

    return Object.freeze(next) as T;
  }

  const currentChild = value[key];
  const childTree = (isRecord(currentChild) || Array.isArray(currentChild) ? currentChild : {}) as TreeValue;

  return Object.freeze({ ...value, [key]: resetAtPath(childTree, baselineChild as TreeValue, rest) }) as T;
}

export function writeMeta(meta: MetaRoot, path: readonly (string | number)[], next: boolean): MetaRoot {
  const [key, ...rest] = path;
  if (typeof key === 'number') assertArrayIndex(key);
  const stringKey = String(key);
  const copy: Record<string, MetaTree> = { ...meta };

  if (rest.length === 0) {
    if (next) copy[stringKey] = true;
    else delete copy[stringKey];
  } else {
    const child = isRecord(meta[stringKey]) ? (meta[stringKey] as MetaRoot) : {};
    const updated = writeMeta(child, rest, next);

    if (Object.keys(updated).length === 0) delete copy[stringKey];
    else copy[stringKey] = updated;
  }

  return Object.freeze(copy);
}

export function readMeta(meta: MetaRoot, path: readonly (string | number)[]): boolean {
  let current: MetaTree | undefined = meta;

  for (const key of path) {
    if (typeof key === 'number' && (!Number.isSafeInteger(key) || key < 0)) return false;
    const stringKey = String(key);

    if (!isRecord(current) || !Object.hasOwn(current, stringKey)) return false;

    current = current[stringKey] as MetaTree;
  }

  return current === true;
}

export function touchAll(value: unknown): MetaRoot {
  if (Array.isArray(value)) {
    return Object.freeze(
      Object.fromEntries(
        value.map((child, i) => [
          String(i),
          isRecord(child) || Array.isArray(child) ? touchAll(child) : (true as const),
        ]),
      ),
    );
  }

  if (!isRecord(value)) return {};

  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        isRecord(child) || Array.isArray(child) ? touchAll(child) : (true as const),
      ]),
    ),
  );
}

export function pathEquals(a: readonly (string | number)[], b: readonly (string | number)[]): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

/** Derives a single field's error message from the flat issue list. */
export function findIssue(
  issues: readonly ValidationIssue[] | undefined,
  path: readonly (string | number)[],
): string | undefined {
  if (!issues) return undefined;

  for (const issue of issues) {
    if (pathEquals(issue.path, path)) return issue.message;
  }

  return undefined;
}
