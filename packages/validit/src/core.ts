import { _messages } from './messages';

/* -------------------- Error Codes -------------------- */

export const ErrorCode = {
  custom: 'custom',
  invalid_date: 'invalid_date',
  invalid_enum: 'invalid_enum',
  invalid_length: 'invalid_length',
  invalid_literal: 'invalid_literal',
  invalid_string: 'invalid_string',
  invalid_type: 'invalid_type',
  invalid_union: 'invalid_union',
  invalid_url: 'invalid_url',
  invalid_variant: 'invalid_variant',
  not_integer: 'not_integer',
  not_multiple_of: 'not_multiple_of',
  too_big: 'too_big',
  too_small: 'too_small',
  unrecognized_keys: 'unrecognized_keys',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/* -------------------- Core Types -------------------- */

export type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> = string | ((ctx: Ctx) => string);

export function resolveMessage<Ctx extends Record<string, unknown>>(msg: MessageFn<Ctx>, ctx: Ctx): string {
  return typeof msg === 'function' ? msg(ctx) : msg;
}

export type Issue = {
  code: ErrorCode | (string & {});
  message: string;
  params?: Record<string, unknown>;
  path: (string | number)[];
};

function formatIssues(issues: Issue[]): string {
  return issues
    .map(({ code, message, path }) => {
      const pathStr = path.length ? path.join('.') : 'value';

      return `${pathStr}: ${message} [${code}]`;
    })
    .join('\n');
}

export class ValidationError extends Error {
  readonly issues: Issue[];

  constructor(issues: Issue[]) {
    super(formatIssues(issues));
    this.name = 'ValidationError';
    this.issues = issues;
  }

  /** Typesafe instanceof check — useful in catch blocks. */
  static is(value: unknown): value is ValidationError {
    return value instanceof ValidationError;
  }

  /**
   * Returns flat field/form error maps — ready for form UIs without boilerplate.
   * `fieldErrors` keys are full dotted paths (e.g. `"address.zip"`).
   */
  flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] } {
    const fieldErrors: Record<string, string[]> = {};
    const formErrors: string[] = [];

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message);
      } else {
        const key = issue.path.join('.');

        if (!fieldErrors[key]) fieldErrors[key] = [];

        fieldErrors[key].push(issue.message);
      }
    }

    return { fieldErrors, formErrors };
  }
}

export type ParseResult<T> = { data: T; success: true } | { error: ValidationError; success: false };

type ValidateFn = (value: unknown, path: (string | number)[]) => Issue[] | null;
type AsyncValidateFn = (value: unknown, path: (string | number)[]) => Promise<Issue[] | null>;

/* -------------------- Base Schema -------------------- */

export class Schema<Output = unknown> {
  protected _validators: ValidateFn[] = [];
  protected _asyncValidators: AsyncValidateFn[] = [];
  protected _preprocessors: Array<(value: unknown) => unknown> = [];
  protected _postprocessors: Array<(value: any) => any> = [];
  protected _isOptional = false;
  protected _isNullable = false;
  protected _description: string | undefined = undefined;
  protected _hasCatch = false;
  protected _catchFactory: (() => Output) | undefined = undefined;

  constructor(validators: ValidateFn[] = []) {
    this._validators = validators;
  }

