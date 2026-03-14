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

function resolveMessage<Ctx extends Record<string, unknown>>(msg: MessageFn<Ctx>, ctx: Ctx): string {
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

export class Schema<Output = unknown, Input = unknown> {
  protected _validators: ValidateFn[] = [];
  protected _asyncValidators: AsyncValidateFn[] = [];
  protected _preprocessors: Array<(value: unknown) => unknown> = [];
  protected _postprocessors: Array<(value: any) => any> = [];
  protected _isOptional = false;
  protected _isNullable = false;
  protected _description: string | undefined = undefined;
  protected _hasCatch = false;
  protected _catchValue: Output | undefined = undefined;

  constructor(validators: ValidateFn[] = []) {
    this._validators = validators;
  }

  parse(value: Input): Output {
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

  safeParse(value: Input): ParseResult<Output> {
    try {
      return { data: this.parse(value), success: true };
    } catch (error) {
      if (ValidationError.is(error)) return { error, success: false };

      throw error;
    }
  }

  async parseAsync(value: Input): Promise<Output> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value as unknown);
    const syncIssues = this._runSync(processed, []);

    if (syncIssues.length) throw new ValidationError(syncIssues);

    const asyncIssues = await this._runAsync(processed, []);

    if (asyncIssues.length) throw new ValidationError(asyncIssues);

    return this._postprocessors.reduce((v, fn) => fn(v), processed) as Output;
  }

  async safeParseAsync(value: Input): Promise<ParseResult<Output>> {
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
      if (ValidationError.is(error)) return this._catchValue as unknown as T;

      throw error;
    }
  }

  protected async _withCatchAsync<T>(fn: () => Promise<T>): Promise<T> {
    if (!this._hasCatch) return fn();

    try {
      return await fn();
    } catch (error) {
      if (ValidationError.is(error)) return this._catchValue as unknown as T;

      throw error;
    }
  }

  /** Sync-only custom validator. Throws at first parse if given an async function. */
  refine(check: (value: Output) => boolean, message: MessageFn<{ value: Output }> = 'Invalid value'): this {
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
    message: MessageFn<{ value: Output }> = 'Invalid value',
  ): this {
    const cloned = this._clone();

    cloned._asyncValidators = [
      ...this._asyncValidators,
      async (value, path) => {
        const ok = await check(value as Output);

        return ok
          ? null
          : [{ code: ErrorCode.custom, message: resolveMessage(message, { value: value as Output }), path }];
      },
    ];

    return cloned;
  }

  /** Allows undefined. */
  optional(): Schema<Output | undefined, Input | undefined> {
    const cloned = this._clone() as unknown as Schema<Output | undefined, Input | undefined>;

    cloned._isOptional = true;

    return cloned;
  }

  /** Allows null. */
  nullable(): Schema<Output | null, Input | null> {
    const cloned = this._clone() as unknown as Schema<Output | null, Input | null>;

    cloned._isNullable = true;

    return cloned;
  }

  /** Allows both null and undefined. */
  nullish(): Schema<Output | null | undefined, Input | null | undefined> {
    const cloned = this._clone() as unknown as Schema<Output | null | undefined, Input | null | undefined>;

    cloned._isOptional = true;
    cloned._isNullable = true;

    return cloned;
  }

  default(defaultValue: Output): this {
    const cloned = this._clone();

    cloned._preprocessors = [...this._preprocessors, (v) => (v === undefined ? defaultValue : v)];

    return cloned;
  }

  /** Returns a fallback value on ANY validation failure instead of throwing. */
  catch(fallback: Output): this {
    const cloned = this._clone();

    cloned._hasCatch = true;
    cloned._catchValue = fallback;

    return cloned;
  }

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput, Input> {
    const next = new Schema<NewOutput, Input>(this._validators);

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
  brand<Brand extends string>(): Schema<Output & { __brand: Brand }, Input> {
    return this as unknown as Schema<Output & { __brand: Brand }, Input>;
  }

  /** Type guard — narrows value to Output using safeParse. */
  is(value: unknown): value is Output {
    return this.safeParse(value as Input).success;
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
    cloned._catchValue = this._catchValue;

    return cloned;
  }
}

/* -------------------- String Schema -------------------- */

