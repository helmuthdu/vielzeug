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
      return { error: error as ValidationError, success: false };
    }
  }

  async parseAsync(value: unknown): Promise<Output> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);
    const syncIssues = this._runSync(processed, []);
    const asyncIssues = await this._runAsync(processed, []);
    const issues = [...syncIssues, ...asyncIssues];

    if (issues.length) throw new ValidationError(issues);
    return this._postprocessors.reduce((v, fn) => fn(v), processed) as Output;
  }

  async safeParseAsync(value: unknown): Promise<ParseResult<Output>> {
    try {
      return { data: await this.parseAsync(value), success: true };
    } catch (error) {
      return { error: error as ValidationError, success: false };
    }
  }

  refine(check: (value: Output) => boolean, message = 'Invalid value'): this {
    return this._addValidator((value, path) => (check(value as Output) ? null : [{ code: 'custom', message, path }]));
  }

  refineAsync(check: (value: Output) => Promise<boolean>, message = 'Invalid value'): this {
    const cloned = this._clone();
    cloned._asyncValidators.push(async (value, path) => {
      const isValid = await check(value as Output);
      return isValid ? null : [{ code: 'custom', message, path }];
    });
    return cloned;
  }

  optional(): Schema<Output | undefined> {
    return this._clone([(value, path) => (value === undefined ? null : this._runSync(value, path))]) as Schema<
      Output | undefined
    >;
  }

  nullable(): Schema<Output | null> {
    return this._clone([
      (value, path) => (value === null ? null : this._runSync(value, path)),
    ]) as Schema<Output | null>;
  }

  default(defaultValue: Output): this {
    const cloned = this._clone();
    cloned._preprocessors = [...this._preprocessors, (v) => (v === undefined ? defaultValue : v)];
    return cloned;
  }

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput> {
    const newSchema = new Schema<NewOutput>(this._validators);
    newSchema._asyncValidators = [...this._asyncValidators];
    newSchema._preprocessors = [...this._preprocessors];
    newSchema._postprocessors = [...this._postprocessors, fn as (value: any) => any];
    return newSchema;
  }

  protected _runSync(value: unknown, path: (string | number)[]): Issue[] {
    const issues: Issue[] = [];
    for (const validate of this._validators) {
      const result = validate(value, path);
      if (result) issues.push(...result);
    }
    return issues;
  }

  protected async _runAsync(value: unknown, path: (string | number)[]): Promise<Issue[]> {
    const results = await Promise.all(this._asyncValidators.map((fn) => fn(value, path)));
    return results.flatMap((r) => r ?? []);
  }

  protected _addValidator(validator: ValidateFn): this {
    return this._clone([...this._validators, validator]);
  }

  protected _clone(validators: ValidateFn[] = this._validators): this {
    const cloned = Object.create(Object.getPrototypeOf(this)) as this;
    Object.assign(cloned, this);
    cloned._validators = validators;
    cloned._asyncValidators = [...this._asyncValidators];
    cloned._preprocessors = [...this._preprocessors];
    cloned._postprocessors = [...this._postprocessors];
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

  trim(): this {
    const cloned = this._clone();
    cloned._preprocessors = [...this._preprocessors, (v) => (typeof v === 'string' ? v.trim() : v)];
    return cloned;
  }

  uuid(message = 'Invalid UUID'): this {
    return this.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message);
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
}

/* -------------------- Boolean Schema -------------------- */

export class BooleanSchema extends Schema<boolean> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'boolean' ? null : [{ code: 'invalid_type', message: 'Expected boolean', path }],
    ]);
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

/* -------------------- Enum Schema -------------------- */

export class EnumSchema<T extends readonly [string | number, ...(string | number)[]]> extends Schema<T[number]> {
  constructor(values: T) {
    const set = new Set(values);
    super([
      (value, path) =>
        set.has(value as T[number])
          ? null
          : [{ code: 'invalid_enum', message: `Expected one of: ${values.join(', ')}`, path }],
    ]);
  }
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
            issues.push(
              ...result.error.issues.map((issue) => ({
                ...issue,
                path: [i, ...issue.path],
              })),
            );
          }
        }
        return issues.length ? issues : null;
      },
    ]);

    this.itemSchema = itemSchema;
  }

  override async parseAsync(value: unknown): Promise<T[]> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);
    if (!Array.isArray(processed)) {
      throw new ValidationError([{ code: 'invalid_type', message: 'Expected array', path: [] }]);
    }
    const itemResults = await Promise.all(
      processed.map((item, i) =>
        this.itemSchema
          .safeParseAsync(item)
          .then((result) =>
            result.success ? [] : result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })),
          ),
      ),
    );
    const issues = [...itemResults.flat(), ...(await this._runAsync(processed, []))];
    if (issues.length) throw new ValidationError(issues);
    return this._postprocessors.reduce((v, fn) => fn(v), processed) as T[];
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
}

/* -------------------- Object Schema -------------------- */

type ObjectShape = Record<string, Schema<any>>;
type InferObject<T extends ObjectShape> = { [K in keyof T]: Infer<T[K]> };

export class ObjectSchema<T extends ObjectShape> extends Schema<InferObject<T>> {
  private readonly shape: T;

