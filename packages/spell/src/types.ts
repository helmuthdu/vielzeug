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
 * Return type of a `check()` callback.
 * - `string` — validation failed; the string becomes the error message.
 * - `false` — validation failed with no message (use `addIssue` for a message).
 * - `true` / `null` / `void` — validation passed.
 *
 * The shorthand `condition || 'message'` works naturally:
 * ```ts
 * s.string().check((value) => value.length > 0 || 'Cannot be empty')
 * ```
 */
export type ValidateResult = boolean | null | undefined | string;

/** Re-exported from errors for convenience — defined there. */
export type { FlatError, FlatErrorFirst } from './errors';

/* -------------------- Schema Introspection -------------------- */

/**
 * Visitor map for schema.walk(). Container handlers receive already-walked children (type R).
 * All handlers are optional — unmatched kinds return `null` unless an `unknown` fallback is provided.
 *
 * Each handler receives the concrete schema type for that kind, enabling access to
 * schema-specific properties (e.g. `ArraySchema.itemSchema`) without casting.
 */
export type SchemaWalker<R> = {
  array?: <T extends AnySchema, Mode extends SchemaMode>(
    schema: import('./schemas/array').ArraySchema<T, Mode>,
    item: R | null,
  ) => R;
  bigint?: <Input, Mode extends SchemaMode>(schema: import('./schemas/bigint').BigIntSchema<Input, Mode>) => R;
  boolean?: <Input, Mode extends SchemaMode>(schema: import('./schemas/boolean').BooleanSchema<Input, Mode>) => R;
  date?: <Input, Mode extends SchemaMode>(schema: import('./schemas/date').DateSchema<Input, Mode>) => R;
  enum?: <T extends import('./schemas/enum').EnumValues, Mode extends SchemaMode>(
    schema: import('./schemas/enum').EnumSchema<T, Mode>,
  ) => R;
  instanceof?: <T, Mode extends SchemaMode>(schema: import('./schemas/instanceof').InstanceOfSchema<T, Mode>) => R;
  intersect?: <T extends readonly AnySchema[], Mode extends SchemaMode>(
    schema: import('./schemas/intersect').IntersectSchema<T, Mode>,
    branches: (R | null)[],
  ) => R;
  lazy?: <T, Input, Mode extends SchemaMode>(schema: import('./schemas/lazy').LazySchema<T, Input, Mode>) => R;
  literal?: <T extends string | number | boolean | null | undefined, Mode extends SchemaMode>(
    schema: import('./schemas/literal').LiteralSchema<T, Mode>,
  ) => R;
  map?: <K extends AnySchema, V extends AnySchema, Mode extends SchemaMode>(
    schema: import('./schemas/map').MapSchema<K, V, Mode>,
    key: R | null,
    value: R | null,
  ) => R;
  never?: <Mode extends SchemaMode>(schema: import('./schemas/never').NeverSchema<Mode>) => R;
  number?: <Input, Mode extends SchemaMode>(schema: import('./schemas/number').NumberSchema<Input, Mode>) => R;
  object?: <T extends import('./schemas/object').ObjectShape, Mode extends SchemaMode>(
    schema: import('./schemas/object').ObjectSchema<T, Mode>,
    fields: Record<string, R | null>,
  ) => R;
  pipe?: <To extends AnySchema, From extends AnySchema, Mode extends SchemaMode>(
    schema: import('./core').PipeSchema<To, From, Mode>,
    from: R | null,
    to: R | null,
  ) => R;
  record?: <K extends AnySchema, V extends AnySchema, Mode extends SchemaMode>(
    schema: import('./schemas/record').RecordSchema<K, V, Mode>,
    key: R | null,
    value: R | null,
  ) => R;
  set?: <T extends AnySchema, Mode extends SchemaMode>(
    schema: import('./schemas/set').SetSchema<T, Mode>,
    item: R | null,
  ) => R;
  string?: <Input, Mode extends SchemaMode>(schema: import('./schemas/string').StringSchema<Input, Mode>) => R;
  tuple?: <T extends import('./schemas/tuple').TupleSchemas, Rest extends AnySchema | null, Mode extends SchemaMode>(
    schema: import('./schemas/tuple').TupleSchema<T, Rest, Mode>,
    items: (R | null)[],
    rest: R | null,
  ) => R;
  union?: <T extends readonly AnySchema[], Mode extends SchemaMode>(
    schema: import('./schemas/union').UnionSchema<T, Mode>,
    branches: (R | null)[],
  ) => R;
  unknown?: (schema: AnySchema) => R;
  variant?: <
    K extends string,
    M extends Record<string, import('./schemas/object').ObjectSchema<any, any>>,
    Mode extends SchemaMode,
  >(
    schema: import('./schemas/variant').VariantSchema<K, M, Mode>,
    branches: Record<string, R | null>,
  ) => R;
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

/* -------------------- Schema execution mode / Infer (forward-references Schema) -------------------- */

/** @internal */
export const schemaInput = Symbol('spell.schemaInput');
/** Public structural marker for a schema's parsing capability. */
export const schemaMode = Symbol('spell.schemaMode');
/** @internal */
export const schemaOutput = Symbol('spell.schemaOutput');

/** Whether a schema can be parsed synchronously or requires asynchronous parsing. */
export type SchemaMode = 'async' | 'sync';

/** A structural schema surface accepted by composition helpers. */
export type SchemaSurface<Output = unknown, Input = Output, Mode extends SchemaMode = SchemaMode> = {
  _parseFullAsync(value: unknown, ctx?: ParseContext): Promise<{ data: unknown; issues: Issue[] }>;
  _parseFullSync(value: unknown, ctx?: ParseContext): { data: unknown; issues: Issue[] };
  definition(): SchemaDescriptor;
  isOptional: boolean;
  optional(): SchemaSurface<Output | undefined, Input | undefined, Mode>;
  required(): SchemaSurface<Exclude<Output, undefined>, Exclude<Input, undefined>, Mode>;
  readonly [schemaInput]: Input;
  readonly [schemaMode]: Mode;
  readonly [schemaOutput]: Output;
  walk<R>(visitor: SchemaWalker<R>): R | null;
};

export type AnySchema<Output = unknown, Input = Output, Mode extends SchemaMode = SchemaMode> = SchemaSurface<
  Output,
  Input,
  Mode
>;

/** Extracts a schema's parsing capability. */
export type InferSchemaMode<T> = T extends { readonly [schemaMode]: infer Mode extends SchemaMode } ? Mode : never;

/** Selects async mode when any member of a schema collection is async. */
export type MergeSchemaModes<Modes extends SchemaMode> = 'async' extends Modes ? 'async' : 'sync';

export type InferOutput<T> =
  T extends Schema<infer Output, unknown, SchemaMode>
    ? Output
    : T extends { readonly [schemaOutput]: infer Output }
      ? Output
      : never;
export type InferInput<T> = T extends { readonly [schemaInput]: infer Input } ? Input : unknown;
export type Infer<T> = InferOutput<T>;

/** Re-exported for convenience — defined in messages.ts. */
export type { Messages } from './messages';