export class StringSchema extends Schema<string, unknown> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'string' ? null : [{ code: ErrorCode.invalid_type, message: 'Expected string', path }],
    ]);
  }

  min(
    length: number,
    message: MessageFn<{ min: number; value: string }> = ({ min }) => `Must be at least ${min} characters`,
  ): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.length >= length
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { min: length, value: value as string }),
              params: { minimum: length },
              path,
            },
          ],
    );
  }

  max(
    length: number,
    message: MessageFn<{ max: number; value: string }> = ({ max }) => `Must be at most ${max} characters`,
  ): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.length <= length
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { max: length, value: value as string }),
              params: { maximum: length },
              path,
            },
          ],
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: string }> = ({ exact }) => `Must be exactly ${exact} characters`,
  ): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.length === exact
        ? null
        : [
            {
              code: ErrorCode.invalid_length,
              message: resolveMessage(message, { exact, value: value as string }),
              params: { exact },
              path,
            },
          ],
    );
  }

  nonempty(message: MessageFn<{ min: number; value: string }> = 'Cannot be empty'): this {
    return this.min(1, message);
  }

  startsWith(
    prefix: string,
    message: MessageFn<{ prefix: string; value: string }> = ({ prefix }) => `Must start with "${prefix}"`,
  ): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.startsWith(prefix)
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { prefix, value: value as string }),
              path,
            },
          ],
    );
  }

  endsWith(
    suffix: string,
    message: MessageFn<{ suffix: string; value: string }> = ({ suffix }) => `Must end with "${suffix}"`,
  ): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.endsWith(suffix)
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { suffix, value: value as string }),
              path,
            },
          ],
    );
  }

  includes(
    substr: string,
    message: MessageFn<{ substr: string; value: string }> = ({ substr }) => `Must include "${substr}"`,
  ): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.includes(substr)
        ? null
        : [
            {
              code: ErrorCode.invalid_string,
              message: resolveMessage(message, { substr, value: value as string }),
              path,
            },
          ],
    );
  }

  regex(pattern: RegExp, message: MessageFn<{ value: string }> = 'Invalid format'): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && pattern.test(value)
        ? null
        : [{ code: ErrorCode.invalid_string, message: resolveMessage(message, { value: value as string }), path }],
    );
  }

  email(message: MessageFn<{ value: string }> = 'Invalid email address'): this {
    return this._addValidator((value, path) => {
      if (typeof value !== 'string') return null;

      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? null
        : [{ code: ErrorCode.invalid_string, message: resolveMessage(message, { value }), path }];
    });
  }

  url(message: MessageFn<{ value: string }> = 'Invalid URL'): this {
    return this._addValidator((value, path) => {
      if (typeof value !== 'string') return null;

      try {
        new URL(value);

        return null;
      } catch {
        return [{ code: ErrorCode.invalid_url, message: resolveMessage(message, { value }), path }];
      }
    });
  }

  uuid(message: MessageFn<{ value: string }> = 'Invalid UUID'): this {
    return this._addValidator((value, path) => {
      if (typeof value !== 'string') return null;

      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
        ? null
        : [{ code: ErrorCode.invalid_string, message: resolveMessage(message, { value }), path }];
    });
  }

  date(message: MessageFn<{ value: string }> = 'Invalid date'): this {
    return this._addValidator((value, path) => {
      if (typeof value !== 'string') return null;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return [{ code: ErrorCode.invalid_string, message: resolveMessage(message, { value }), path }];
      }

      const d = new Date(value);
      // Guard against roll-over dates like 2024-02-30 → 2024-03-01
      const valid = !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);

      return valid ? null : [{ code: ErrorCode.invalid_string, message: resolveMessage(message, { value }), path }];
    });
  }

  datetime(message: MessageFn<{ value: string }> = 'Invalid datetime'): this {
    return this._addValidator((value, path) => {
      if (typeof value !== 'string') return null;

      // Require at minimum YYYY-MM-DDTHH:MM structure before trying Date constructor
      const valid = /^\d{4}-\d{2}-\d{2}T[\d:.Z+-]+$/.test(value) && !Number.isNaN(new Date(value).getTime());

      return valid ? null : [{ code: ErrorCode.invalid_string, message: resolveMessage(message, { value }), path }];
    });
  }

  trim(): this {
    return this._addPreprocessor((v) => (typeof v === 'string' ? v.trim() : v));
  }

  lowercase(): this {
    return this._addPreprocessor((v) => (typeof v === 'string' ? v.toLowerCase() : v));
  }

  uppercase(): this {
    return this._addPreprocessor((v) => (typeof v === 'string' ? v.toUpperCase() : v));
  }

  static coerce(): StringSchema {
    return new StringSchema()._addPreprocessor((v) => (v == null ? v : String(v)));
  }
}

/* -------------------- Number Schema -------------------- */

