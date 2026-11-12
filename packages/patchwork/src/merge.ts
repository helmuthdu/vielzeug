/**
 * Three-way JSON merge for `@vielzeug/patchwork/merge`: two diverged copies of a shared
 * base document reconcile field-by-field instead of overwriting each other wholesale.
 * This module is policy, not RFC 6902 spec — the conflict rules below are deliberate
 * choices and the core `./patchwork` entry point stays spec-only.
 */
import { deepEqual, isPlainObject } from './_equality';
import { formatPointer } from './patch';
import type { JsonValue } from './types';

/** One location where local and remote changed the base incompatibly. */
export type MergeConflict = {
  /** The common ancestor's value; `undefined` when the key is new in both copies. */
  readonly base: JsonValue | undefined;
  /** The local side's value; `undefined` when local deleted the key (delete/modify conflict). */
  readonly local: JsonValue | undefined;
  readonly path: string;
  /** The remote side's value; `undefined` when remote deleted the key. */
  readonly remote: JsonValue | undefined;
};

export type MergeOptions = {
  /**
   * Who wins a conflict. `'remote'` (default) treats the server copy as authoritative;
   * `'local'` keeps the editing copy. Either way the conflict is still reported.
   */
  readonly resolution?: 'local' | 'remote';
};

export type MergeResult = {
  /** Conflicts in document order; empty when the merge was clean. */
  readonly conflicts: readonly MergeConflict[];
  /** The merged document: both sides applied where they do not collide. */
  readonly doc: JsonValue;
};

/**
 * Merge `local` and `remote`, both derived from `base`, without either side losing
 * unrelated edits. Objects merge key-by-key to any depth; a value only conflicts when
 * *both* sides changed it from the base to different values.
 *
 * Arrays follow the document-level policy: a side that kept the base array untouched
 * defers to the other; when both sides only appended, the additions concatenate
 * (local first); when both only truncated the tail, the shorter result wins (union of
 * removals). Any other array divergence — an insert, a mid-list edit, append vs
 * truncate — conflicts as a whole array rather than guessing a positional splice.
 */
export function merge(base: JsonValue, local: JsonValue, remote: JsonValue, options: MergeOptions = {}): MergeResult {
  const conflicts: MergeConflict[] = [];
  const localWins = options.resolution === 'local';
  const report = (path: string, fromBase: JsonValue | undefined, left: JsonValue, right: JsonValue): void => {
    conflicts.push({ base: fromBase, local: left, path, remote: right });
  };
  const conflict = (path: string, fromBase: JsonValue | undefined, left: JsonValue, right: JsonValue): JsonValue => {
    report(path, fromBase, left, right);
    return localWins ? left : right;
  };

  const mergeNode = (path: string, fromBase: JsonValue, left: JsonValue, right: JsonValue): JsonValue => {
    if (deepEqual(left, right)) return left;
    if (deepEqual(fromBase, left)) return right;
    if (deepEqual(fromBase, right)) return left;

    if (isPlainObject(fromBase) && isPlainObject(left) && isPlainObject(right)) {
      const out: Record<string, JsonValue> = {};
      const keys = new Set([...Object.keys(fromBase), ...Object.keys(left), ...Object.keys(right)]);
      for (const key of keys) {
        const childPath = `${path}${formatPointer([key])}`;
        const inBase = Object.hasOwn(fromBase, key);
        const inLeft = Object.hasOwn(left, key);
        const inRight = Object.hasOwn(right, key);
        if (inLeft && inRight && inBase) {
          out[key] = mergeNode(childPath, fromBase[key] as JsonValue, left[key] as JsonValue, right[key] as JsonValue);
        } else if (inLeft && inRight) {
          // Both sides added the same key: equal additions merge, different ones conflict
          // (there is no ancestor to fall back on).
          const addedLeft = left[key] as JsonValue;
          const addedRight = right[key] as JsonValue;
          out[key] = deepEqual(addedLeft, addedRight)
            ? addedLeft
            : conflict(childPath, undefined, addedLeft, addedRight);
        } else if (inLeft && inBase) {
          // remote deleted: an untouched local copy defers to the delete; a real edit conflicts.
          if (deepEqual(left[key] as JsonValue, fromBase[key] as JsonValue)) continue;
          report(childPath, fromBase[key] as JsonValue, left[key] as JsonValue, right[key] as JsonValue);
          if (localWins) out[key] = left[key] as JsonValue; // else the delete stands
        } else if (inRight && inBase) {
          if (deepEqual(right[key] as JsonValue, fromBase[key] as JsonValue)) continue;
          report(childPath, fromBase[key] as JsonValue, left[key] as JsonValue, right[key] as JsonValue);
          if (!localWins) out[key] = right[key] as JsonValue; // else the delete stands
        } else if (inLeft) {
          out[key] = left[key] as JsonValue; // added by local only
        } else if (inRight) {
          out[key] = right[key] as JsonValue; // added by remote only
        }
        // in neither: absent everywhere, nothing to carry.
      }
      return out;
    }

    if (Array.isArray(fromBase) && Array.isArray(left) && Array.isArray(right)) {
      const merged = mergeArrays(fromBase, left, right);
      if (merged !== null) return merged;
      return conflict(path, fromBase, left, right);
    }

    return conflict(path, fromBase, left, right);
  };

  return { conflicts, doc: mergeNode('', base, local, remote) };
}

/** The array policy: concat pure appends, keep the shorter of pure truncations, else null. */
function mergeArrays(
  base: readonly JsonValue[],
  local: readonly JsonValue[],
  remote: readonly JsonValue[],
): JsonValue[] | null {
  if (isPrefixOf(base, local) && isPrefixOf(base, remote)) {
    return [...local, ...remote.slice(base.length)];
  }
  if (isPrefixOf(local, base) && isPrefixOf(remote, base)) {
    return [...(local.length <= remote.length ? local : remote)];
  }
  return null;
}

function isPrefixOf(prefix: readonly JsonValue[], other: readonly JsonValue[]): boolean {
  return prefix.length <= other.length && prefix.every((item, index) => deepEqual(item, other[index] as JsonValue));
}
