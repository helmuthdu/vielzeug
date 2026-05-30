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
 * if (issue.code === 'too_small') {
 *   const min = issue.params.min; // number | bigint | Date
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

/**
 * Validator function. Receives the value after type-checking.
 * Returns an Issue array on failure, null on success, or a Promise for async validators.
 */
export type ValidateFn = (value: unknown) => Issue[] | null | Promise<Issue[] | null>;

export type CheckContext = {
  addIssue: (issue: {
    code: string;
    message: string;
    params?: Record<string, unknown>;
    path?: (string | number)[];
  }) => void;
};

export type CheckFnResult = void | null | undefined | boolean | string;

/** Re-exported from errors for convenience — defined there. */
export type { FlatError, FlatErrorFirst, FormattedErrors } from './errors';

/* -------------------- Schema Introspection -------------------- */

/**
 * Visitor map for schema.walk(). Container handlers receive already-walked children (type R).
 * All handlers are optional — unmatched kinds fall through to the `unknown` fallback.
 * Throws if no handler matches and no `unknown` fallback is provided.
 */
export type SchemaWalker<R> = {
  array?: (schema: AnySchema, item: R) => R;
  bigint?: (schema: AnySchema) => R;
  boolean?: (schema: AnySchema) => R;
  date?: (schema: AnySchema) => R;
  enum?: (schema: AnySchema) => R;
  instanceof?: (schema: AnySchema) => R;
  intersect?: (schema: AnySchema, branches: R[]) => R;
  lazy?: (schema: AnySchema) => R;
  literal?: (schema: AnySchema) => R;
  map?: (schema: AnySchema, key: R, value: R) => R;
  never?: (schema: AnySchema) => R;
  nullable?: (schema: AnySchema, inner: R) => R;
  nullish?: (schema: AnySchema, inner: R) => R;
  number?: (schema: AnySchema) => R;
  object?: (schema: AnySchema, fields: Record<string, R>) => R;
  optional?: (schema: AnySchema, inner: R) => R;
  pipe?: (schema: AnySchema, from: R, to: R) => R;
  record?: (schema: AnySchema, key: R, value: R) => R;
  set?: (schema: AnySchema, item: R) => R;
  string?: (schema: AnySchema) => R;
  tuple?: (schema: AnySchema, items: R[], rest: R | null) => R;
  union?: (schema: AnySchema, branches: R[]) => R;
  unknown?: (schema: AnySchema) => R;
  variant?: (schema: AnySchema, branches: Record<string, R>) => R;
};

type BaseDescriptor = {
  description?: string;
  isNullable?: boolean;
  isOptional?: boolean;
};

export type SchemaDescriptor = BaseDescriptor &
  (
    | { kind: 'any' | 'unknown' | 'never' | 'boolean' | 'bigint' | 'date' | 'lazy' | 'instanceof' }
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
    | { item: SchemaDescriptor; kind: 'set' }
    | { key: SchemaDescriptor; kind: 'map'; value: SchemaDescriptor }
    | { branches: SchemaDescriptor[]; kind: 'union' | 'intersect' }
    | { branches: Record<string, SchemaDescriptor>; discriminator: string; kind: 'variant' }
    | { from: SchemaDescriptor; kind: 'pipe'; to: SchemaDescriptor }
  );

export type WrapperMode = 'nullable' | 'nullish' | 'optional';

/* -------------------- ParseResult (forward-references ValidationError) -------------------- */

// Import only the type to avoid circular dependencies
import type { ValidationError } from './errors';

export type ParseResult<T> = { data: T; success: true } | { error: ValidationError; success: false };

/* -------------------- AnySchema / Infer (forward-references Schema) -------------------- */

import type { Schema } from './core';

export type AnySchema = Schema<unknown, unknown>;
export type InferOutput<T> = T extends Schema<infer O> ? O : never;
export type InferInput<T> = T extends Schema<any, infer I> ? I : never;
export type Infer<T> = InferOutput<T>;