export class NumberSchema extends Schema<number, unknown> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'number' && !Number.isNaN(value)
          ? null
          : [{ code: ErrorCode.invalid_type, message: 'Expected number', path }],
    ]);
  }

  min(
    minimum: number,
    message: MessageFn<{ min: number; value: number }> = ({ min }) => `Must be at least ${min}`,
  ): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value >= minimum
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { min: minimum, value: value as number }),
              params: { minimum },
              path,
            },
          ],
    );
  }

  max(
    maximum: number,
    message: MessageFn<{ max: number; value: number }> = ({ max }) => `Must be at most ${max}`,
  ): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value <= maximum
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { max: maximum, value: value as number }),
              params: { maximum },
              path,
            },
          ],
    );
  }

  int(message: MessageFn<{ value: number }> = 'Must be an integer'): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && Number.isInteger(value)
        ? null
        : [{ code: ErrorCode.not_integer, message: resolveMessage(message, { value: value as number }), path }],
    );
  }

  positive(message: MessageFn<{ value: number }> = 'Must be positive'): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value > 0
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { value: value as number }),
              params: { exclusive: true, minimum: 0 },
              path,
            },
          ],
    );
  }

  negative(message: MessageFn<{ value: number }> = 'Must be negative'): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value < 0
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { value: value as number }),
              params: { exclusive: true, maximum: 0 },
              path,
            },
          ],
    );
  }

  nonNegative(message: MessageFn<{ value: number }> = 'Must be non-negative'): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value >= 0
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { value: value as number }),
              params: { minimum: 0 },
              path,
            },
          ],
    );
  }

  nonPositive(message: MessageFn<{ value: number }> = 'Must be non-positive'): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value <= 0
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { value: value as number }),
              params: { maximum: 0 },
              path,
            },
          ],
    );
  }

  multipleOf(
    step: number,
    message: MessageFn<{ step: number; value: number }> = ({ step }) => `Must be a multiple of ${step}`,
  ): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && Math.abs(Math.round(value / step) - value / step) < 1e-9
        ? null
        : [
            {
              code: ErrorCode.not_multiple_of,
              message: resolveMessage(message, { step, value: value as number }),
              params: { step },
              path,
            },
          ],
    );
  }

  static coerce(): NumberSchema {
    return new NumberSchema()._addPreprocessor((v) => {
      if (typeof v === 'number') return v;

      if (typeof v === 'string') return Number(v);

      return v;
    });
  }
}

/* -------------------- Boolean Schema -------------------- */

export class BooleanSchema extends Schema<boolean, unknown> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'boolean' ? null : [{ code: ErrorCode.invalid_type, message: 'Expected boolean', path }],
    ]);
  }

  static coerce(): BooleanSchema {
    return new BooleanSchema()._addPreprocessor((v) => {
      if (typeof v === 'boolean') return v;

      if (v === 'true' || v === 1) return true;

      if (v === 'false' || v === 0) return false;

      return v;
    });
  }
}

/* -------------------- Date Schema -------------------- */

export class DateSchema extends Schema<Date, unknown> {
  constructor() {
    super([
      (value, path) =>
        value instanceof Date && !Number.isNaN(value.getTime())
          ? null
          : [{ code: ErrorCode.invalid_date, message: 'Expected valid date', path }],
    ]);
  }

  min(
    date: Date,
    message: MessageFn<{ min: Date; value: Date }> = ({ min }) => `Must be after ${min.toISOString()}`,
  ): this {
    return this._addValidator((value, path) =>
      value instanceof Date && value >= date
        ? null
        : [{ code: ErrorCode.too_small, message: resolveMessage(message, { min: date, value: value as Date }), path }],
    );
  }

  max(
    date: Date,
    message: MessageFn<{ max: Date; value: Date }> = ({ max }) => `Must be before ${max.toISOString()}`,
  ): this {
    return this._addValidator((value, path) =>
      value instanceof Date && value <= date
        ? null
        : [{ code: ErrorCode.too_big, message: resolveMessage(message, { max: date, value: value as Date }), path }],
    );
  }

  static coerce(): DateSchema {
    return new DateSchema()._addPreprocessor((v) => {
      if (v instanceof Date) return v;

      if (typeof v === 'string' || typeof v === 'number') return new Date(v);

      return v;
    });
  }
}

/* -------------------- Literal Schema -------------------- */

export class LiteralSchema<T extends string | number | boolean | null | undefined> extends Schema<T, unknown> {
  readonly value: T;

  constructor(value: T) {
    super([
      (val, path) =>
        val === value
          ? null
          : [{ code: ErrorCode.invalid_literal, message: `Expected ${JSON.stringify(value)}`, path }],
    ]);
    this.value = value;
  }
}

/* -------------------- Enum Schema -------------------- */

type EnumValues = readonly [string, ...string[]];
type EnumType<T extends EnumValues> = T[number];

