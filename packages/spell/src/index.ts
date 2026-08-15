import { fail, prependIssuePath } from './errors';
import { createParseContext } from './messages';

export type {
  AnySchema,
  CheckContext,
  FlatError,
  FlatErrorFirst,
  Infer,
  InferInput,
  InferOutput,
  InferSchemaMode,
  Issue,
  JsonSchema,
  MergeSchemaModes,
  MessageFn,
  Messages,
  ParseContext,
  ParseResult,
  SchemaDescriptor,
  SchemaMode,
  SchemaWalker,
  ValidateFn,
  ValidateResult,
} from './core';
export {
  ErrorCode,
  PipeSchema,
  Schema,
  SpellDefinitionError,
  SpellError,
  SpellValidationError,
  schemaMode,
} from './core';
export type { DeepPartial } from './messages';
export { s } from './s';

/** Error helpers and immutable parse-context creation are secondary operations. */
export const diagnostics = {
  createParseContext,
  fail,
  prependIssuePath,
};
