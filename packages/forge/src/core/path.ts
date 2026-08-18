import { ForgeConfigError } from '../errors';

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

type ErrorNode = string | ErrorTree | ErrorArray;
export interface ErrorTree {
  readonly [key: string]: ErrorNode;
}
type ErrorArray = ErrorNode[];
type MutableErrorTree = Record<string, ErrorNode>;
type RecordValue = Record<string, unknown>;
type TreeValue = RecordValue | readonly unknown[];
type MetaTree = true | MetaNode;
interface MetaNode {
  readonly [key: string]: MetaTree;
}
export type MetaRoot = MetaNode;

export function isRecord(value: unknown): value is RecordValue {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

export function assertSafeKey(key: string): void {
  if (!key || unsafeKeys.has(key)) throw new ForgeConfigError(`Invalid field key '${key}'.`);
}

function isAtomicLeaf(value: unknown): boolean {
  return (
    (typeof Blob !== 'undefined' && value instanceof Blob) ||
    (typeof File !== 'undefined' && value instanceof File) ||
    value instanceof Date
  );
}

export function immutable<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(immutable)) as T;

  if (value === null || typeof value !== 'object' || isAtomicLeaf(value)) return value;

  if (!isRecord(value)) {
    throw new ForgeConfigError(
      'Form values must contain only plain objects, arrays, Date, File, Blob, or primitive values.',
    );
  }

  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [key, immutable(child)]))) as T;
}

export function readAtPath<T>(value: unknown, path: readonly (string | number)[]): T | undefined {
  let current: unknown = value;

  for (const key of path) {
    if (typeof key === 'number') {
      if (!Array.isArray(current) || key < 0 || key >= current.length) return undefined;

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
      if (!Array.isArray(current) || key < 0 || key >= current.length) return false;

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

export function readError(errors: unknown, path: readonly (string | number)[]): string | undefined {
  const error = readAtPath(errors, path);

  return typeof error === 'string' ? error : undefined;
}

function writeErrorNode(
  node: ErrorTree | ErrorArray | undefined,
  path: readonly (string | number)[],
  message: string,
): ErrorTree | ErrorArray {
  const [key, ...rest] = path;

  if (typeof key === 'number') {
    const arr: ErrorNode[] = Array.isArray(node) ? [...node] : [];

    if (rest.length === 0) {
      if (arr[key] === undefined) arr[key] = message;
    } else {
      arr[key] = writeErrorNode(arr[key] as ErrorTree | ErrorArray | undefined, rest, message);
    }

    return arr;
  }

  if (!key || unsafeKeys.has(key)) return node ?? {};

  const record: MutableErrorTree = isRecord(node) ? { ...node } : {};

  if (rest.length === 0) {
    if (record[key] === undefined) record[key] = message;
  } else {
    record[key] = writeErrorNode(record[key] as ErrorTree | ErrorArray | undefined, rest, message);
  }

  return record;
}

export function writeError(tree: ErrorTree, path: readonly (string | number)[], message: string): ErrorTree {
  const result = writeErrorNode(tree, path, message);

  return isRecord(result) ? result : tree;
}

export function normalizeErrors<T>(errors: T): T | undefined {
  if (typeof errors === 'string') return errors;

  if (Array.isArray(errors)) {
    const normalized = errors.map((item) => normalizeErrors(item));

    if (normalized.every((value) => value === undefined)) return undefined;

    return Object.freeze(normalized) as T;
  }

  if (!isRecord(errors)) return undefined;

  const entries = Object.entries(errors)
    .map(([key, value]) => [key, normalizeErrors(value)] as const)
    .filter(([, value]) => value !== undefined);

  return entries.length === 0 ? undefined : (Object.freeze(Object.fromEntries(entries)) as T);
}