export class EnumSchema<T extends EnumValues> extends Schema<EnumType<T>, unknown> {
  readonly values: T;

  constructor(values: T) {
    const set = new Set<unknown>(values);

    super([
      (value, path) =>
        set.has(value)
          ? null
          : [
              {
                code: ErrorCode.invalid_enum,
                message: `Expected one of: ${values.join(', ')}`,
                params: { values },
                path,
              },
            ],
    ]);
    this.values = values;
  }
}

/* -------------------- Tuple Schema -------------------- */

type TupleSchemas = readonly [Schema<any, any>, ...Schema<any, any>[]];
type InferTuple<T extends TupleSchemas> = { readonly [K in keyof T]: T[K] extends Schema<infer O, any> ? O : never };

export class TupleSchema<T extends TupleSchemas> extends Schema<InferTuple<T>, unknown> {
  readonly items: T;

  constructor(items: T) {
    super([]);
    this.items = items;
  }

  override parse(value: unknown): InferTuple<T> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (!Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected array', path: [] }]);
      }

      if (processed.length !== this.items.length) {
        throw new ValidationError([
          {
            code: ErrorCode.invalid_length,
            message: `Expected tuple of length ${this.items.length}`,
            params: { exact: this.items.length },
            path: [],
          },
        ]);
      }

      const issues: Issue[] = [];
      const output: unknown[] = [];

      for (let i = 0; i < this.items.length; i++) {
        const result = this.items[i].safeParse(processed[i]);

        if (result.success) {
          output.push(result.data);
        } else {
          issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })));
          output.push(processed[i]);
        }
      }
      for (const validate of this._validators) {
        const extra = validate(output, []);

        if (extra) issues.push(...extra);
      }

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), output) as InferTuple<T>;
    });
  }

  override async parseAsync(value: unknown): Promise<InferTuple<T>> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

    if (!Array.isArray(processed)) {
      throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected array', path: [] }]);
    }

    if (processed.length !== this.items.length) {
      throw new ValidationError([
        {
          code: ErrorCode.invalid_length,
          message: `Expected tuple of length ${this.items.length}`,
          params: { exact: this.items.length },
          path: [],
        },
      ]);
    }

    const itemResults = await Promise.all(
      this.items.map((schema, i) =>
        schema.safeParseAsync(processed[i]).then((result) => ({
          data: result.success ? result.data : processed[i],
          issues: result.success ? [] : result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })),
        })),
      ),
    );
    const output = itemResults.map((r) => r.data);
    const syncIssues: Issue[] = [];

    for (const validate of this._validators) {
      const extra = validate(output, []);

      if (extra) syncIssues.push(...extra);
    }

    const issues = [...itemResults.flatMap((r) => r.issues), ...syncIssues, ...(await this._runAsync(output, []))];

    if (issues.length) throw new ValidationError(issues);

    return this._postprocessors.reduce((v, fn) => fn(v), output) as InferTuple<T>;
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).items = this.items;

    return cloned;
  }
}

/* -------------------- Record Schema -------------------- */

export class RecordSchema<K extends string, V> extends Schema<Record<K, V>, unknown> {
  private readonly keySchema: Schema<K, unknown>;
  private readonly valueSchema: Schema<V, unknown>;

  constructor(keySchema: Schema<K, unknown>, valueSchema: Schema<V, unknown>) {
    super([]);
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  override parse(value: unknown): Record<K, V> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected object', path: [] }]);
      }

      const { issues, output } = this._parseRecordEntries(processed as Record<string, unknown>);

