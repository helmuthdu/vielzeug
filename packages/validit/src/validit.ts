/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/* -------------------- Core Types -------------------- */

export type Issue = {
  path: (string | number)[];
  message: string;
  code?: string;
  params?: Record<string, unknown>;
};

function formatIssues(issues: Issue[]): string {
  return issues
    .map(({ path, message, code }) => {
      const pathStr = path.length ? path.join('.') : 'value';
      const codeStr = code ? ` [${code}]` : '';
      return `${pathStr}: ${message}${codeStr}`;
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
}

export type ParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };

type ValidateFn = (value: unknown, path: (string | number)[]) => Issue[] | null;
type AsyncValidateFn = (value: unknown, path: (string | number)[]) => Promise<Issue[] | null>;

/* -------------------- Base Schema -------------------- */

export class Schema<Output = unknown> {
  protected _validators: ValidateFn[] = [];
  protected _asyncValidators: AsyncValidateFn[] = [];
  protected _preprocessors: Array<(value: unknown) => unknown> = [];
  protected _postprocessors: Array<(value: any) => any> = [];
  // Flags used by optional()/nullable() so constraint chains still work
  protected _isOptional = false;
  protected _isNullable = false;

  constructor(validators: ValidateFn[] = []) {
    this._validators = validators;
  }

  parse(value: unknown): Output {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);
    const issues = this._runSync(processed, []);
    if (issues.length) throw new ValidationError(issues);
    return this._postprocessors.reduce((v, fn) => fn(v), processed) as Output;
  }

  safeParse(value: unknown): ParseResult<Output> {
    try {
      return { data: this.parse(value), success: true };
    } catch (error) {
      if (ValidationError.is(error)) return { error, success: false };
      throw error; // re-throw unexpected errors (bugs in validators, etc.)
    }
  }

  async parseAsync(value: unknown): Promise<Output> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);
    const syncIssues = this._runSync(processed, []);
    if (syncIssues.length) throw new ValidationError(syncIssues);
    const asyncIssues = await this._runAsync(processed, []);
    if (asyncIssues.length) throw new ValidationError(asyncIssues);
    return this._postprocessors.reduce((v, fn) => fn(v), processed) as Output;
  }

  async safeParseAsync(value: unknown): Promise<ParseResult<Output>> {
    try {
      return { data: await this.parseAsync(value), success: true };
    } catch (error) {
      if (ValidationError.is(error)) return { error, success: false };
      throw error;
    }
  }

  /** Accepts sync or async check. Async functions are deferred to parseAsync(). */
  refine(check: (value: Output) => boolean | Promise<boolean>, message = 'Invalid value'): this {
    if (check.constructor.name === 'AsyncFunction') {
      const cloned = this._clone();
      cloned._asyncValidators = [
        ...this._asyncValidators,
        async (value, path) => {
          const ok = await (check as (v: Output) => Promise<boolean>)(value as Output);
          return ok ? null : [{ code: 'custom', message, path }];
        },
      ];
      return cloned;
    }
    return this._addValidator((value, path) =>
      (check as (v: Output) => boolean)(value as Output) ? null : [{ code: 'custom', message, path }],
    );
  }

  /** Allows undefined; preserves subclass constraints via _isOptional flag. */
  optional(): this & Schema<Output | undefined> {
    const cloned = this._clone();
    cloned._isOptional = true;
    return cloned as this & Schema<Output | undefined>;
  }

  /** Allows null; preserves subclass constraints via _isNullable flag. */
  nullable(): this & Schema<Output | null> {
    const cloned = this._clone();
    cloned._isNullable = true;
    return cloned as this & Schema<Output | null>;
  }

  default(defaultValue: Output): this {
    const cloned = this._clone();
    cloned._preprocessors = [...this._preprocessors, (v) => (v === undefined ? defaultValue : v)];
    return cloned;
  }

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput> {
    const next = new Schema<NewOutput>(this._validators);
    next._asyncValidators = [...this._asyncValidators];
    next._preprocessors = [...this._preprocessors];
    next._postprocessors = [...this._postprocessors, fn as (v: any) => any];
    next._isOptional = this._isOptional;
    next._isNullable = this._isNullable;
    return next;
  }

  /** Type guard — narrows value to Output using safeParse. */
  is(value: unknown): value is Output {
    return this.safeParse(value).success;
  }

  /** Bail on the first failing validator. Respects optional/nullable flags. */
  protected _runSync(value: unknown, path: (string | number)[]): Issue[] {
    if (this._isOptional && value === undefined) return [];
    if (this._isNullable && value === null) return [];
    for (const validate of this._validators) {
      const result = validate(value, path);
      if (result) return result;
    }
    return [];
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
    Object.assign(cloned, this);
    cloned._validators = validators;
    cloned._asyncValidators = [...this._asyncValidators];
    cloned._preprocessors = [...this._preprocessors];
    cloned._postprocessors = [...this._postprocessors];
    cloned._isOptional = this._isOptional;
    cloned._isNullable = this._isNullable;
    return cloned;
  }
}

