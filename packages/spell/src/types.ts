import type { SpellValidationError } from './errors';
import type { Messages } from './messages';
import type { Schema } from './schema';

/* -------------------- Error codes -------------------- */

export const ErrorCode = {
  custom: 'custom',
  invalid_date: 'invalid_date',
  invalid_discriminator: 'invalid_discriminator',
  invalid_enum: 'invalid_enum',
  invalid_finite: 'invalid_finite',
  invalid_format: 'invalid_format',
  invalid_integer: 'invalid_integer',
  invalid_keys: 'invalid_keys',
  invalid_length: 'invalid_length',
  invalid_literal: 'invalid_literal',
  invalid_multiple_of: 'invalid_multiple_of',
  invalid_safe: 'invalid_safe',
  invalid_type: 'invalid_type',
  invalid_union: 'invalid_union',
  invalid_unique: 'invalid_unique',
  too_big: 'too_big',
  too_small: 'too_small',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/* -------------------- Issues -------------------- */

type IssueOf<C extends string, P> = { code: C; message: string; path: (string | number)[] } & (undefined extends P
  ? { params?: P }
  : { params: P });

/**
 * A typed discriminated union of all issues emitted by built-in validators.
 * Narrowing on `code` gives precise access to `params`:
 *
 * ```ts
 * if (issue.code === 'too_small') issue.params.min; // number | bigint | Date
 * ```
 */
export type Issue =
  | IssueOf<'custom', Record<string, unknown> | undefined>
  | IssueOf<'invalid_date', undefined>
  | IssueOf<'invalid_discriminator', { discriminator: string; expected: string[] }>
  | IssueOf<'invalid_enum', { values: readonly unknown[] }>
  | IssueOf<'invalid_finite', undefined>
  | IssueOf<'invalid_format', { format: string; includes?: string; pattern?: string; prefix?: string; suffix?: string }>
  | IssueOf<'invalid_integer', undefined>
  | IssueOf<'invalid_keys', { keys: string[] }>
  | IssueOf<'invalid_length', { exact: number }>
  | IssueOf<'invalid_literal', { expected: unknown }>
  | IssueOf<'invalid_multiple_of', { step: number | bigint }>
  | IssueOf<'invalid_safe', undefined>
  | IssueOf<'invalid_type', undefined>
  | IssueOf<'invalid_union', { errors: Issue[][] }>
  | IssueOf<'invalid_unique', undefined>
  | IssueOf<'too_big', { exclusive?: boolean; max: number | bigint | Date }>
  | IssueOf<'too_small', { exclusive?: boolean; min: number | bigint | Date }>
  | { code: string & {}; message: string; params?: Record<string, unknown>; path: (string | number)[] };

/**
 * An issue path in either shape: spell-native `(string | number)[]` or the
 * Standard Schema `(PropertyKey | { key })[]` format.
 */
export type IssuePathSegment = PropertyKey | { readonly key: PropertyKey };
export type IssuePath = readonly IssuePathSegment[];

/* -------------------- Messages and contexts -------------------- */

/**
 * A validation message: a static string used verbatim, or a function of the constraint context
 * (e.g. `({ min }) => \`At least ${min}\``).
 */
export type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> = string | ((ctx: Ctx) => string);

/** Carries the active message set through a parse. Create one with `createParseContext()`. */
export type ParseContext = { readonly messages: Messages };

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
 * - `string`: validation failed; the string becomes the error message.
 * - `false`: validation failed (with the default message unless `addIssue` reported one).
 * - `true` / `null` / `undefined`: validation passed.
 *
 * ```ts
 * s.string().check((value) => value.length > 0 || 'Cannot be empty');
 * ```
 */
export type ValidateResult = boolean | null | undefined | string;

export type ParseResult<T> = { data: T; success: true } | { error: SpellValidationError; success: false };

/* -------------------- Definitions -------------------- */

/** A regular expression captured as data. */
export type PatternDescriptor = { readonly flags: string; readonly source: string };

type BaseDescriptor = {
  description?: string;
  isNullable?: true;
  isOptional?: true;
};

type NumericBounds<N> = {
  exclusiveMaximum?: N;
  exclusiveMinimum?: N;
  maximum?: N;
  minimum?: N;
  multipleOf?: N;
};

/** Declarative, frozen description of a schema returned by `schema.definition()`. */
export type SchemaDescriptor = BaseDescriptor &
  (
    | { kind: 'unknown' | 'never' | 'boolean' | 'lazy' }
    | ({ kind: 'bigint' } & NumericBounds<bigint>)
    | ({ finite?: true; integer?: true; kind: 'number' } & NumericBounds<number>)
    | {
        formats?: readonly string[];
        kind: 'string';
        maxLength?: number;
        minLength?: number;
        patterns?: readonly PatternDescriptor[];
      }
    | { kind: 'date'; maximum?: string; minimum?: string }
    | { className: string; kind: 'instanceof' }
    | { kind: 'literal'; value: string | number | boolean | null | undefined }
    | { kind: 'enum'; values: readonly (string | number)[] }
    | { items: SchemaDescriptor; kind: 'array'; maxItems?: number; minItems?: number; uniqueItems?: true }
    | { items: readonly SchemaDescriptor[]; kind: 'tuple'; rest: SchemaDescriptor | null }
    | {
        fields: Readonly<Record<string, SchemaDescriptor>>;
        kind: 'object';
        strict: boolean;
        tolerated?: readonly string[];
      }
    | { key: SchemaDescriptor; kind: 'record'; value: SchemaDescriptor }
    | { items: SchemaDescriptor; kind: 'set'; maxSize?: number; minSize?: number }
    | { key: SchemaDescriptor; kind: 'map'; maxSize?: number; minSize?: number; value: SchemaDescriptor }
    | { branches: readonly SchemaDescriptor[]; kind: 'union' | 'intersect' }
    | { branches: Readonly<Record<string, SchemaDescriptor>>; discriminator: string; kind: 'discriminatedUnion' }
    | { from: SchemaDescriptor; kind: 'pipe'; to: SchemaDescriptor }
  );

export type SchemaKind = SchemaDescriptor['kind'];

/* -------------------- Standard Schema v1 -------------------- */

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

/* -------------------- Inference -------------------- */

/** Structural marker for a schema's input type. */
export const schemaInput = Symbol('spell.schemaInput');
/** Structural marker for a schema's output type. */
export const schemaOutput = Symbol('spell.schemaOutput');
export declare const schemaAcceptsMissing: unique symbol;
/** Marks a schema whose input may be missing (`optional()`, `nullish()`, `default()`, `catch()`). */
export type AcceptsMissing = { readonly [schemaAcceptsMissing]: true };

/** Any schema. Use as a generic constraint: `<T extends AnySchema>`. */
export type AnySchema = Schema<unknown, unknown>;

export type InferOutput<T> = T extends { readonly [schemaOutput]: infer Output } ? Output : never;
type RawInferInput<T> = T extends { readonly [schemaInput]: infer Input } ? Input : unknown;
export type InferInput<T> = T extends AcceptsMissing ? RawInferInput<T> | undefined : RawInferInput<T>;
export type Infer<T> = InferOutput<T>;
