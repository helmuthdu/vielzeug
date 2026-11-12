import { deepEqual, isPlainObject } from './_equality';
import { PatchPathError, PatchTestError } from './errors';
import type { ApplyResult, JsonObject, JsonPatch, JsonPointer, JsonValue, PatchOperation } from './types';

// ---------------------------------------------------------------------------
// RFC 6901 pointers
// ---------------------------------------------------------------------------

/** Split a JSON Pointer into decoded reference tokens (`~1` → `/`, `~0` → `~`). */
export function parsePointer(pointer: JsonPointer): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new PatchPathError(`pointer "${pointer}" must start with "/"`);
  return pointer
    .slice(1)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'));
}

/** Escape and join reference tokens into a JSON Pointer. */
export function formatPointer(tokens: readonly string[]): JsonPointer {
  return tokens.map((token) => `/${token.replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');
}

function isArrayIndex(token: string): number {
  if (/^(0|[1-9]\d*)$/.test(token)) {
    const index = Number(token);
    return index <= Number.MAX_SAFE_INTEGER ? index : -1;
  }
  return -1;
}

/** Resolve a pointer, distinguishing "targets null" from "does not exist". */
function resolve(doc: JsonValue, tokens: readonly string[]): { exists: boolean; value?: JsonValue } {
  let current: JsonValue | undefined = doc;
  for (const token of tokens) {
    if (Array.isArray(current)) {
      const index = isArrayIndex(token);
      current = index >= 0 && index < current.length ? current[index] : undefined;
    } else if (isPlainObject(current)) {
      current = Object.hasOwn(current, token) ? current[token] : undefined;
    } else {
      return { exists: false };
    }
    if (current === undefined) return { exists: false };
  }
  return { exists: true, value: current };
}

/** Read the value a pointer targets; returns `undefined` when it does not resolve. */
export function getIn(doc: JsonValue, pointer: JsonPointer): JsonValue | undefined {
  return resolve(doc, parsePointer(pointer)).value;
}

// ---------------------------------------------------------------------------
// Copy-on-write path updates (untouched subtrees keep their identity)
// ---------------------------------------------------------------------------

function descendArray(doc: readonly JsonValue[], token: string, action: string): number {
  const index = isArrayIndex(token);
  if (index < 0 || index >= doc.length) {
    throw new PatchPathError(`cannot ${action} at "/${token}": index out of bounds`);
  }
  return index;
}

/** Insert (arrays) or set (objects); `add` semantics: index may equal the array length. */
function addIn(doc: JsonValue, tokens: readonly string[], value: JsonValue): JsonValue {
  const [token = '', ...rest] = tokens;
  if (tokens.length === 0) return value;
  if (Array.isArray(doc)) {
    if (token === '-') {
      if (rest.length > 0) throw new PatchPathError(`cannot add "/-": "-" must be the final token`);
      return [...doc, value];
    }
    const index = isArrayIndex(token);
    if (index < 0 || index > doc.length) {
      throw new PatchPathError(`cannot add "/${token}": index out of bounds`);
    }
    if (rest.length > 0) {
      if (index === doc.length) throw new PatchPathError(`cannot add "/${token}": index out of bounds`);
      return [...doc.slice(0, index), addIn(doc[index] as JsonValue, rest, value), ...doc.slice(index + 1)];
    }
    return [...doc.slice(0, index), value, ...doc.slice(index)];
  }
  if (isPlainObject(doc)) {
    if (rest.length > 0) {
      if (!Object.hasOwn(doc, token)) throw new PatchPathError(`cannot add "/${token}": member does not exist`);
      return { ...doc, [token]: addIn(doc[token] as JsonValue, rest, value) };
    }
    if (Object.hasOwn(doc, token) && deepEqual(doc[token] as JsonValue, value)) return doc;
    return { ...doc, [token]: value };
  }
  throw new PatchPathError(`cannot descend into a ${typeof doc}`);
}

/** Replace in place; the target location must already exist (RFC 6902). */
function replaceIn(doc: JsonValue, tokens: readonly string[], value: JsonValue): JsonValue {
  const [token = '', ...rest] = tokens;
  if (tokens.length === 0) return value;
  if (Array.isArray(doc)) {
    const index = descendArray(doc, token, 'replace');
    if (rest.length === 0) {
      if (deepEqual(doc[index] as JsonValue, value)) return doc;
      return [...doc.slice(0, index), value, ...doc.slice(index + 1)];
    }
    return [...doc.slice(0, index), replaceIn(doc[index] as JsonValue, rest, value), ...doc.slice(index + 1)];
  }
  if (isPlainObject(doc)) {
    if (!Object.hasOwn(doc, token)) throw new PatchPathError(`cannot replace "/${token}": member does not exist`);
    if (rest.length === 0) {
      if (deepEqual(doc[token] as JsonValue, value)) return doc;
      return { ...doc, [token]: value };
    }
    return { ...doc, [token]: replaceIn(doc[token] as JsonValue, rest, value) };
  }
  throw new PatchPathError(`cannot descend into a ${typeof doc}`);
}

/** Remove the member/index the pointer targets; it must exist. */
function removeIn(doc: JsonValue, tokens: readonly string[]): JsonValue {
  const [token = '', ...rest] = tokens;
  if (tokens.length === 0) return null;
  if (Array.isArray(doc)) {
    const index = descendArray(doc, token, 'remove');
    if (rest.length === 0) return [...doc.slice(0, index), ...doc.slice(index + 1)];
    return [...doc.slice(0, index), removeIn(doc[index] as JsonValue, rest), ...doc.slice(index + 1)];
  }
  if (isPlainObject(doc)) {
    if (!Object.hasOwn(doc, token)) throw new PatchPathError(`cannot remove "/${token}": member does not exist`);
    if (rest.length === 0) {
      const next: JsonObject = { ...doc };
      delete next[token];
      return next;
    }
    return { ...doc, [token]: removeIn(doc[token] as JsonValue, rest) };
  }
  throw new PatchPathError(`cannot descend into a ${typeof doc}`);
}

function requireValue(doc: JsonValue, tokens: readonly string[], pointer: JsonPointer): JsonValue {
  const found = resolve(doc, tokens);
  if (!found.exists) throw new PatchPathError(`pointer "${pointer}" does not resolve`, { pointer });
  return found.value as JsonValue;
}

/** Attributes path failures thrown inside `run` to `pointer` (the caller's full pointer). */
function at<T>(pointer: JsonPointer, run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof PatchPathError && error.pointer === undefined) {
      throw new PatchPathError(error.message, { cause: error, pointer });
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// RFC 6902 apply / tryApply
// ---------------------------------------------------------------------------

function applyOperation(doc: JsonValue, operation: PatchOperation): JsonValue {
  switch (operation.op) {
    case 'add':
      return at(operation.path, () => addIn(doc, parsePointer(operation.path), structuredClone(operation.value)));
    case 'remove':
      return at(operation.path, () => removeIn(doc, parsePointer(operation.path)));
    case 'replace':
      return at(operation.path, () => replaceIn(doc, parsePointer(operation.path), structuredClone(operation.value)));
    case 'move': {
      const value = at(operation.from, () => requireValue(doc, parsePointer(operation.from), operation.from));
      const removed = at(operation.from, () => removeIn(doc, parsePointer(operation.from)));
      return at(operation.path, () => addIn(removed, parsePointer(operation.path), value));
    }
    case 'copy': {
      const value = at(operation.from, () => requireValue(doc, parsePointer(operation.from), operation.from));
      return at(operation.path, () => addIn(doc, parsePointer(operation.path), structuredClone(value)));
    }
    case 'test': {
      const found = resolve(doc, parsePointer(operation.path));
      if (!found.exists || !deepEqual(found.value as JsonValue, operation.value)) {
        throw new PatchTestError(`test failed at "${operation.path}"`);
      }
      return doc;
    }
  }
}

/**
 * Apply an RFC 6902 patch immutably: untouched subtrees keep their identity,
 * so consumers can diff by reference afterwards. Throws {@link PatchPathError}
 * when a pointer does not resolve and {@link PatchTestError} when a `test`
 * operation does not match — use {@link tryApply} in protocol code where a
 * rejection is an ordinary answer rather than an exception.
 */
export function apply<T extends JsonValue>(doc: T, patch: JsonPatch): T {
  let current: JsonValue = doc;
  for (const operation of patch) current = applyOperation(current, operation);
  return current as T;
}

/** Non-throwing {@link apply}: returns the patched doc or a structured rejection with the failing index. */
export function tryApply(doc: JsonValue, patch: JsonPatch): ApplyResult {
  let current: JsonValue = doc;
  for (let index = 0; index < patch.length; index += 1) {
    const operation = patch[index] as PatchOperation;
    try {
      current = applyOperation(current, operation);
    } catch (error) {
      const reason = error instanceof PatchTestError ? 'test' : 'path';
      const path = error instanceof PatchPathError ? (error.pointer ?? operation.path) : operation.path;
      return { error: { index, message: (error as Error).message, path, reason }, ok: false };
    }
  }
  return { doc: current, ok: true };
}

// ---------------------------------------------------------------------------
// diff
// ---------------------------------------------------------------------------

function diffNode(path: string, from: JsonValue, to: JsonValue, ops: PatchOperation[]): void {
  if (deepEqual(from, to)) return;
  if (Array.isArray(from) && Array.isArray(to)) {
    // Align on the common prefix and (non-overlapping) common suffix, recurse positionally
    // through the middle, then let surplus removals fall off the middle's tail (descending)
    // and surplus inserts land in ascending index order. True appends keep the `-` token.
    const shared = Math.min(from.length, to.length);
    let head = 0;
    while (head < shared && deepEqual(from[head] as JsonValue, to[head] as JsonValue)) head += 1;
    let tail = 0;
    while (
      tail < shared - head &&
      deepEqual(from[from.length - 1 - tail] as JsonValue, to[to.length - 1 - tail] as JsonValue)
    ) {
      tail += 1;
    }
    const fromMiddle = from.length - tail; // exclusive end of from's middle
    const toMiddle = to.length - tail; // exclusive end of to's middle
    const overlap = Math.min(fromMiddle, toMiddle) - head;
    for (let i = head; i < head + overlap; i += 1) {
      diffNode(`${path}/${i}`, from[i] as JsonValue, to[i] as JsonValue, ops);
    }
    for (let i = fromMiddle - 1; i >= head + overlap; i -= 1) {
      ops.push({ op: 'remove', path: `${path}/${i}` });
    }
    const appends = tail === 0; // surplus only ever lands at the end when no tail is shared
    for (let i = head + overlap; i < toMiddle; i += 1) {
      ops.push({ op: 'add', path: appends ? `${path}/-` : `${path}/${i}`, value: to[i] as JsonValue });
    }
    return;
  }
  if (isPlainObject(from) && isPlainObject(to)) {
    for (const key of Object.keys(from)) {
      if (!Object.hasOwn(to, key)) ops.push({ op: 'remove', path: `${path}${formatPointer([key])}` });
    }
    for (const key of Object.keys(to)) {
      const childPath = `${path}${formatPointer([key])}`;
      const toValue = to[key] as JsonValue;
      if (!Object.hasOwn(from, key)) {
        ops.push({ op: 'add', path: childPath, value: toValue });
      } else {
        diffNode(childPath, from[key] as JsonValue, toValue, ops);
      }
    }
    return;
  }
  ops.push({ op: 'replace', path, value: to });
}

/**
 * Compute an RFC 6902 patch that transforms `from` into `to`. Object keys
 * diff field-by-field (the payload win sync protocols want); arrays align
 * on their common prefix and suffix and emit ordered removals and indexed
 * inserts around a positionally diffed middle, so appends, prepends, and
 * middle inserts each stay one operation. Not minimal-edit: a reorder
 * diffs positionally. The result always round-trips:
 * `apply(from, diff(from, to))` deep-equals `to`.
 */
export function diff(from: JsonValue, to: JsonValue): JsonPatch {
  const ops: PatchOperation[] = [];
  diffNode('', from, to, ops);
  return ops;
}