/* -------------------- String Schema -------------------- */

export class StringSchema extends Schema<string> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'string' ? null : [{ code: 'invalid_type', message: 'Expected string', path }],
    ]);
  }

  min(length: number, message = `Must be at least ${length} characters`): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.length >= length
        ? null
        : [{ code: 'too_small', message, params: { minimum: length, type: 'string' }, path }],
    );
  }

  max(length: number, message = `Must be at most ${length} characters`): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.length <= length
        ? null
        : [{ code: 'too_big', message, params: { maximum: length, type: 'string' }, path }],
    );
  }

  length(exact: number, message = `Must be exactly ${exact} characters`): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.length === exact
        ? null
        : [{ code: 'invalid_length', message, params: { exact, type: 'string' }, path }],
    );
  }

  nonempty(message = 'Cannot be empty'): this {
    return this.min(1, message);
  }

  startsWith(prefix: string, message = `Must start with "${prefix}"`): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.startsWith(prefix) ? null : [{ code: 'invalid_string', message, path }],
    );
  }

  endsWith(suffix: string, message = `Must end with "${suffix}"`): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && value.endsWith(suffix) ? null : [{ code: 'invalid_string', message, path }],
    );
  }

  pattern(regex: RegExp, message = 'Invalid format'): this {
    return this._addValidator((value, path) =>
      typeof value === 'string' && regex.test(value) ? null : [{ code: 'invalid_string', message, path }],
    );
  }

  email(message = 'Invalid email address'): this {
    return this.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
  }

  url(message = 'Invalid URL'): this {
    return this._addValidator((value, path) => {
      if (typeof value !== 'string') return null;
      try {
        new URL(value);
        return null;
      } catch {
        return [{ code: 'invalid_url', message, path }];
      }
    });
  }

  uuid(message = 'Invalid UUID'): this {
    return this.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message);
  }

  trim(): this {
    return this._addPreprocessor((v) => (typeof v === 'string' ? v.trim() : v));
  }

  static coerce(): StringSchema {
    return new StringSchema()._addPreprocessor((v) => (v == null ? v : String(v)));
  }
}

/* -------------------- Number Schema -------------------- */