      for (const validate of this._validators) {
        const extra = validate(output, []);

        if (extra) issues.push(...extra);
      }

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), output) as Record<K, V>;
    });
  }

  private _parseRecordEntries(obj: Record<string, unknown>): { issues: Issue[]; output: Record<string, unknown> } {
    const issues: Issue[] = [];
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      const keyResult = this.keySchema.safeParse(key);

      if (!keyResult.success) {
        issues.push(...keyResult.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })));
        continue;
      }

      const valResult = this.valueSchema.safeParse(obj[key]);

      if (valResult.success) {
        output[key] = valResult.data;
      } else {
        issues.push(...valResult.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })));
      }
    }

    return { issues, output };
  }

  override async parseAsync(value: unknown): Promise<Record<K, V>> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

    if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
      throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected object', path: [] }]);
    }

    const obj = processed as Record<string, unknown>;
    const keys = Object.keys(obj);
    const entryResults = await Promise.all(
      keys.map((key) =>
        Promise.all([this.keySchema.safeParseAsync(key), this.valueSchema.safeParseAsync(obj[key])]).then(
          ([keyResult, valResult]) => ({
            key,
            keyIssues: keyResult.success ? [] : keyResult.error.issues.map((i) => ({ ...i, path: [key, ...i.path] })),
            parsedKey: keyResult.success ? keyResult.data : key,
            parsedVal: valResult.success ? valResult.data : obj[key],
            valIssues: valResult.success ? [] : valResult.error.issues.map((i) => ({ ...i, path: [key, ...i.path] })),
          }),
        ),
      ),
    );
    const output: Record<string, unknown> = {};
    const issues: Issue[] = [];

    for (const r of entryResults) {
      issues.push(...r.keyIssues, ...r.valIssues);

      if (r.keyIssues.length === 0 && r.valIssues.length === 0) output[r.parsedKey as string] = r.parsedVal;
    }

    const syncIssues: Issue[] = [];

    for (const validate of this._validators) {
      const extra = validate(output, []);

      if (extra) syncIssues.push(...extra);
    }
    issues.push(...syncIssues, ...(await this._runAsync(output, [])));

    if (issues.length) throw new ValidationError(issues);

    return this._postprocessors.reduce((v, fn) => fn(v), output) as Record<K, V>;
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).keySchema = this.keySchema;
    (cloned as any).valueSchema = this.valueSchema;

    return cloned;
  }
}

/* -------------------- Raw-or-schema helpers -------------------- */

type LiteralValue = string | number | boolean | null | undefined;
type RawOrSchema = Schema<any, any> | LiteralValue;
type NormalizeItem<T> = T extends Schema<any, any> ? T : T extends LiteralValue ? LiteralSchema<T> : never;
type NormalizeItems<T extends readonly RawOrSchema[]> = { readonly [K in keyof T]: NormalizeItem<T[K]> };

function normalizeToSchemas<T extends readonly RawOrSchema[]>(items: T): NormalizeItems<T> {
  return items.map((item) =>
    item instanceof Schema ? item : new LiteralSchema(item as LiteralValue),
  ) as unknown as NormalizeItems<T>;
}

/* -------------------- Array Schema -------------------- */

export class ArraySchema<T> extends Schema<T[], unknown> {
  private readonly itemSchema: Schema<T, unknown>;

  constructor(itemSchema: Schema<T, unknown>) {
    super([]);
    this.itemSchema = itemSchema;
  }

  override parse(value: unknown): T[] {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (!Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected array', path: [] }]);
      }

      const issues: Issue[] = [];
      const items: T[] = [];

      for (let i = 0; i < processed.length; i++) {
        const result = this.itemSchema.safeParse(processed[i]);

        if (result.success) {
          items.push(result.data);
        } else {
          issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })));
          items.push(processed[i] as T);
        }
      }
      for (const validate of this._validators) {
        const extra = validate(items, []);

        if (extra) issues.push(...extra);
      }

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), items) as T[];
    });
  }

  override async parseAsync(value: unknown): Promise<T[]> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

    if (!Array.isArray(processed)) {
      throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected array', path: [] }]);
    }

    const itemResults = await Promise.all(
      processed.map((item, i) =>
        this.itemSchema.safeParseAsync(item).then((result) => ({
          data: result.success ? result.data : (item as T),
          issues: result.success ? [] : result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })),
        })),
      ),
    );
    const items = itemResults.map((r) => r.data);
    const arrayIssues: Issue[] = [];

    for (const validate of this._validators) {
      const extra = validate(items, []);

      if (extra) arrayIssues.push(...extra);
    }

    const issues = [...itemResults.flatMap((r) => r.issues), ...arrayIssues, ...(await this._runAsync(items, []))];

    if (issues.length) throw new ValidationError(issues);

    return this._postprocessors.reduce((v, fn) => fn(v), items) as T[];
  }

  min(length: number, message: MessageFn<{ min: number }> = ({ min }) => `Must have at least ${min} items`): this {
    return this._addValidator((value, path) =>
      Array.isArray(value) && value.length >= length
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { min: length }),
              params: { minimum: length },
              path,
            },
          ],
    );
  }

  max(length: number, message: MessageFn<{ max: number }> = ({ max }) => `Must have at most ${max} items`): this {
    return this._addValidator((value, path) =>
      Array.isArray(value) && value.length <= length
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { max: length }),
              params: { maximum: length },
              path,
            },
          ],
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number }> = ({ exact }) => `Must have exactly ${exact} items`,
  ): this {
    return this._addValidator((value, path) =>
      Array.isArray(value) && value.length === exact
        ? null
        : [{ code: ErrorCode.invalid_length, message: resolveMessage(message, { exact }), params: { exact }, path }],
    );
  }

  nonempty(message: MessageFn<{ min: number }> = 'Cannot be empty'): this {
    return this.min(1, message);
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).itemSchema = this.itemSchema;

    return cloned;
  }
}

