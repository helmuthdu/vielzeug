import { ForgeConfigError } from '../errors';

const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

type ErrorTree = Record<string, unknown>;
type RecordValue = Record<string, unknown>;
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

export function writeError(tree: ErrorTree, path: readonly string[], message: string): ErrorTree {
  const [key, ...rest] = path;

  if (!key || unsafeKeys.has(key)) return tree;

  if (rest.length === 0) return tree[key] === undefined ? { ...tree, [key]: message } : tree;

  const child = tree[key];

  if (child !== undefined && !isRecord(child)) return tree;

  return { ...tree, [key]: writeError((child ?? {}) as ErrorTree, rest, message) };
}

function isAtomicLeaf(value: unknown): boolean {
  return (
    (typeof Blob !== 'undefined' && value instanceof Blob) || (typeof File !== 'undefined' && value instanceof File)
  );
}

export function immutable<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(immutable)) as T;

  if (value === null || typeof value !== 'object' || isAtomicLeaf(value)) return value;

  if (!isRecord(value)) {
    throw new ForgeConfigError('Form values must contain only plain objects, arrays, File, Blob, or primitive values.');
  }

  return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, child]) => [key, immutable(child)]))) as T;
}

export function readAtPath<T>(value: unknown, path: readonly string[]): T | undefined {
  let current = value;

  for (const key of path) {
    if (!isRecord(current) || !Object.hasOwn(current, key)) return undefined;

    current = current[key];
  }

  return current as T | undefined;
}

export function hasAtPath(value: unknown, path: readonly string[]): boolean {
  let current = value;

  for (const key of path) {
    if (!isRecord(current) || !Object.hasOwn(current, key)) return false;

    current = current[key];
  }

  return true;
}

export function writeAtPath<T extends RecordValue>(value: T, path: readonly string[], next: unknown): T {
  const [key, ...rest] = path;

  assertSafeKey(key);

  if (rest.length === 0) return Object.freeze({ ...value, [key]: immutable(next) }) as T;

  const child = value[key];

  if (child !== undefined && !isRecord(child)) {
    throw new ForgeConfigError(`Cannot select '${key}' because it is not an object.`);
  }

  return Object.freeze({ ...value, [key]: writeAtPath((child ?? {}) as RecordValue, rest, next) }) as T;
}

export function resetAtPath<T extends RecordValue>(value: T, baseline: T, path: readonly string[]): T {
  const [key, ...rest] = path;

  if (rest.length === 0) {
    if (Object.hasOwn(baseline, key)) return Object.freeze({ ...value, [key]: baseline[key] }) as T;

    const { [key]: _removed, ...next } = value;

    return Object.freeze(next) as T;
  }

  const baselineChild = baseline[key];

  if (!isRecord(baselineChild)) {
    if (Object.hasOwn(baseline, key)) return Object.freeze({ ...value, [key]: baselineChild }) as T;

    const { [key]: _removed, ...next } = value;

    return Object.freeze(next) as T;
  }

  const currentChild = isRecord(value[key]) ? value[key] : {};

  return Object.freeze({ ...value, [key]: resetAtPath(currentChild, baselineChild, rest) }) as T;
}

export function writeMeta(meta: MetaRoot, path: readonly string[], next: boolean): MetaRoot {
  const [key, ...rest] = path;
  const copy: Record<string, MetaTree> = { ...meta };

  if (rest.length === 0) {
    if (next) copy[key] = true;
    else delete copy[key];
  } else {
    const child = isRecord(meta[key]) ? (meta[key] as MetaRoot) : {};
    const updated = writeMeta(child, rest, next);

    if (Object.keys(updated).length === 0) delete copy[key];
    else copy[key] = updated;
  }

  return Object.freeze(copy);
}

export function readMeta(meta: MetaRoot, path: readonly string[]): boolean {
  let current: MetaTree | undefined = meta;

  for (const key of path) {
    if (!isRecord(current) || !Object.hasOwn(current, key)) return false;

    current = current[key] as MetaTree;
  }

  return current === true;
}

export function touchAll(value: unknown): MetaRoot {
  if (!isRecord(value)) return {};

  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, isRecord(child) ? touchAll(child) : (true as const)]),
    ),
  );
}

export function readError(errors: unknown, path: readonly string[]): string | undefined {
  const error = readAtPath(errors, path);

  return typeof error === 'string' ? error : undefined;
}

export function normalizeErrors<T>(errors: T): T | undefined {
  if (typeof errors === 'string') return errors;

  if (!isRecord(errors)) return undefined;

  const entries = Object.entries(errors)
    .map(([key, value]) => [key, normalizeErrors(value)] as const)
    .filter(([, value]) => value !== undefined);

  return entries.length === 0 ? undefined : (Object.freeze(Object.fromEntries(entries)) as T);
}
