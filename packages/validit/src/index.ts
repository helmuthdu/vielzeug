// ─── Core types & base schema ────────────────────────────────────────────────
export {
  // Flat factory shortcuts
  any,
  ErrorCode,
  nullable,
  nullish,
  optional,
  preprocess,
  resolveMessage,
  Schema,
  unknown,
  ValidationError,
  type Infer,
  type InferOutput,
  type Issue,
  type MessageFn,
  type ParseResult,
} from './core';

// ─── Global configuration ────────────────────────────────────────────────────
export { configure, type Messages } from './messages';

// ─── All schema classes + flat factory exports (tree-shakable) ───────────────
export * from './schemas';

// ─── Convenience namespace (pulls full library) ───────────────────────────────
export { v } from './v';