/* -------------------- Object Schema -------------------- */

export type ObjectMode = 'strip' | 'passthrough' | 'strict';
type ObjectShape = Record<string, Schema<any, any>>;
type InferObject<T extends ObjectShape> = { [K in keyof T]: InferOutput<T[K]> };

export class ObjectSchema<T extends ObjectShape> extends Schema<InferObject<T>, unknown> {
  readonly shape: T;
  private readonly _mode: ObjectMode;

  constructor(shape: T, mode: ObjectMode = 'strip') {
    super([]);
    this.shape = shape;
    this._mode = mode;
  }

  override parse(value: unknown): InferObject<T> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected object', path: [] }]);
      }

      const obj = processed as Record<string, unknown>;

      this._checkStrictKeys(obj);

      const { issues, output } = this._parseObjectFields(obj);

      for (const validate of this._validators) {
        const extra = validate(output, []);

        if (extra) issues.push(...extra);
      }

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), output) as InferObject<T>;
    });
  }

  private _checkStrictKeys(obj: Record<string, unknown>): void {
    if (this._mode !== 'strict') return;

    const knownKeys = new Set(Object.keys(this.shape));
    const unknownKeys = Object.keys(obj).filter((k) => !knownKeys.has(k));

    if (unknownKeys.length > 0) {
      throw new ValidationError([
        { code: ErrorCode.unrecognized_keys, message: `Unrecognized keys: ${unknownKeys.join(', ')}`, path: [] },
      ]);
    }
  }

  private _parseObjectFields(obj: Record<string, unknown>): { issues: Issue[]; output: Record<string, unknown> } {
    const issues: Issue[] = [];
    const output: Record<string, unknown> = this._mode === 'passthrough' ? { ...obj } : {};

    for (const key of Object.keys(this.shape)) {
      const result = this.shape[key].safeParse(obj[key]);

      if (result.success) {
        output[key] = result.data;
      } else {
        issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })));
      }
    }

    return { issues, output };
  }

  override async parseAsync(value: unknown): Promise<InferObject<T>> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

    if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
      throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected object', path: [] }]);
    }

    const obj = processed as Record<string, unknown>;

    if (this._mode === 'strict') {
      const knownKeys = new Set(Object.keys(this.shape));
      const unknownKeys = Object.keys(obj).filter((k) => !knownKeys.has(k));

      if (unknownKeys.length > 0) {
        throw new ValidationError([
          { code: ErrorCode.unrecognized_keys, message: `Unrecognized keys: ${unknownKeys.join(', ')}`, path: [] },
        ]);
      }
    }

    const keyResults = await Promise.all(
      Object.keys(this.shape).map((key) =>
        this.shape[key].safeParseAsync(obj[key]).then((result) => ({
          data: result.success ? result.data : obj[key],
          issues: result.success ? [] : result.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })),
          key,
        })),
      ),
    );

    const output: Record<string, unknown> = this._mode === 'passthrough' ? { ...obj } : {};

    for (const r of keyResults) {
      if (r.issues.length === 0) output[r.key] = r.data;
    }

    const syncIssues: Issue[] = [];

    for (const validate of this._validators) {
      const extra = validate(output, []);

      if (extra) syncIssues.push(...extra);
    }

    const issues = [...keyResults.flatMap((r) => r.issues), ...syncIssues, ...(await this._runAsync(output, []))];

    if (issues.length) throw new ValidationError(issues);

    return this._postprocessors.reduce((v, fn) => fn(v), output) as InferObject<T>;
  }

  partial(): ObjectSchema<{ [K in keyof T]: Schema<InferOutput<T[K]> | undefined, unknown> }>;
  partial<K extends keyof T>(
    ...keys: K[]
  ): ObjectSchema<Omit<T, K> & { [P in K]: Schema<InferOutput<T[P]> | undefined, unknown> }>;
  partial<K extends keyof T>(...keys: K[]): ObjectSchema<any> {
    const targetKeys = keys.length > 0 ? new Set(keys as string[]) : null;

    return new ObjectSchema(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, s]) => [k, targetKeys === null || targetKeys.has(k) ? s.optional() : s]),
      ) as any,
      this._mode,
    )._copyRefinements(this);
  }

  required(): ObjectSchema<{ [K in keyof T]: Schema<Exclude<InferOutput<T[K]>, undefined>, unknown> }> {
    return new ObjectSchema(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, s]) => {
          const cloned = (s as unknown as ObjectSchema<any>)._clone();

          cloned._isOptional = false;

          return [k, cloned];
        }),
      ) as any,
      this._mode,
    )._copyRefinements(this);
  }

  extend<U extends ObjectShape>(extra: U): ObjectSchema<Omit<T, keyof U> & U> {
    return new ObjectSchema({ ...this.shape, ...extra } as any, this._mode)._copyRefinements(this);
  }

  pick<K extends keyof T>(...keys: K[]): ObjectSchema<Pick<T, K>> {
    const keySet = new Set(keys as string[]);

    return new ObjectSchema(
      Object.fromEntries(Object.entries(this.shape).filter(([k]) => keySet.has(k))) as any,
      this._mode,
    )._copyRefinements(this);
  }

  omit<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K>> {
    const keySet = new Set(keys as string[]);

    return new ObjectSchema(
      Object.fromEntries(Object.entries(this.shape).filter(([k]) => !keySet.has(k))) as any,
      this._mode,
    )._copyRefinements(this);
  }

  strip(): ObjectSchema<T> {
    return new ObjectSchema(this.shape, 'strip')._copyRefinements(this);
  }

  passthrough(): ObjectSchema<T> {
    return new ObjectSchema(this.shape, 'passthrough')._copyRefinements(this);
  }

  strict(): ObjectSchema<T> {
    return new ObjectSchema(this.shape, 'strict')._copyRefinements(this);
  }

  protected _copyRefinements(source: ObjectSchema<any>): this {
    this._validators = [...source._validators];
    this._asyncValidators = [...source._asyncValidators];

    return this;
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).shape = this.shape;
    (cloned as any)._mode = this._mode;

    return cloned;
  }
}

