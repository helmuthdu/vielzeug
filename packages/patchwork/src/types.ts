/** A JSON value: the only shape patchwork reads and writes. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/** An object value (the target of most patches). */
export type JsonObject = { [key: string]: JsonValue };

/** RFC 6901 JSON Pointer, e.g. `/address/street` or `/items/0`. */
export type JsonPointer = string;

export type AddOperation = { op: 'add'; path: JsonPointer; value: JsonValue };
export type RemoveOperation = { op: 'remove'; path: JsonPointer };
export type ReplaceOperation = { op: 'replace'; path: JsonPointer; value: JsonValue };
export type MoveOperation = { op: 'move'; from: JsonPointer; path: JsonPointer };
export type CopyOperation = { op: 'copy'; from: JsonPointer; path: JsonPointer };
export type TestOperation = { op: 'test'; path: JsonPointer; value: JsonValue };

/** One RFC 6902 operation. */
export type PatchOperation =
  | AddOperation
  | CopyOperation
  | MoveOperation
  | RemoveOperation
  | ReplaceOperation
  | TestOperation;

/** An RFC 6902 JSON Patch: an ordered list of operations. */
export type JsonPatch = readonly PatchOperation[];

/** Result of {@link tryApply}. Never throws: a failed `test` is data, not an exception. */
export type ApplyResult = { doc: JsonValue; ok: true } | { error: PatchErrorInfo; ok: false };

/** A machine-readable description of why a patch was rejected. */
export type PatchErrorInfo = { index: number; message: string; path: JsonPointer; reason: 'path' | 'test' };