export class NumberSchema extends Schema<number> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'number' && !Number.isNaN(value)
          ? null
          : [{ code: 'invalid_type', message: 'Expected number', path }],
    ]);
  }

  min(minimum: number, message = `Must be at least ${minimum}`): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value >= minimum
        ? null
        : [{ code: 'too_small', message, params: { minimum }, path }],
    );
  }

  max(maximum: number, message = `Must be at most ${maximum}`): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value <= maximum ? null : [{ code: 'too_big', message, params: { maximum }, path }],
    );
  }

  int(message = 'Must be an integer'): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && Number.isInteger(value) ? null : [{ code: 'not_integer', message, path }],
    );
  }

  positive(message = 'Must be positive'): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value > 0
        ? null
        : [{ code: 'too_small', message, params: { exclusive: true, minimum: 0 }, path }],
    );
  }

  negative(message = 'Must be negative'): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && value < 0
        ? null
        : [{ code: 'too_big', message, params: { exclusive: true, maximum: 0 }, path }],
    );
  }

  nonNegative(message = 'Must be non-negative'): this {
    return this.min(0, message);
  }

  nonPositive(message = 'Must be non-positive'): this {
    return this.max(0, message);
  }

  multipleOf(step: number, message = `Must be a multiple of ${step}`): this {
    return this._addValidator((value, path) =>
      typeof value === 'number' && Math.abs(value % step) < Number.EPSILON * 1000
        ? null
        : [{ code: 'not_multiple_of', message, params: { step }, path }],
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

export class BooleanSchema extends Schema<boolean> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'boolean' ? null : [{ code: 'invalid_type', message: 'Expected boolean', path }],
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

export class DateSchema extends Schema<Date> {
  constructor() {
    super([
      (value, path) =>
        value instanceof Date && !Number.isNaN(value.getTime())
          ? null
          : [{ code: 'invalid_date', message: 'Expected valid date', path }],
    ]);
  }

  min(date: Date, message = `Must be after ${date.toISOString()}`): this {
    return this._addValidator((value, path) =>
      value instanceof Date && value >= date ? null : [{ code: 'too_small', message, path }],
    );
  }

  max(date: Date, message = `Must be before ${date.toISOString()}`): this {
    return this._addValidator((value, path) =>
      value instanceof Date && value <= date ? null : [{ code: 'too_big', message, path }],
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

export class LiteralSchema<T extends string | number | boolean | null | undefined> extends Schema<T> {
  constructor(value: T) {
    super([
      (val, path) =>
        val === value ? null : [{ code: 'invalid_literal', message: `Expected ${JSON.stringify(value)}`, path }],
    ]);
  }
}

/* -------------------- Raw-or-schema helpers -------------------- */

type LiteralValue = string | number | boolean | null | undefined;
type RawOrSchema = Schema<any> | LiteralValue;
type NormalizeItem<T> = T extends Schema<any> ? T : T extends LiteralValue ? LiteralSchema<T> : never;
type NormalizeItems<T extends readonly RawOrSchema[]> = { readonly [K in keyof T]: NormalizeItem<T[K]> };

function normalizeToSchemas<T extends readonly RawOrSchema[]>(items: T): NormalizeItems<T> {
  return items.map((item) =>
    item instanceof Schema ? item : new LiteralSchema(item as LiteralValue),
  ) as unknown as NormalizeItems<T>;
}

/* -------------------- Array Schema -------------------- */

export class ArraySchema<T> extends Schema<T[]> {
  private readonly itemSchema: Schema<T>;

  constructor(itemSchema: Schema<T>) {
    super([
      (value, path) => {
        if (!Array.isArray(value)) {
          return [{ code: 'invalid_type', message: 'Expected array', path }];
        }
        const issues: Issue[] = [];
        for (let i = 0; i < value.length; i++) {
          const result = itemSchema.safeParse(value[i]);
          if (!result.success) {
            issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })));
          }
        }
        return issues.length ? issues : null;
      },
    ]);
    this.itemSchema = itemSchema;
  }

  override parse(value: unknown): T[] {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);
    if (!Array.isArray(processed)) {
      throw new ValidationError([{ code: 'invalid_type', message: 'Expected array', path: [] }]);
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
    // Run array-level validators (min/max/length) on the raw processed array
    const arrayIssues = this._runArrayValidators(processed, []);
    issues.push(...arrayIssues);
    if (issues.length) throw new ValidationError(issues);
    return this._postprocessors.reduce((v, fn) => fn(v), items) as T[];
  }

  /** Run validators index 1+ (array-level constraints) — skip index 0 (item validator). */
  private _runArrayValidators(value: unknown, path: (string | number)[]): Issue[] {
    for (let i = 1; i < this._validators.length; i++) {
      const result = this._validators[i](value, path);
      if (result) return result;
    }
    return [];
  }

  override async parseAsync(value: unknown): Promise<T[]> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);
    if (!Array.isArray(processed)) {
      throw new ValidationError([{ code: 'invalid_type', message: 'Expected array', path: [] }]);
    }
    const itemResults = await Promise.all(
      processed.map((item, i) =>
        this.itemSchema.safeParseAsync(item).then((result) => ({
          issues: result.success ? [] : result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })),
          data: result.success ? result.data : (item as T),
        })),
      ),
    );
    const items = itemResults.map((r) => r.data);
    const issues = [...itemResults.flatMap((r) => r.issues), ...(await this._runAsync(processed, []))];
    if (issues.length) throw new ValidationError(issues);
    return this._postprocessors.reduce((v, fn) => fn(v), items) as T[];
  }

  min(length: number, message = `Must have at least ${length} items`): this {
    return this._addValidator((value, path) =>
      Array.isArray(value) && value.length >= length
        ? null
        : [{ code: 'too_small', message, params: { minimum: length }, path }],
    );
  }

  max(length: number, message = `Must have at most ${length} items`): this {
    return this._addValidator((value, path) =>
      Array.isArray(value) && value.length <= length
        ? null
        : [{ code: 'too_big', message, params: { maximum: length }, path }],
    );
  }

  length(exact: number, message = `Must have exactly ${exact} items`): this {
    return this._addValidator((value, path) =>
      Array.isArray(value) && value.length === exact
        ? null
        : [{ code: 'invalid_length', message, params: { exact }, path }],
    );
  }

  nonempty(message = 'Cannot be empty'): this {
    return this.min(1, message);
  }
}