  parse(value: unknown): Output {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value as unknown);
      const issues = this._runSync(processed, []);

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), processed) as Output;
    });
  }

  safeParse(value: unknown): ParseResult<Output> {
    try {
      return { data: this.parse(value), success: true };
    } catch (error) {
      if (ValidationError.is(error)) return { error, success: false };

      throw error;
    }
  }

  async parseAsync(value: unknown): Promise<Output> {
    return this._withCatchAsync(async () => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value as unknown);
      const syncIssues = this._runSync(processed, []);

      if (syncIssues.length) throw new ValidationError(syncIssues);

      const asyncIssues = await this._runAsync(processed, []);

      if (asyncIssues.length) throw new ValidationError(asyncIssues);

      return this._postprocessors.reduce((v, fn) => fn(v), processed) as Output;
    });
  }

  async safeParseAsync(value: unknown): Promise<ParseResult<Output>> {
    try {
      return { data: await this.parseAsync(value), success: true };
    } catch (error) {
      if (ValidationError.is(error)) return { error, success: false };

      throw error;
    }
  }

  /** Runs fn(); if it throws ValidationError and _hasCatch is set, returns the fallback. */
  protected _withCatch<T>(fn: () => T): T {
    if (!this._hasCatch) return fn();

    try {
      return fn();
    } catch (error) {
      if (ValidationError.is(error)) return this._catchFactory!() as unknown as T;

      throw error;
    }
  }

  protected async _withCatchAsync<T>(fn: () => Promise<T>): Promise<T> {
    if (!this._hasCatch) return fn();

    try {
      return await fn();
    } catch (error) {
      if (ValidationError.is(error)) return this._catchFactory!() as unknown as T;

      throw error;
    }
  }

  /** Sync-only custom validator. Throws at first parse if given an async function. */
  refine(
    check: (value: Output) => boolean,
    message: MessageFn<{ value: Output }> = () => _messages().refine_default(),
  ): this {
    return this._addValidator((value, path) => {
      const result: unknown = check(value as Output);

      if (result instanceof Promise) {
        throw new Error('refine() only accepts sync functions. Use refineAsync() for async validation.');
      }

      return result
        ? null
        : [{ code: ErrorCode.custom, message: resolveMessage(message, { value: value as Output }), path }];
    });
  }

  /** Async custom validator — deferred to parseAsync(). */
  refineAsync(
    check: (value: Output) => Promise<boolean>,
    message: MessageFn<{ value: Output }> = () => _messages().refine_default(),
  ): this {
    return this._addAsyncValidator(async (value, path) => {
      const ok = await check(value as Output);

      return ok
        ? null
        : [{ code: ErrorCode.custom, message: resolveMessage(message, { value: value as Output }), path }];
    });
  }

  /** Allows undefined. */
  optional(): Schema<Output | undefined> {
    const cloned = this._clone() as unknown as Schema<Output | undefined>;

    cloned._isOptional = true;

    return cloned;
  }

  /** Allows null. */
  nullable(): Schema<Output | null> {
    const cloned = this._clone() as unknown as Schema<Output | null>;

    cloned._isNullable = true;

    return cloned;
  }

  /** Allows both null and undefined. */
  nullish(): Schema<Output | null | undefined> {
    const cloned = this._clone() as unknown as Schema<Output | null | undefined>;

    cloned._isOptional = true;
    cloned._isNullable = true;

    return cloned;
  }

  /** Removes undefined from the output type (reverses optional). */
  required(): Schema<Exclude<Output, undefined>> {
    const cloned = this._clone() as unknown as Schema<Exclude<Output, undefined>>;

    cloned._isOptional = false;

    return cloned;
  }

  default(defaultValue: Output | (() => Output)): this {
    const factory = typeof defaultValue === 'function' ? (defaultValue as () => Output) : () => defaultValue;
    const cloned = this._clone();

    cloned._preprocessors = [...this._preprocessors, (v) => (v === undefined ? factory() : v)];

    return cloned;
  }

  /** Returns a fallback value on ANY validation failure instead of throwing. */
  catch(fallback: Output | (() => Output)): this {
    const cloned = this._clone();

    cloned._hasCatch = true;
    cloned._catchFactory = typeof fallback === 'function' ? (fallback as () => Output) : () => fallback;

    return cloned;
  }

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput> {
    const next = new Schema<NewOutput>(this._validators);

    next._asyncValidators = [...this._asyncValidators];
    next._preprocessors = [...this._preprocessors];
    next._postprocessors = [...this._postprocessors, fn as (v: any) => any];
    next._isOptional = this._isOptional;
    next._isNullable = this._isNullable;
    next._description = this._description;

    return next;
  }

  /** Attach a description for documentation or tooling generation. */
  describe(description: string): this {
    const cloned = this._clone();

    cloned._description = description;

    return cloned;
  }

  /** Read-only description attached via `.describe()`. */
  get description(): string | undefined {
    return this._description;
  }

  /** Create a branded type (zero runtime cost). */
  brand<Brand extends string>(): Schema<Output & { __brand: Brand }> {
    return this as unknown as Schema<Output & { __brand: Brand }>;
  }

  /** Type guard — narrows value to Output using safeParse. */
  is(value: unknown): value is Output {
    return this.safeParse(value).success;
  }

  /** Prepend a transformation step before validation. Alias for `preprocess(fn, schema)`. */
  preprocess(fn: (value: unknown) => unknown): this {
    const cloned = this._clone();

    cloned._preprocessors = [fn, ...this._preprocessors];

    return cloned;
  }

  protected _runSync(value: unknown, path: (string | number)[]): Issue[] {
    if (this._isOptional && value === undefined) return [];

    if (this._isNullable && value === null) return [];

    const issues: Issue[] = [];

    for (const validate of this._validators) {
      const result = validate(value, path);

      if (result) {
        issues.push(...result);

        if (result.some((i) => i.code === ErrorCode.invalid_type)) break;
      }
    }

    return issues;
  }

  protected async _runAsync(value: unknown, path: (string | number)[]): Promise<Issue[]> {
    if (this._isOptional && value === undefined) return [];

    if (this._isNullable && value === null) return [];

    const results = await Promise.all(this._asyncValidators.map((fn) => fn(value, path)));

    return results.flatMap((r) => r ?? []);
  }

  protected _addValidator(validator: ValidateFn): this {
    return this._clone([...this._validators, validator]);
  }

  protected _addAsyncValidator(fn: AsyncValidateFn): this {
    const cloned = this._clone();

    cloned._asyncValidators = [...this._asyncValidators, fn];

    return cloned;
  }

  protected _addPreprocessor(fn: (value: unknown) => unknown): this {
    const cloned = this._clone();

    cloned._preprocessors = [...this._preprocessors, fn];

    return cloned;
  }

  protected _clone(validators: ValidateFn[] = this._validators): this {
    const cloned = Object.create(Object.getPrototypeOf(this)) as this;

    cloned._validators = [...validators];
    cloned._asyncValidators = [...this._asyncValidators];
    cloned._preprocessors = [...this._preprocessors];
    cloned._postprocessors = [...this._postprocessors];
    cloned._isOptional = this._isOptional;
    cloned._isNullable = this._isNullable;
    cloned._description = this._description;
    cloned._hasCatch = this._hasCatch;
    cloned._catchFactory = this._catchFactory;

    return cloned;
  }
}

/* -------------------- Type Inference -------------------- */

export type InferOutput<T> = T extends Schema<infer O> ? O : never;

/** Alias for InferOutput — infers the output type of a schema. */
export type Infer<T> = InferOutput<T>;

/* -------------------- Factory Shortcuts -------------------- */

/** Schema that accepts any value without validation. */
export const any = (): Schema<any> => new Schema<any>([]);

/** Schema that accepts any unknown value without validation. */
export const unknown = (): Schema<unknown> => new Schema<unknown>([]);

/** Wraps a schema to allow undefined. */
export const optional = <T>(schema: Schema<T>): Schema<T | undefined> => schema.optional();

/** Wraps a schema to allow null. */
export const nullable = <T>(schema: Schema<T>): Schema<T | null> => schema.nullable();

/** Wraps a schema to allow null and undefined. */
export const nullish = <T>(schema: Schema<T>): Schema<T | null | undefined> => schema.nullish();

/** Prepends a transform before the schema's own validators. */
export const preprocess = <T>(fn: (value: unknown) => unknown, schema: Schema<T>): Schema<T> => schema.preprocess(fn);
