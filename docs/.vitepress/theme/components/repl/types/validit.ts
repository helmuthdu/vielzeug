export const validitTypes = String.raw`
declare module '@vielzeug/validit' {
  export const ErrorCode: {
    custom: 'custom';
    invalid_base64: 'invalid_base64';
    invalid_bigint: 'invalid_bigint';
    invalid_date: 'invalid_date';
    invalid_duration: 'invalid_duration';
    invalid_enum: 'invalid_enum';
    invalid_length: 'invalid_length';
    invalid_literal: 'invalid_literal';
    invalid_string: 'invalid_string';
    invalid_type: 'invalid_type';
    invalid_union: 'invalid_union';
    invalid_url: 'invalid_url';
    invalid_variant: 'invalid_variant';
    not_finite: 'not_finite';
    not_integer: 'not_integer';
    not_multiple_of: 'not_multiple_of';
    not_safe: 'not_safe';
    not_unique: 'not_unique';
    too_big: 'too_big';
    too_small: 'too_small';
    unrecognized_keys: 'unrecognized_keys';
  };

  export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

  export type Issue = {
    code: ErrorCode | (string & {});
    message: string;
    params?: Record<string, unknown>;
    path: (string | number)[];
  };

  export type FormattedErrors = {
    _errors: string[];
    [key: string]: FormattedErrors | string[];
  };

  export class ValidationError extends Error {
    readonly issues: Issue[];
    flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] };
    format(): FormattedErrors;
    static is(value: unknown): value is ValidationError;
  }

  export function flattenFirstErrors(error: ValidationError): {
    fieldErrors: Record<string, string>;
    formErrors: string[];
  };

  export type ParseResult<T> =
    | { data: T; success: true }
    | { error: ValidationError; success: false };

  export type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> =
    | string
    | ((ctx: Ctx) => string);

  export class Schema<Output = unknown, Input = Output> {
    parse(value: Input): Output;
    safeParse(value: Input): ParseResult<Output>;
    parseAsync(value: Input): Promise<Output>;
    safeParseAsync(value: Input): Promise<ParseResult<Output>>;

    check(
      check: (
        value: Output,
        ctx: { addIssue: (issue: Omit<Issue, 'path'> & { path?: (string | number)[] }) => void },
      ) => boolean | Issue | Issue[] | null | undefined | Promise<boolean | Issue | Issue[] | null | undefined>,
      message?: MessageFn<{ value: Output }>,
    ): this;
    optional(): Schema<Output | undefined, Input | undefined>;
    nullable(): Schema<Output | null, Input | null>;
    nullish(): Schema<Output | null | undefined, Input | null | undefined>;
    required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>>;

    default(value: Output | (() => Output)): this;
    catch(value: Output | (() => Output)): this;
    transform<U>(fn: (value: Output) => U): Schema<U, Input>;
    preprocess(fn: (value: unknown) => unknown): this;

    describe(description: string): this;
    readonly description: string | undefined;
    brand<Brand extends string>(): Schema<Output & { __brand: Brand }, Input>;
    readonly(): Schema<Readonly<Output>, Input>;
    is(value: unknown): value is Output;
  }

  export type InferInput<T> = T extends Schema<any, infer I> ? I : never;
  export type Infer<T> = T extends Schema<infer O, any> ? O : never;

  export type Messages = Record<string, unknown>;
  export function configure(opts: { messages?: Record<string, unknown> }): void;
  export function reset(): void;

  export const v: {
    any(): Schema<any>;
    unknown(): Schema<unknown>;

    string(): Schema<string>;
    number(): Schema<number>;
    boolean(): Schema<boolean>;
    date(): Schema<Date>;
    bigint(): Schema<bigint>;

    literal<T extends string | number | boolean | null | undefined>(value: T): Schema<T>;
    enum<T extends readonly [string | number, ...(string | number)[]]>(values: T): Schema<T[number]>;
    nativeEnum<T extends Record<string, string | number>>(enumObj: T): Schema<T[keyof T]>;
    null(): Schema<null>;
    undefined(): Schema<undefined>;
    never(): Schema<never>;

    object<T extends Record<string, Schema<any>>>(shape: T): Schema<any>;
    array<T>(schema: Schema<T>): Schema<T[]>;
    set<T>(schema: Schema<T>): Schema<Set<T>>;
    map<K, V>(keySchema: Schema<K>, valueSchema: Schema<V>): Schema<Map<K, V>>;
    tuple<T extends readonly Schema<any>[]>(items: T): Schema<any>;
    record<K extends string, V>(keySchema: Schema<K>, valueSchema: Schema<V>): Schema<Record<K, V>>;

    union<T extends readonly [unknown, unknown, ...unknown[]]>(...items: T): Schema<any>;
    intersect<T extends readonly [unknown, unknown, ...unknown[]]>(...items: T): Schema<any>;
    variant<K extends string, M extends Record<string, Schema<any>>>(discriminator: K, map: M): Schema<any>;

    lazy<T>(getter: () => Schema<T>): Schema<T>;
    instanceof<T>(cls: new (...args: any[]) => T): Schema<T>;

    coerce: {
      string(): Schema<string, unknown>;
      number(): Schema<number, unknown>;
      boolean(): Schema<boolean, unknown>;
      date(): Schema<Date, unknown>;
      bigint(): Schema<bigint, unknown>;
    };
  };
}
`;
