// Store immutability helpers.
//
// A store's `readonlyProxy_` only ever trapped top-level set/delete — nested objects
// were plain shared references, so `store.value.user.name = 'x'` silently corrupted
// live state without notifying anyone. Freezing every value that ever enters store
// state (deeply, recursively) closes that gap: nested mutation now throws a real
// TypeError instead of failing silently, matching the `Readonly<T>` the types already
// promise.

/** Recursively freezes `value` and every nested plain object/array reached from it. */
export const deepFreeze = <T>(value: T): T => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;

  Object.freeze(value);

  for (const key of Object.keys(value as object)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }

  return value;
};

/**
 * Deep-freezes every top-level property value of `obj` without freezing `obj` itself.
 * Used for the store's internal mutable container — its own top-level slots must stay
 * assignable (`current_[key] = ...`) even though every value living in them is immutable.
 */
export const freezeValues = <T extends object>(obj: T): T => {
  for (const key of Object.keys(obj)) {
    deepFreeze((obj as Record<string, unknown>)[key]);
  }

  return obj;
};