/* -------------------- Object Schema -------------------- */

export type ObjectMode = 'strip' | 'passthrough' | 'strict';
type ObjectShape = Record<string, Schema<any>>;
type InferObject<T extends ObjectShape> = { [K in keyof T]: Infer<T[K]> };

export class ObjectSchema<T extends ObjectShape> extends Schema<InferObject<T>> {
  readonly shape: T;
  private readonly _mode: ObjectMode;

  constructor(shape: T, mode: ObjectMode = 'strip') {
    super([]);
    this.shape = shape;
    this._mode = mode;
    // _validators[0] is a lightweight type-guard used by AnyOfSchema / OneOfSchema
    // when they inspect _validators[0] directly. Full validation happens in parse().
    this._validators = [this._buildTypeGuard(shape, mode)];
  }

  /**
   * Lightweight structural type-guard stored as _validators[0].
   * Only checks the type/mode constraints — does NOT run field schemas.
   * Used by AnyOfSchema/OneOfSchema which inspect _validators[0] directly.
   */
  private _buildTypeGuard(shape: T, mode: ObjectMode): ValidateFn {
    return (value, path) => {
      if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return [{ code: 'invalid_type', message: 'Expected object', path }];
      }
      if (mode === 'strict') {
        const obj = value as Record<string, unknown>;
        const knownKeys = new Set(Object.keys(shape));
        const unknownKeys = Object.keys(obj).filter((k) => !knownKeys.has(k));
        if (unknownKeys.length > 0) {
          return [{ code: 'unrecognized_keys', message: `Unrecognized keys: ${unknownKeys.join(', ')}`, path }];
        }
      }
      return null;
    };
  }

  override parse(value: unknown): InferObject<T> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);
    if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
      throw new ValidationError([{ code: 'invalid_type', message: 'Expected object', path: [] }]);
    }
    const obj = processed as Record<string, unknown>;

    if (this._mode === 'strict') {
      const knownKeys = new Set(Object.keys(this.shape));
      const unknownKeys = Object.keys(obj).filter((k) => !knownKeys.has(k));
      if (unknownKeys.length > 0) {
        throw new ValidationError([
          { code: 'unrecognized_keys', message: `Unrecognized keys: ${unknownKeys.join(', ')}`, path: [] },
        ]);
      }
    }

    const issues: Issue[] = [];
    const output: Record<string, unknown> = this._mode === 'passthrough' ? { ...obj } : {};
    for (const key in this.shape) {
      const result = this.shape[key].safeParse(obj[key]);
      if (result.success) {
        output[key] = result.data;
      } else {
        issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })));
      }
    }

    // Run any extra validators (e.g. refine) registered directly on the object schema
    for (let i = 1; i < this._validators.length; i++) {
      const extraIssues = this._validators[i](output, []);
      if (extraIssues) issues.push(...extraIssues);
    }

    if (issues.length) throw new ValidationError(issues);
    return this._postprocessors.reduce((v, fn) => fn(v), output) as InferObject<T>;
  }

  override async parseAsync(value: unknown): Promise<InferObject<T>> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

    if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
      throw new ValidationError([{ code: 'invalid_type', message: 'Expected object', path: [] }]);
    }
    const obj = processed as Record<string, unknown>;

    if (this._mode === 'strict') {
      const knownKeys = new Set(Object.keys(this.shape));
      const unknownKeys = Object.keys(obj).filter((k) => !knownKeys.has(k));
      if (unknownKeys.length > 0) {
        throw new ValidationError([
          { code: 'unrecognized_keys', message: `Unrecognized keys: ${unknownKeys.join(', ')}`, path: [] },
        ]);
      }
    }

    const keyResults = await Promise.all(
      Object.keys(this.shape).map((key) =>
        this.shape[key].safeParseAsync(obj[key]).then((result) => ({
          key,
          issues: result.success ? [] : result.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })),
          data: result.success ? result.data : obj[key],
        })),
      ),
    );

    const output: Record<string, unknown> = this._mode === 'passthrough' ? { ...obj } : {};
    for (const r of keyResults) {
      if (r.issues.length === 0) output[r.key] = r.data;
    }

    const issues = [...keyResults.flatMap((r) => r.issues), ...(await this._runAsync(output, []))];
    if (issues.length) throw new ValidationError(issues);
    return this._postprocessors.reduce((v, fn) => fn(v), output) as InferObject<T>;
  }

  partial(): ObjectSchema<{ [K in keyof T]: Schema<Infer<T[K]> | undefined> }> {
    return new ObjectSchema(
      Object.fromEntries(Object.entries(this.shape).map(([k, s]) => [k, s.optional()])) as any,
      this._mode,
    );
  }

  required(): ObjectSchema<{ [K in keyof T]: Schema<Exclude<Infer<T[K]>, undefined>> }> {
    return new ObjectSchema(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, s]) => {
          const cloned = (s as unknown as ObjectSchema<any>)._clone();
          cloned._isOptional = false;
          return [k, cloned];
        }),
      ) as any,
      this._mode,
    );
  }

  extend<U extends ObjectShape>(extra: U): ObjectSchema<Omit<T, keyof U> & U> {
    return new ObjectSchema({ ...this.shape, ...extra } as any, this._mode);
  }

  pick<K extends keyof T>(...keys: K[]): ObjectSchema<Pick<T, K>> {
    const keySet = new Set(keys as string[]);
    return new ObjectSchema(
      Object.fromEntries(Object.entries(this.shape).filter(([k]) => keySet.has(k))) as any,
      this._mode,
    );
  }

  omit<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K>> {
    const keySet = new Set(keys as string[]);
    return new ObjectSchema(
      Object.fromEntries(Object.entries(this.shape).filter(([k]) => !keySet.has(k))) as any,
      this._mode,
    );
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

  /** Copy async validators (refine calls) from another ObjectSchema onto this one. */
  private _copyRefinements(source: ObjectSchema<T>): this {
    // validators[0] is always the structural validator; keep extras (refine)
    const extraValidators = source._validators.slice(1);
    if (extraValidators.length) {
      this._validators = [...this._validators, ...extraValidators];
    }
    this._asyncValidators = [...source._asyncValidators];
    return this;
  }
}