  constructor(shape: T) {
    super([
      (value, path) => {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
          return [{ code: 'invalid_type', message: 'Expected object', path }];
        }

        const issues: Issue[] = [];
        for (const key in shape) {
          const result = shape[key].safeParse((value as any)[key]);
          if (!result.success) {
            issues.push(
              ...result.error.issues.map((issue) => ({
                ...issue,
                path: [key, ...issue.path],
              })),
            );
          }
        }
        return issues.length ? issues : null;
      },
    ]);

    this.shape = shape;
  }

  override async parseAsync(value: unknown): Promise<InferObject<T>> {
    const processed = this._preprocessors.reduce((v, fn) => fn(v), value);
    if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
      throw new ValidationError([{ code: 'invalid_type', message: 'Expected object', path: [] }]);
    }
    const obj = processed as any;
    const keyResults = await Promise.all(
      Object.keys(this.shape).map((key) =>
        this.shape[key]
          .safeParseAsync(obj[key])
          .then((result) =>
            result.success ? [] : result.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })),
          ),
      ),
    );
    const issues = [...keyResults.flat(), ...(await this._runAsync(processed, []))];
    if (issues.length) throw new ValidationError(issues);
    return this._postprocessors.reduce((v, fn) => fn(v), obj) as InferObject<T>;
  }

  partial(): ObjectSchema<{ [K in keyof T]: Schema<Infer<T[K]> | undefined> }> {
    return new ObjectSchema(Object.fromEntries(Object.entries(this.shape).map(([k, s]) => [k, s.optional()])) as any);
  }

  pick<K extends keyof T>(...keys: K[]): ObjectSchema<Pick<T, K>> {
    const keySet = new Set(keys as string[]);
    return new ObjectSchema(Object.fromEntries(Object.entries(this.shape).filter(([k]) => keySet.has(k))) as any);
  }

  omit<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K>> {
    const keySet = new Set(keys as string[]);
    return new ObjectSchema(Object.fromEntries(Object.entries(this.shape).filter(([k]) => !keySet.has(k))) as any);
  }
}

/* -------------------- Union Schema -------------------- */

export class UnionSchema<T extends readonly Schema<any>[]> extends Schema<Infer<T[number]>> {
  private readonly schemas: T;

  constructor(schemas: T) {
    super([
      (value, path) => {
        for (const schema of schemas) {
          const result = schema.safeParse(value);
          if (result.success) return null;
        }
        return [{ code: 'invalid_union', message: 'Does not match any union type', path }];
      },
    ]);

    this.schemas = schemas;
  }

  override async parseAsync(value: unknown): Promise<Infer<T[number]>> {
    // Try each schema until one succeeds
    for (const schema of this.schemas) {
      const result = await schema.safeParseAsync(value);
      if (result.success) {
        // Run parent async validators
        const asyncIssues = await this._runAsync(value, []);
        if (asyncIssues.length) throw new ValidationError(asyncIssues);
        return result.data;
      }
    }

    throw new ValidationError([{ code: 'invalid_union', message: 'Does not match any union type', path: [] }]);
  }
}

/* -------------------- Type Inference -------------------- */

export type Infer<T> = T extends Schema<infer U> ? U : never;

/* -------------------- Public API -------------------- */

export const v = {
  any: () => new Schema<any>([]),
  array: <T>(schema: Schema<T>) => new ArraySchema(schema),
  boolean: () => new BooleanSchema(),
  coerce: {
    boolean: () =>
      new Schema<boolean>([
        (value, path) => {
          if (typeof value === 'boolean') return null;
          if (value === 'true' || value === 'false' || value === 1 || value === 0) return null;
          return [{ code: 'invalid_type', message: 'Cannot coerce to boolean', path }];
        },
      ]).transform((val) => (val as any) === 'true' || (val as any) === 1),
    date: () =>
      new Schema<Date>([
        (value, path) => {
          if (value instanceof Date && !Number.isNaN(value.getTime())) return null;
          if (typeof value === 'string' || typeof value === 'number') {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) return null;
          }
          return [{ code: 'invalid_type', message: 'Cannot coerce to date', path }];
        },
      ]).transform((val) => new Date(val as string | number | Date)),
    number: () =>
      new Schema<number>([
        (value, path) => {
          if (typeof value === 'number' && !Number.isNaN(value)) return null;
          if (typeof value === 'string') {
            const num = Number(value);
            if (!Number.isNaN(num)) return null;
          }
          return [{ code: 'invalid_type', message: 'Cannot coerce to number', path }];
        },
      ]).transform((val) => Number(val)),
    string: () =>
      new Schema<string>([
        (value, path) =>
          value == null ? [{ code: 'invalid_type', message: 'Cannot coerce null/undefined', path }] : null,
      ]).transform((val) => String(val)),
  },
  date: () => new DateSchema(),
  email: () => new StringSchema().email(),
  enum: <T extends readonly [string | number, ...(string | number)[]]>(...values: T) => new EnumSchema(values),
  int: () => new NumberSchema().int(),
  literal: <T extends string | number | boolean | null | undefined>(value: T) => new LiteralSchema(value),
  null: () => new LiteralSchema(null),
  number: () => new NumberSchema(),
  object: <T extends ObjectShape>(shape: T) => new ObjectSchema(shape),
  string: () => new StringSchema(),
  undefined: () => new LiteralSchema(undefined),
  union: <T extends readonly [Schema<any>, Schema<any>, ...Schema<any>[]]>(...schemas: T) => new UnionSchema(schemas),
  unknown: () => new Schema([]),
  url: () => new StringSchema().url(),
  uuid: () => new StringSchema().uuid(),
};
