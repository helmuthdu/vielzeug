// Public root surface of @vielzeug/patchwork. Every public export goes through this file.
export { PatchError, PatchPathError, PatchTestError } from './errors';
export { apply, diff, formatPointer, getIn, parsePointer, tryApply } from './patch';
export type {
  AddOperation,
  ApplyResult,
  CopyOperation,
  JsonObject,
  JsonPatch,
  JsonPointer,
  JsonValue,
  MoveOperation,
  PatchErrorInfo,
  PatchOperation,
  RemoveOperation,
  ReplaceOperation,
  TestOperation,
} from './types';