/* -------------------- OneOf Schema -------------------- */

/** Exactly one schema must match — mutual exclusion. */
export class OneOfSchema<T extends readonly Schema<any>[]> extends Schema<Infer<T[number]>> {
  constructor(schemas: T) {
    super([
      (value, path) => {
        const passed = schemas.filter((s) => s.safeParse(value).success);
        if (passed.length === 1) return null;
        if (passed.length === 0)
          return [{ code: 'invalid_one_of', message: 'Does not match any of the expected types', path }];
        return [{ code: 'invalid_one_of', message: 'Matches more than one of the expected types', path }];
      },
    ]);
  }
}

/* -------------------- AllOf Schema -------------------- */

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/** All schemas must pass — intersection semantics. */
export class AllOfSchema<T extends readonly Schema<any>[]> extends Schema<UnionToIntersection<Infer<T[number]>>> {
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

/* -------------------- NoneOf Schema -------------------- */

/** Passes only when the value matches **none** of the given schemas. */
export class NoneOfSchema extends Schema<unknown> {
  constructor(schemas: readonly Schema<any>[]) {
    super([
      (value, path) => {
        for (const schema of schemas) {
          if (schema.safeParse(value).success) {
            return [{ code: 'invalid_none_of', message: 'Matches a disallowed schema', path }];
          }
        }
        return null;
      },
    ]);
  }
}

/* -------------------- Never Schema -------------------- */

/** Always fails — useful as a disallowed branch. */
export class NeverSchema extends Schema<never> {
  constructor() {
    super([(_, path) => [{ code: 'invalid_type', message: 'Value is not allowed', path }]]);
  }
}

/* -------------------- Lazy Schema -------------------- */

/** Defers schema resolution — enables recursive / circular schemas. */
export class LazySchema<T> extends Schema<T> {
  private _resolved: Schema<T> | null = null;
  private readonly getter: () => Schema<T>;

