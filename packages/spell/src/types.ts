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

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
  interface Props<Input = unknown, Output = Input> {
    readonly types?: Types<Input, Output> | undefined;
    readonly validate: (value: unknown, options?: Options | undefined) => Result<Output> | Promise<Result<Output>>;
    readonly vendor: string;
    readonly version: 1;
  }

  type Result<Output> = { readonly issues: readonly Issue[] } | { readonly issues?: undefined; readonly value: Output };

  interface Options {
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }

  interface Issue {
    readonly message: string;
    readonly path?: readonly (PropertyKey | PathSegment)[] | undefined;
  }

  interface PathSegment {
    readonly key: PropertyKey;
  }

  interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }

  type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input'];
  type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output'];
}

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

type BaseDescriptor = {
  description?: string;
  isNullable?: boolean;
  isOptional?: boolean;
};

export type SchemaDescriptor = BaseDescriptor &
  (
    | { kind: 'unknown' | 'never' | 'boolean' | 'bigint' | 'date' | 'lazy' }
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

/** Structural marker for a schema's input type. Emitted so public types can key on it. */
export const schemaInput = Symbol('spell.schemaInput');
/** Structural marker for a schema's output type. Emitted so public types can key on it. */
export const schemaOutput = Symbol('spell.schemaOutput');
export declare const schemaAcceptsMissing: unique symbol;
export type AcceptsMissing = { readonly [schemaAcceptsMissing]: true };

/** A structural schema surface accepted by composition helpers. */
export type SchemaSurface<Output = unknown, Input = Output> = {
  /** @internal */
  _parseFullAsync(value: unknown, ctx?: ParseContext): Promise<{ data: unknown; issues: Issue[] }>;
  /** @internal */
  _parseFullSync(value: unknown, ctx?: ParseContext): { data: unknown; issues: Issue[] };
  safeParseAsync(value: unknown, ctx?: ParseContext): Promise<ParseResult<Output>>;
  definition(): SchemaDescriptor;
  isOptional: boolean;
  optional(): SchemaSurface<Output | undefined, Input | undefined>;
  required(): SchemaSurface<Exclude<Output, undefined>, Exclude<Input, undefined>>;
  readonly [schemaInput]: Input;
  readonly [schemaOutput]: Output;
};

export type AnySchema<Output = unknown, Input = Output> = SchemaSurface<Output, Input>;

/**
 * The synchronous parse capability every schema carries. UI adapters that accept
 * `AnySchema` cannot call `safeParse` on it (the surface type omits it); type adapter
 * parameters against this instead.
 *
 * The shape is structural, so a schema with async checks is assignable to it; calling
 * `safeParse` on one returns a failed `ParseResult` ("parse() cannot evaluate async
 * checks"). Use `safeParseAsync` when async checks may be present.
 */
export type SyncParsable<T = unknown> = { safeParse(value: unknown): ParseResult<T> };

/**
 * An issue path in either shape: spell-native `(string | number)[]` or the
 * Standard Schema `(PropertyKey | { key })[]` format.
 */
export type IssuePathSegment = PropertyKey | { readonly key: PropertyKey };
export type IssuePath = readonly IssuePathSegment[];

export type InferOutput<T> =
  T extends Schema<infer Output, unknown>
    ? Output
    : T extends { readonly [schemaOutput]: infer Output }
      ? Output
      : never;
type RawInferInput<T> = T extends { readonly [schemaInput]: infer Input } ? Input : unknown;
export type InferInput<T> = T extends AcceptsMissing ? RawInferInput<T> | undefined : RawInferInput<T>;
export type Infer<T> = InferOutput<T>;

/** Re-exported for convenience — defined in messages.ts. */
export type { Messages } from './messages';
