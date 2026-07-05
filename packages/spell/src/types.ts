/* -------------------- Error Codes -------------------- */

export const ErrorCode = {
  custom: 'custom',
  invalid_base64: 'invalid_base64',
  invalid_date: 'invalid_date',
  invalid_duration: 'invalid_duration',
  invalid_enum: 'invalid_enum',
  invalid_finite: 'invalid_finite',
  invalid_integer: 'invalid_integer',
  invalid_keys: 'invalid_keys',
  invalid_length: 'invalid_length',
  invalid_literal: 'invalid_literal',
  invalid_multiple_of: 'invalid_multiple_of',
  invalid_safe: 'invalid_safe',
  invalid_string: 'invalid_string',
  invalid_type: 'invalid_type',
  invalid_union: 'invalid_union',
  invalid_unique: 'invalid_unique',
  invalid_url: 'invalid_url',
  invalid_variant: 'invalid_variant',
  too_big: 'too_big',
  too_small: 'too_small',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/* -------------------- Messages -------------------- */

/**
 * A validation message — either a static string or a function that receives context and returns a string.
 * **Note:** Static string values are used verbatim with no interpolation. Use the function form
 * for context-dependent messages (e.g. `(ctx) => \`Must be at least ${ctx.min}\``).
 */
export type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> = string | ((ctx: Ctx) => string);

/* -------------------- JSON Schema -------------------- */

/** Plain JSON Schema object (targeting JSON Schema 2020-12). */
export type JsonSchema = Record<string, unknown>;

/* -------------------- Issues -------------------- */

/**
 * A typed discriminated union of all issues emitted by built-in validators.
 *
 * Narrowing on `code` gives precise access to `params`:
 * ```ts
 * if (error.code === 'too_small') {
 *   const min = error.params.min; // number | bigint | Date
 * }
 * ```
 */
export type Issue =
  | { code: 'custom'; message: string; params?: Record<string, unknown>; path: (string | number)[] }
  | { code: 'invalid_base64'; message: string; params: { format: string }; path: (string | number)[] }
  | { code: 'invalid_date'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_duration'; message: string; params: { format: string }; path: (string | number)[] }
  | { code: 'invalid_enum'; message: string; params: { values: readonly unknown[] }; path: (string | number)[] }
  | { code: 'invalid_finite'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_integer'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_keys'; message: string; params: { keys: string[] }; path: (string | number)[] }
  | { code: 'invalid_length'; message: string; params: { exact: number }; path: (string | number)[] }
  | { code: 'invalid_literal'; message: string; params: { expected: unknown }; path: (string | number)[] }
  | { code: 'invalid_multiple_of'; message: string; params: { step: number | bigint }; path: (string | number)[] }
  | { code: 'invalid_safe'; message: string; params?: undefined; path: (string | number)[] }
  | {
      code: 'invalid_string';
      message: string;
      params: { format?: string; includes?: string; pattern?: string; prefix?: string; suffix?: string };
      path: (string | number)[];
    }
  | { code: 'invalid_type'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_union'; message: string; params: { errors: Issue[][] }; path: (string | number)[] }
  | { code: 'invalid_unique'; message: string; params: { unique: true }; path: (string | number)[] }
  | { code: 'invalid_url'; message: string; params: { format: string }; path: (string | number)[] }
  | {
      code: 'invalid_variant';
      message: string;
      params: { discriminator: string; expected: string[] };
      path: (string | number)[];
    }
  | {
      code: 'too_big';
      message: string;
      params: { exclusive?: boolean; max: number | bigint | Date };
      path: (string | number)[];
    }
  | {
      code: 'too_small';
      message: string;
      params: { exclusive?: boolean; min: number | bigint | Date };
      path: (string | number)[];
    }
  | { code: string & {}; message: string; params?: Record<string, unknown>; path: (string | number)[] };

/** ParseContext carries the active message set through the parse pipeline. */
export type ParseContext = {
  messages: import('./messages').Messages;
};

/**
 * Validator function. Receives the value after type-checking and the active ParseContext.
 * Returns an Issue array on failure, null on success, or a Promise for async validators.
 */
export type ValidateFn = (value: unknown, ctx?: ParseContext) => Issue[] | null | Promise<Issue[] | null>;

export type CheckContext = {
  addIssue: (issue: {
    code: string;
    message: string;
    params?: Record<string, unknown>;
    path?: (string | number)[];
  }) => void;
};

/**
 * Return type of a `validate()` callback.
 * - `string` — validation failed; the string becomes the error message.
 * - `false` — validation failed with no message (use `addIssue` for a message).
 * - `true` / `null` / `void` — validation passed.
 *
 * The shorthand `condition || 'message'` works naturally:
 * ```ts
 * s.string().validate(v => v.length > 0 || 'Cannot be empty')
 * ```
 */
export type ValidateResult = boolean | null | void | string;

/** Re-exported from errors for convenience — defined there. */
export type { FlatError, FlatErrorFirst, FormattedErrors } from './errors';

/* -------------------- Schema Introspection -------------------- */

/**
 * Visitor map for schema.walk(). Container handlers receive already-walked children (type R).
 * All handlers are optional — unmatched kinds return `null` unless an `unknown` fallback is provided.
 *
 * Each handler receives the concrete schema type for that kind, enabling access to
 * schema-specific properties (e.g. `ArraySchema.itemSchema`) without casting.
 */
export type SchemaWalker<R> = {
  array?: (schema: import('./schemas/array').ArraySchema<any>, item: R | null) => R;
  bigint?: (schema: import('./schemas/bigint').BigIntSchema<any>) => R;
  boolean?: (schema: import('./schemas/boolean').BooleanSchema<any>) => R;
  date?: (schema: import('./schemas/date').DateSchema<any>) => R;
  enum?: (schema: import('./schemas/enum').EnumSchema<any>) => R;
  instanceof?: (schema: import('./schemas/instanceof').InstanceOfSchema<any>) => R;
  intersect?: (schema: import('./schemas/intersect').IntersectSchema<any>, branches: (R | null)[]) => R;
  lazy?: (schema: import('./schemas/lazy').LazySchema<any>) => R;
  literal?: (schema: import('./schemas/literal').LiteralSchema<any>) => R;
  map?: (schema: import('./schemas/map').MapSchema<any, any>, key: R | null, value: R | null) => R;
  never?: (schema: import('./schemas/never').NeverSchema) => R;
  number?: (schema: import('./schemas/number').NumberSchema<any>) => R;
  object?: (schema: import('./schemas/object').ObjectSchema<any>, fields: Record<string, R | null>) => R;
  pipe?: (schema: import('./core').PipeSchema<any, any>, from: R | null, to: R | null) => R;
  record?: (schema: import('./schemas/record').RecordSchema<any, any>, key: R | null, value: R | null) => R;
  set?: (schema: import('./schemas/set').SetSchema<any>, item: R | null) => R;
  string?: (schema: import('./schemas/string').StringSchema<any>) => R;
  tuple?: (schema: import('./schemas/tuple').TupleSchema<any, any>, items: (R | null)[], rest: R | null) => R;
  union?: (schema: import('./schemas/union').UnionSchema<any>, branches: (R | null)[]) => R;
  unknown?: (schema: AnySchema) => R;
  variant?: (schema: import('./schemas/variant').VariantSchema<any, any>, branches: Record<string, R | null>) => R;
};

type BaseDescriptor = {
  description?: string;
  isNullable?: boolean;
  isOptional?: boolean;
};

export type SchemaDescriptor = BaseDescriptor &
  (
    | { kind: 'any' | 'unknown' | 'never' | 'boolean' | 'bigint' | 'date' | 'lazy' }
    | { className: string; kind: 'instanceof' }
    | {
        contentEncoding?: string;
        format?: string;
        kind: 'string';
        maxLength?: number;
        minLength?: number;
        pattern?: string | null;
      }
    | {
        exclusiveMaximum?: number;
        exclusiveMinimum?: number;
        kind: 'number';
        maximum?: number;
        minimum?: number;
        multipleOf?: number;
        typeHint?: 'integer';
      }
    | { kind: 'literal'; value: string | number | boolean | null | undefined }
    | { kind: 'enum'; values: readonly (string | number)[] }
    | { items: SchemaDescriptor; kind: 'array'; maxItems?: number; minItems?: number }
    | { items: SchemaDescriptor[]; kind: 'tuple'; rest: SchemaDescriptor | null }
    | { fields: Record<string, SchemaDescriptor>; kind: 'object'; strict: boolean }
    | { key: SchemaDescriptor; kind: 'record'; value: SchemaDescriptor }
    | { items: SchemaDescriptor; kind: 'set' }
    | { key: SchemaDescriptor; kind: 'map'; value: SchemaDescriptor }
    | { branches: SchemaDescriptor[]; kind: 'union' | 'intersect' }
    | { branches: Record<string, SchemaDescriptor>; discriminator: string; kind: 'variant' }
    | { from: SchemaDescriptor; kind: 'pipe'; to: SchemaDescriptor }
  );

/* -------------------- ParseResult (forward-references SpellValidationError) -------------------- */

import type { Schema } from './core';
// Import only the type to avoid circular dependencies
import type { SpellValidationError } from './errors';

export type ParseResult<T> = { data: T; success: true } | { error: SpellValidationError; success: false };

/* -------------------- AnySchema / Infer (forward-references Schema) -------------------- */

export type AnySchema = Schema<unknown, unknown>;
export type InferOutput<T> = T extends Schema<infer O> ? O : never;
export type InferInput<T> = T extends Schema<any, infer I> ? I : never;
export type Infer<T> = InferOutput<T>;

/** Re-exported for convenience — defined in messages.ts. */
export type { Messages } from './messages';