  constructor(getter: () => Schema<T>) {
    super([]);
    this.getter = getter;
  }

  private _get(): Schema<T> {
    return (this._resolved ??= this.getter());
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

export class InstanceOfSchema<T> extends Schema<T> {
  constructor(cls: new (...args: any[]) => T) {
    super([
      (value, path) =>
        value instanceof cls ? null : [{ code: 'invalid_type', message: `Expected instance of ${cls.name}`, path }],
    ]);
  }
}

/* -------------------- Type Inference -------------------- */

export type Infer<T> = T extends Schema<infer U> ? U : never;

/* -------------------- pipe() -------------------- */

export function pipe<A>(a: Schema<A>): Schema<A>;
export function pipe<A, B>(a: Schema<A>, b: Schema<B>): Schema<B>;
export function pipe<A, B, C>(a: Schema<A>, b: Schema<B>, c: Schema<C>): Schema<C>;
export function pipe<A, B, C, D>(a: Schema<A>, b: Schema<B>, c: Schema<C>, d: Schema<D>): Schema<D>;
export function pipe(...schemas: Schema<any>[]): Schema<any> {
  return schemas.reduce((prev, curr) => prev.transform((v) => curr.parse(v)));
}

/* -------------------- Public API -------------------- */

export const v = {
  allOf: <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(...items: T) =>
    new AllOfSchema(normalizeToSchemas(items)),
  any: () => new Schema<any>([]),
  noneOf: <T extends readonly [RawOrSchema, ...RawOrSchema[]]>(...items: T) =>
    new NoneOfSchema(normalizeToSchemas(items)),
  array: <T>(schema: Schema<T>) => new ArraySchema(schema),
  boolean: () => new BooleanSchema(),
  coerce: {
    boolean: () => BooleanSchema.coerce(),
    date: () => DateSchema.coerce(),
    number: () => NumberSchema.coerce(),
    string: () => StringSchema.coerce(),
  },
  date: () => new DateSchema(),
  email: () => new StringSchema().email(),
  instanceof: <T>(cls: new (...args: any[]) => T) => new InstanceOfSchema(cls),
  int: () => new NumberSchema().int(),
  lazy: <T>(getter: () => Schema<T>) => new LazySchema(getter),
  literal: <T extends string | number | boolean | null | undefined>(value: T) => new LiteralSchema(value),
  never: () => new NeverSchema(),
  null: () => new LiteralSchema(null),
  number: () => new NumberSchema(),
  object: <T extends ObjectShape>(shape: T) => new ObjectSchema(shape),
  oneOf: <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(...items: T) =>
    new OneOfSchema(normalizeToSchemas(items)),
  string: () => new StringSchema(),
  undefined: () => new LiteralSchema(undefined),
  unknown: () => new Schema([]),
  url: () => new StringSchema().url(),
  uuid: () => new StringSchema().uuid(),
};
