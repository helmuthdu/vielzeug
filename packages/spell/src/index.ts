import { fail, prependIssuePath } from './errors';
import { createParseContext } from './messages';

export { ErrorCode, PipeSchema, Schema, SpellDefinitionError, SpellError, SpellValidationError } from './core';
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
  MergeSchemaModes,
  SchemaMode,
  JsonSchema,
  MessageFn,
  Messages,
  ParseContext,
  ParseResult,
  SchemaDefinition,
  SchemaDescriptor,
  SchemaWalker,
  ValidateFn,
  ValidateResult,
} from './core';
export { s } from './s';
export type { DeepPartial } from './messages';

/** Error helpers and immutable parse-context creation are secondary operations. */
export const diagnostics = {
  createParseContext,
  fail,
  prependIssuePath,
};
