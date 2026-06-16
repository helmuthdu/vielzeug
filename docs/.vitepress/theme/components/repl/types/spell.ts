export const spellTypes = String.raw`
declare module '/spell' {
  export const ErrorCode: {
    custom: 'custom';
    invalid_base64: 'invalid_base64';
    invalid_date: 'invalid_date';
    invalid_duration: 'invalid_duration';
    invalid_enum: 'invalid_enum';
    invalid_finite: 'invalid_finite';
    invalid_integer: 'invalid_integer';
    invalid_keys: 'invalid_keys';
    invalid_length: 'invalid_length';
    invalid_literal: 'invalid_literal';
    invalid_multiple_of: 'invalid_multiple_of';
    invalid_safe: 'invalid_safe';
    invalid_string: 'invalid_string';
    invalid_type: 'invalid_type';
    invalid_union: 'invalid_union';
    invalid_unique: 'invalid_unique';
    invalid_url: 'invalid_url';
    invalid_variant: 'invalid_variant';
    too_big: 'too_big';
    too_small: 'too_small';
  };

  export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

  export type Issue = {
    code: ErrorCode | (string & {});
    message: string;
    params?: Record<string, unknown>;
    path: (string | number)[];
  };

  export type FlatError = { messages: string[]; path: (string | number)[] };

  export type FormattedErrors = {
    _errors: string[];
    [key: string]: FormattedErrors | string[];
  };

  export class ValidationError extends Error {
    readonly issues: Issue[];
    flatten(): { fieldErrors: FlatError[]; formErrors: string[] };
    flattenFirst(): { fieldErrors: Record<string, string>; formErrors: string[] };
    format(): FormattedErrors;
    static is(value: unknown): value is ValidationError;
  }

  export type ParseResult<T> =
    | { data: T; success: true }
    | { error: ValidationError; success: false };

  export type ValidateResult = boolean | string | null | void;

  export type CheckContext = {
    addIssue: (issue: Omit<Issue, 'path'> & { path?: (string | number)[] }) => void;
  };

  export type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> =
    | string
    | ((ctx: Ctx) => string);

  export type JsonSchema = Record<string, unknown>;

  export type SchemaDescriptor = {
    description?: string;
    kind:
      | 'any'
      | 'unknown'
      | 'string'
      | 'number'
      | 'boolean'
      | 'date'
      | 'bigint'
      | 'null'
      | 'undefined'
      | 'never'
      | 'literal'
      | 'enum'
      | 'object'
      | 'array'
      | 'tuple'
      | 'record'
      | 'set'
      | 'map'
      | 'union'
      | 'intersect'
      | 'variant'
      | 'pipe'
      | 'wrapper';
    [key: string]: unknown;
  };

  export type SchemaWalker<R> = {
    [kind: string]: ((schema: Schema<any>, ...args: any[]) => R) | undefined;
    unknown?: (schema: Schema<any>) => R;
  };

  export class Schema<Output = unknown, Input = Output> {
    parse(value: Input): Output;
    safeParse(value: Input): ParseResult<Output>;
    parseAsync(value: Input): Promise<Output>;
    safeParseAsync(value: Input): Promise<ParseResult<Output>>;

    validate(fn: (value: Output, ctx: CheckContext) => ValidateResult | Promise<ValidateResult>): this;
    refine(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this;

    optional(): Schema<Output | undefined, Input | undefined>;
    nullable(): Schema<Output | null, Input | null>;
    nullish(): Schema<Output | null | undefined, Input | null | undefined>;
    required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>>;

    default(value: Output | (() => Output)): this;
    catch(value: Output | (() => Output)): this;
    transform<U>(fn: (value: Output) => U): Schema<U, Input>;
    preprocess(fn: (value: unknown) => unknown): this;
    pipe<B>(next: Schema<B, Output>): Schema<B, Input>;
    label(description: string): this;
    toDescriptor(): SchemaDescriptor;
    toJsonSchema(): JsonSchema;
    walk<R>(visitor: SchemaWalker<R>): R | null;

    get kind(): string;
    get description(): string | undefined;
    get isOptional(): boolean;
    get isNullable(): boolean;
    equals(other: Schema<any>): boolean;
    is(value: unknown): value is Output;
    assert(value: unknown, label?: string): asserts value is Output;
  }

  export class StringSchema<Input = string> extends Schema<string, Input> {
    min(length: number, message?: MessageFn<{ min: number; value: string }>): this;
    max(length: number, message?: MessageFn<{ max: number; value: string }>): this;
    length(exact: number, message?: MessageFn<{ exact: number; value: string }>): this;
    nonEmpty(message?: MessageFn<{ min: number; value: string }>): this;
    startsWith(prefix: string, message?: MessageFn<{ prefix: string; value: string }>): this;
    endsWith(suffix: string, message?: MessageFn<{ suffix: string; value: string }>): this;
    includes(substr: string, message?: MessageFn<{ substr: string; value: string }>): this;
    regex(pattern: RegExp, message?: MessageFn<{ value: string }>): this;
    email(message?: MessageFn<{ value: string }>): this;
    url(message?: MessageFn<{ value: string }>): this;
    uuid(message?: MessageFn<{ value: string }>): this;
    isoDate(message?: MessageFn<{ value: string }>): this;
    isoDateTime(message?: MessageFn<{ value: string }>): this;
    trim(): this;
    lowercase(): this;
    uppercase(): this;
    ip(message?: MessageFn<{ value: string }>): this;
    cuid(message?: MessageFn<{ value: string }>): this;
    cuid2(message?: MessageFn<{ value: string }>): this;
    ulid(message?: MessageFn<{ value: string }>): this;
    nanoid(message?: MessageFn<{ value: string }>): this;
    base64(message?: MessageFn<{ value: string }>): this;
    base64url(message?: MessageFn<{ value: string }>): this;
    hex(message?: MessageFn<{ value: string }>): this;
    hexColor(message?: MessageFn<{ value: string }>): this;
    emoji(message?: MessageFn<{ value: string }>): this;
    jwt(message?: MessageFn<{ value: string }>): this;
    time(message?: MessageFn<{ value: string }>): this;
    duration(message?: MessageFn<{ value: string }>): this;
    semver(message?: MessageFn<{ value: string }>): this;
    slug(message?: MessageFn<{ value: string }>): this;
    numeric(message?: MessageFn<{ value: string }>): this;
  }

  export class NumberSchema<Input = number> extends Schema<number, Input> {
    min(minimum: number, message?: MessageFn<{ min: number; value: number }>): this;
    max(maximum: number, message?: MessageFn<{ max: number; value: number }>): this;
    int(message?: MessageFn<{ value: number }>): this;
    positive(message?: MessageFn<{ value: number }>): this;
    negative(message?: MessageFn<{ value: number }>): this;
    nonNegative(message?: MessageFn<{ value: number }>): this;
    nonPositive(message?: MessageFn<{ value: number }>): this;
    multipleOf(step: number, message?: MessageFn<{ step: number; value: number }>): this;
    safe(message?: MessageFn<{ value: number }>): this;
    finite(message?: MessageFn<{ value: number }>): this;
  }

  export class BooleanSchema<Input = boolean> extends Schema<boolean, Input> {}

  export class DateSchema<Input = Date> extends Schema<Date, Input> {
    min(date: Date, message?: MessageFn<{ min: Date; value: Date }>): this;
    max(date: Date, message?: MessageFn<{ max: Date; value: Date }>): this;
  }

  export class BigIntSchema<Input = bigint> extends Schema<bigint, Input> {
    min(minimum: bigint, message?: MessageFn<{ min: bigint; value: bigint }>): this;
    max(maximum: bigint, message?: MessageFn<{ max: bigint; value: bigint }>): this;
    positive(message?: MessageFn<{ value: bigint }>): this;
    negative(message?: MessageFn<{ value: bigint }>): this;
    nonNegative(message?: MessageFn<{ value: bigint }>): this;
    nonPositive(message?: MessageFn<{ value: bigint }>): this;
    multipleOf(step: bigint, message?: MessageFn<{ step: bigint; value: bigint }>): this;
  }

  export class ArraySchema<T> extends Schema<T[]> {
    min(length: number, message?: MessageFn<{ min: number; value: unknown[] }>): this;
    max(length: number, message?: MessageFn<{ max: number; value: unknown[] }>): this;
    length(exact: number, message?: MessageFn<{ exact: number; value: unknown[] }>): this;
    nonEmpty(message?: MessageFn<{ min: number; value: unknown[] }>): this;
    unique(message?: MessageFn<{ value: unknown[] }>): this;
  }

  export class SetSchema<T> extends Schema<Set<T>> {
    min(length: number, message?: MessageFn<{ min: number; value: Set<T> }>): this;
    max(length: number, message?: MessageFn<{ max: number; value: Set<T> }>): this;
    size(exact: number, message?: MessageFn<{ exact: number; value: Set<T> }>): this;
    nonEmpty(message?: MessageFn<{ min: number; value: Set<T> }>): this;
  }

  export class MapSchema<K, V> extends Schema<Map<K, V>> {
    min(length: number, message?: MessageFn<{ min: number; value: Map<K, V> }>): this;
    max(length: number, message?: MessageFn<{ max: number; value: Map<K, V> }>): this;
    size(exact: number, message?: MessageFn<{ exact: number; value: Map<K, V> }>): this;
  }

  export class ObjectSchema<T extends Record<string, Schema<any>>> extends Schema<{
    [K in keyof T]: InferOutput<T[K]>;
  }> {
    readonly shape: T;
    partial(): ObjectSchema<{ [K in keyof T]: Schema<InferOutput<T[K]> | undefined> }>;
    partial<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K> & { [P in K]: Schema<InferOutput<T[P]> | undefined> }>;
    required(): ObjectSchema<{ [K in keyof T]: Schema<Exclude<InferOutput<T[K]>, undefined>> }>;
    extend<U extends Record<string, Schema<any>>>(extra: U): ObjectSchema<Omit<T, keyof U> & U>;
    pick<K extends keyof T>(...keys: K[]): ObjectSchema<Pick<T, K>>;
    omit<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K>>;
    relaxed(): Schema<{ [K in keyof T]: InferOutput<T[K]> } & Record<string, unknown>>;
    strict(): ObjectSchema<T>;
  }

  export class TupleSchema<T extends readonly Schema<any>[]> extends Schema<{ readonly [K in keyof T]: InferOutput<T[K]> }> {
    rest<R extends Schema<any>>(schema: R): Schema<readonly [...{ [K in keyof T]: InferOutput<T[K]> }, ...InferOutput<R>[]]>;
  }

  export class RecordSchema<K extends string, V> extends Schema<Record<K, V>> {}

  export class UnionSchema<T extends readonly Schema<any>[]> extends Schema<InferOutput<T[number]>> {}
  export class IntersectSchema<T extends readonly Schema<any>[]> extends Schema<any> {}
  export class VariantSchema<K extends string, M extends Record<string, ObjectSchema<any>>> extends Schema<any> {}
  export class LazySchema<T> extends Schema<T> {}
  export class InstanceOfSchema<T> extends Schema<T> {}
  export class LiteralSchema<T extends string | number | boolean | null | undefined> extends Schema<T> {}
  export class EnumSchema<T extends readonly [string | number, ...(string | number)[]]> extends Schema<T[number]> {
    readonly values: T;
  }

  export type LiteralValue = string | number | boolean | null | undefined;
  export type RawOrSchema = Schema<any> | LiteralValue;
  export type NormalizeItem<T> = T extends Schema<any>
    ? T
    : T extends LiteralValue
      ? LiteralSchema<T>
      : never;
  export type NormalizeItems<T extends readonly RawOrSchema[]> = {
    readonly [K in keyof T]: NormalizeItem<T[K]>;
  };

  export type InferInput<T> = T extends Schema<any, infer I> ? I : never;
  export type Infer<T> = T extends Schema<infer O, any> ? O : never;
  export type InferOutput<T> = T extends Schema<infer O, any> ? O : never;

  export type Messages = Record<string, unknown>;
  export type Logger = (msg: string) => void;
  export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
  export function setMessages(messages: DeepPartial<Messages>): void;
  export function setLogger(logger: Logger | null): void;
  export function resetMessages(): void;
  export function errorsAt(formatted: FormattedErrors, ...path: (string | number)[]): string[];
  export function prependIssuePath(issues: Issue[], prefix: string | number): Issue[];
  export function fail(code: string, message: string, params?: Record<string, unknown>): Issue[];
  export function descriptorToJsonSchema(descriptor: SchemaDescriptor): JsonSchema;
  export function schemaToJsonSchema(schema: Schema<any>): JsonSchema;

  export const s: {
    any(): Schema<any>;
    unknown(): Schema<unknown>;

    string(): StringSchema;
    number(): NumberSchema;
    boolean(): BooleanSchema;
    date(): DateSchema;
    bigint(): BigIntSchema;

    literal<T extends string | number | boolean | null | undefined>(value: T): LiteralSchema<T>;
    enum<const T extends readonly [string | number, ...(string | number)[]]>(values: T): EnumSchema<T>;
    null(): LiteralSchema<null>;
    undefined(): LiteralSchema<undefined>;
    never(): Schema<never>;

    object<T extends Record<string, Schema<any>>>(shape: T): ObjectSchema<T>;
    array<T>(schema: Schema<T>): ArraySchema<T>;
    set<T>(schema: Schema<T>): SetSchema<T>;
    map<K, V>(keySchema: Schema<K>, valueSchema: Schema<V>): MapSchema<K, V>;
    tuple<T extends readonly Schema<any>[]>(items: T): TupleSchema<T>;
    record<K extends string, V>(keySchema: Schema<K>, valueSchema: Schema<V>): RecordSchema<K, V>;

    union<T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(...items: T): UnionSchema<NormalizeItems<T> & readonly Schema<any>[]>;
    intersect<T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(...items: T): IntersectSchema<NormalizeItems<T> & readonly Schema<any>[]>;
    variant<K extends string, M extends Record<string, ObjectSchema<any>>>(discriminator: K, map: M): VariantSchema<K, M>;

    lazy<T>(getter: () => Schema<T>): LazySchema<T>;
    instanceof<T>(cls: new (...args: any[]) => T): InstanceOfSchema<T>;

    coerce: {
      string(): StringSchema<unknown>;
      number(): NumberSchema<unknown>;
      boolean(): BooleanSchema<unknown>;
      date(): DateSchema<unknown>;
      bigint(): BigIntSchema<unknown>;
    };
  };
}

declare module '@vielzeug/spell' {
  export * from '/spell';
}
`;