/* -------------------- Union Schema -------------------- */

/** First-match union — tries each schema in order, returns first success. */
export class UnionSchema<T extends readonly Schema<any, any>[]> extends Schema<InferOutput<T[number]>, unknown> {
  constructor(schemas: T) {
    super([
      (value, path) => {
        const branchResults = schemas.map((s) => s.safeParse(value));

        if (branchResults.some((r) => r.success)) return null;

        return [
          {
            code: ErrorCode.invalid_union,
            message: 'Does not match any of the expected types',
            params: { errors: branchResults.map((r) => (!r.success ? r.error.issues : [])) },
            path,
          },
        ];
      },
    ]);
  }
}

/* -------------------- Intersect Schema -------------------- */

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/** All schemas must pass — intersection semantics. */
export class IntersectSchema<T extends readonly Schema<any, any>[]> extends Schema<
  UnionToIntersection<InferOutput<T[number]>>,
  unknown
> {
  constructor(schemas: T) {
    super([
      (value, _path) => {
        const issues: Issue[] = [];

        for (const schema of schemas) {
          const result = schema.safeParse(value);

          if (!result.success) issues.push(...result.error.issues);
        }

        return issues.length ? issues : null;
      },
    ]);
  }
}

/* -------------------- Variant (Discriminated Union) Schema -------------------- */

type VariantMap = Record<string, ObjectSchema<any>>;
type InferVariantMap<K extends string, M extends VariantMap> = {
  [Tag in keyof M & string]: M[Tag] extends ObjectSchema<infer S extends ObjectShape>
    ? InferObject<S> & { [P in K]: Tag }
    : never;
}[keyof M & string];

export class VariantSchema<K extends string, M extends VariantMap> extends Schema<InferVariantMap<K, M>, unknown> {
  constructor(discriminator: K, variantMap: M) {
    const map = new Map<string, ObjectSchema<any>>();

    for (const [tag, schema] of Object.entries(variantMap)) {
      map.set(tag, schema.extend({ [discriminator]: new LiteralSchema(tag) }));
    }

    super([
      (value, path) => {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
          return [{ code: ErrorCode.invalid_type, message: 'Expected object', path }];
        }

        const obj = value as Record<string, unknown>;
        const discValue = obj[discriminator] as string;
        const matched = map.get(discValue);

        if (!matched) {
          const expected = [...map.keys()].map((k) => JSON.stringify(k)).join(' | ');

          return [
            {
              code: ErrorCode.invalid_variant,
              message: `Invalid discriminator value at "${discriminator}": expected ${expected}`,
              path,
            },
          ];
        }

        const result = matched.safeParse(value);

        return result.success ? null : result.error.issues;
      },
    ]);
  }
}

/* -------------------- Never Schema -------------------- */

export class NeverSchema extends Schema<never, unknown> {
  constructor() {
    super([(_, path) => [{ code: ErrorCode.invalid_type, message: 'Value is not allowed', path }]]);
  }
}

/* -------------------- Lazy Schema -------------------- */

export class LazySchema<T> extends Schema<T, unknown> {
  private _resolved: Schema<T, unknown> | null = null;
  private readonly getter: () => Schema<T, unknown>;

  constructor(getter: () => Schema<T, unknown>) {
    super([]);
    this.getter = getter;
  }

  private _get(): Schema<T, unknown> {
    if (this._resolved === null) {
      this._resolved = this.getter();
    }

    return this._resolved;
  }

  override parse(value: unknown): T {
    return this._get().parse(value);
  }

  override safeParse(value: unknown): ParseResult<T> {
    return this._get().safeParse(value);
  }

  override async parseAsync(value: unknown): Promise<T> {
    return this._get().parseAsync(value);
  }

  override async safeParseAsync(value: unknown): Promise<ParseResult<T>> {
    return this._get().safeParseAsync(value);
  }

  override is(value: unknown): value is T {
    return this._get().is(value);
  }
}

/* -------------------- InstanceOf Schema -------------------- */

export class InstanceOfSchema<T> extends Schema<T, unknown> {
  constructor(cls: new (...args: any[]) => T) {
    super([
      (value, path) =>
        value instanceof cls
          ? null
          : [{ code: ErrorCode.invalid_type, message: `Expected instance of ${cls.name}`, path }],
    ]);
  }
}

/* -------------------- NativeEnum Schema -------------------- */

type NativeEnumValue = string | number;
type NativeEnumObj = Record<string, NativeEnumValue>;
type InferNativeEnum<T extends NativeEnumObj> = T[keyof T];

export class NativeEnumSchema<T extends NativeEnumObj> extends Schema<InferNativeEnum<T>, unknown> {
  readonly enum: T;

  constructor(enumObj: T) {
    // For numeric TypeScript enums, the object contains reverse mappings (number → name).
    // Filter those out to get only the declared values.
    const values = Object.values(enumObj).filter(
      (v) => typeof v !== 'number' || !Object.hasOwn(enumObj, v),
    ) as NativeEnumValue[];
    const set = new Set<unknown>(values);

    super([
      (value, path) =>
        set.has(value)
          ? null
          : [
              {
                code: ErrorCode.invalid_enum,
                message: `Expected one of: ${values.join(', ')}`,
                params: { values },
                path,
              },
            ],
    ]);
    this.enum = enumObj;
  }
}

/* -------------------- Type Inference -------------------- */

export type InferOutput<T> = T extends Schema<infer O, any> ? O : never;
export type InferInput<T> = T extends Schema<any, infer I> ? I : never;

/** Alias for InferOutput — infers the output type of a schema. */
export type Infer<T> = InferOutput<T>;

/* -------------------- Public API -------------------- */

export const v = {
  any: () => new Schema<any, any>([]),
  array: <T>(schema: Schema<T, unknown>) => new ArraySchema(schema),
  boolean: () => new BooleanSchema(),
  coerce: {
    boolean: () => BooleanSchema.coerce(),
    date: () => DateSchema.coerce(),
    number: () => NumberSchema.coerce(),
    string: () => StringSchema.coerce(),
  },
  date: () => new DateSchema(),
  enum: <T extends EnumValues>(values: T) => new EnumSchema(values),
  instanceof: <T>(cls: new (...args: any[]) => T) => new InstanceOfSchema(cls),
  intersect: <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(...items: T) =>
    new IntersectSchema(normalizeToSchemas(items)),
  lazy: <T>(getter: () => Schema<T, unknown>) => new LazySchema(getter),
  literal: <T extends string | number | boolean | null | undefined>(value: T) => new LiteralSchema(value),
  nativeEnum: <T extends Record<string, string | number>>(enumObj: T) => new NativeEnumSchema(enumObj),
  never: () => new NeverSchema(),
  null: () => new LiteralSchema(null),
  number: () => new NumberSchema(),
  object: <T extends ObjectShape>(shape: T) => new ObjectSchema(shape),
  record: <K extends string, V>(keySchema: Schema<K, unknown>, valueSchema: Schema<V, unknown>) =>
    new RecordSchema(keySchema, valueSchema),
  string: () => new StringSchema(),
  tuple: <T extends TupleSchemas>(items: T) => new TupleSchema(items),
  undefined: () => new LiteralSchema(undefined),
  union: <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(...items: T) =>
    new UnionSchema(normalizeToSchemas(items)),
  unknown: () => new Schema<unknown, unknown>([]),
  variant: <K extends string, M extends Record<string, ObjectSchema<any>>>(discriminator: K, map: M) =>
    new VariantSchema(discriminator, map),
};
