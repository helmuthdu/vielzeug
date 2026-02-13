/** biome-ignore-all lint/suspicious/noExplicitAny: - */

/* -------------------- Core Types -------------------- */

export type Issue = {
  path: (string | number)[];
  message: string;
  code?: string;
  params?: Record<string, unknown>;
};

export class ValidationError extends Error {
  readonly issues: Issue[];

  constructor(issues: Issue[]) {
    const formatted = issues
      .map(({ path, message, code }) => {
        const pathStr = path.length ? path.join('.') : 'value';
        const codeStr = code ? ` [${code}]` : '';
        return `${pathStr}: ${message}${codeStr}`;
      })
      .join('\n');
    super(formatted);
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
  protected _description?: string;

  constructor(validators: ValidateFn[] = []) {
    this._validators = validators;
  }

  /* -------------------- Description -------------------- */

  describe(description: string): this {
    const cloned = this._clone(this._validators);
    cloned._description = description;
    return cloned;
  }

  /* -------------------- Core Validation -------------------- */

  parse(value: unknown): Output {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    const issues: Issue[] = [];
    for (const validate of this._validators) {
      const result = validate(value, []);
      if (result) issues.push(...result);
    }

    if (issues.length) throw new ValidationError(issues);
    return value as Output;
  }

  safeParse(value: unknown): ParseResult<Output> {
    try {
      return { data: this.parse(value), success: true };
    } catch (error) {
      return { error: error as ValidationError, success: false };
    }
  }

  async parseAsync(value: unknown): Promise<Output> {
    const issues: Issue[] = [];

    // Run sync validators
    for (const validate of this._validators) {
      const result = validate(value, []);
      if (result) issues.push(...result);
    }

    // Run async validators
    for (const validate of this._asyncValidators) {
      const result = await validate(value, []);
      if (result) issues.push(...result);
    }

    if (issues.length) throw new ValidationError(issues);
    return value as Output;
  }

  async safeParseAsync(value: unknown): Promise<ParseResult<Output>> {
    try {
      return { data: await this.parseAsync(value), success: true };
    } catch (error) {
      return { error: error as ValidationError, success: false };
    }
  }

  /* -------------------- Refinements -------------------- */

  refine(check: (value: Output) => boolean, message = 'Invalid value'): this {
    return this._clone([
      ...this._validators,
      (value, path) => (check(value as Output) ? null : [{ code: 'custom', message, path }]),
    ]);
  }

  refineAsync(check: (value: Output) => Promise<boolean>, message = 'Invalid value'): this {
    const cloned = this._clone(this._validators);
    cloned._asyncValidators = [
      ...this._asyncValidators,
      async (value, path) => {
        const isValid = await check(value as Output);
        return isValid ? null : [{ code: 'custom', message, path }];
      },
    ];
    return cloned;
  }

  /* -------------------- Modifiers -------------------- */

  optional(): Schema<Output | undefined> {
    return this._clone([
      (value, path) => {
        if (value === undefined) return null;
        return this._runValidators(value, path);
      },
    ]) as Schema<Output | undefined>;
  }

  required(message = 'Required'): this {
    return this._clone([
      (value, path) => (value !== undefined && value !== null ? null : [{ code: 'required', message, path }]),
      ...this._validators,
    ]);
  }

  nullable(): Schema<Output | null> {
    return this._clone([
      (value, path) => {
        if (value === null) return null;
        return this._runValidators(value, path);
      },
    ]) as Schema<Output | null>;
  }

  default(defaultValue: Output): this {
    const cloned = this._clone([
      (value, path) => {
        const val = value === undefined ? defaultValue : value;
        return this._runValidators(val, path);
      },
    ]);

    // Override parse to return default
    const originalParse = cloned.parse.bind(cloned);
    cloned.parse = (value: unknown): Output => {
      const val = value === undefined ? defaultValue : value;
      originalParse(val);
      return val as Output;
    };

    const originalParseAsync = cloned.parseAsync.bind(cloned);
    cloned.parseAsync = async (value: unknown): Promise<Output> => {
      const val = value === undefined ? defaultValue : value;
      await originalParseAsync(val);
      return val as Output;
    };

    return cloned;
  }

  /* -------------------- Transformation -------------------- */

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput> {
    const newSchema = new Schema<NewOutput>(this._validators);
    newSchema._asyncValidators = [...this._asyncValidators];

    // Override parse
    const originalParse = newSchema.parse.bind(newSchema);
    newSchema.parse = (value: unknown): NewOutput => {
      originalParse(value);
      return fn(value as Output);
    };

    // Override parseAsync
    const originalParseAsync = newSchema.parseAsync.bind(newSchema);
    newSchema.parseAsync = async (value: unknown): Promise<NewOutput> => {
      await originalParseAsync(value);
      return fn(value as Output);
    };

    return newSchema;
  }

  /* -------------------- Protected Helpers -------------------- */

  protected _runValidators(value: unknown, path: (string | number)[]): Issue[] | null {
    const issues: Issue[] = [];
    for (const validate of this._validators) {
      const result = validate(value, path);
      if (result) issues.push(...result);
    }
    return issues.length ? issues : null;
  }

  protected _clone(validators: ValidateFn[]): this {
    const cloned = Object.create(Object.getPrototypeOf(this)) as this;
    cloned._validators = validators;
    cloned._asyncValidators = [...this._asyncValidators];
    if (this._description) cloned._description = this._description;
    return cloned;
  }

  protected _issue(code: string, message: string, path: (string | number)[] = []): Issue {
    return { code, message, path };
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
    return this._clone([
      ...this._validators,
      (value, path) =>
        typeof value === 'string' && value.length >= length
          ? null
          : [{ code: 'too_small', message, params: { minimum: length, type: 'string' }, path }],
    ]);
  }

  max(length: number, message = `Must be at most ${length} characters`): this {
    return this._clone([
      ...this._validators,
      (value, path) =>
        typeof value === 'string' && value.length <= length
          ? null
          : [{ code: 'too_big', message, params: { maximum: length, type: 'string' }, path }],
    ]);
  }

  length(exact: number, message = `Must be exactly ${exact} characters`): this {
    return this._clone([
      ...this._validators,
      (value, path) =>
        typeof value === 'string' && value.length === exact
          ? null
          : [{ code: 'invalid_length', message, params: { exact, type: 'string' }, path }],
    ]);
  }

  pattern(regex: RegExp, message = 'Invalid format'): this {
    return this._clone([
      ...this._validators,
      (value, path) =>
        typeof value === 'string' && regex.test(value) ? null : [{ code: 'invalid_string', message, path }],
    ]);
  }

  email(message = 'Invalid email address'): this {
    return this.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
  }

  url(message = 'Invalid URL'): this {
    return this._clone([
      ...this._validators,
      (value, path) => {
        if (typeof value !== 'string') return null;
        try {
          new URL(value);
          return null;
        } catch {
          return [{ code: 'invalid_url', message, path }];
        }
      },
    ]);
  }

  trim(): this {
    return this.refine((val) => val === val.trim(), 'String must be trimmed');
  }

  nonempty(message = 'Must not be empty'): this {
    return this.min(1, message);
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
    return this._clone([
      ...this._validators,
      (value, path) =>
        typeof value === 'number' && value >= minimum
          ? null
          : [{ code: 'too_small', message, params: { minimum, type: 'number' }, path }],
    ]);
  }

  max(maximum: number, message = `Must be at most ${maximum}`): this {
    return this._clone([
      ...this._validators,
      (value, path) =>
        typeof value === 'number' && value <= maximum
          ? null
          : [{ code: 'too_big', message, params: { maximum, type: 'number' }, path }],
    ]);
  }

  int(message = 'Must be an integer'): this {
    return this._clone([
      ...this._validators,
      (value, path) =>
        typeof value === 'number' && Number.isInteger(value) ? null : [{ code: 'invalid_type', message, path }],
    ]);
  }

  positive(message = 'Must be positive'): this {
    return this.min(0, message);
  }

  negative(message = 'Must be negative'): this {
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
    return this._clone([
      ...this._validators,
      (value, path) => (value instanceof Date && value >= date ? null : [{ code: 'too_small', message, path }]),
    ]);
  }

  max(date: Date, message = `Must be before ${date.toISOString()}`): this {
    return this._clone([
      ...this._validators,
      (value, path) => (value instanceof Date && value <= date ? null : [{ code: 'too_big', message, path }]),
    ]);
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
    if (!Array.isArray(value)) {
      throw new ValidationError([{ code: 'invalid_type', message: 'Expected array', path: [] }]);
    }

    const issues: Issue[] = [];

    // Validate items
    for (let i = 0; i < value.length; i++) {
      const result = await this.itemSchema.safeParseAsync(value[i]);
      if (!result.success) {
        issues.push(
          ...result.error.issues.map((issue) => ({
            ...issue,
            path: [i, ...issue.path],
          })),
        );
      }
    }

    // Run async validators on the array itself
    for (const validate of this._asyncValidators) {
      const result = await validate(value, []);
      if (result) issues.push(...result);
    }

    if (issues.length) throw new ValidationError(issues);
    return value;
  }

  min(length: number, message = `Must have at least ${length} items`): this {
    return this._clone([
      ...this._validators,
      (value, path) =>
        Array.isArray(value) && value.length >= length
          ? null
          : [{ code: 'too_small', message, params: { minimum: length, type: 'array' }, path }],
    ]);
  }

  max(length: number, message = `Must have at most ${length} items`): this {
    return this._clone([
      ...this._validators,
      (value, path) =>
        Array.isArray(value) && value.length <= length
          ? null
          : [{ code: 'too_big', message, params: { maximum: length, type: 'array' }, path }],
    ]);
  }

  length(exact: number, message = `Must have exactly ${exact} items`): this {
    return this._clone([
      ...this._validators,
      (value, path) =>
        Array.isArray(value) && value.length === exact
          ? null
          : [{ code: 'invalid_length', message, params: { exact, type: 'array' }, path }],
    ]);
  }

  nonempty(message = 'Must not be empty'): this {
    return this.min(1, message);
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
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      throw new ValidationError([{ code: 'invalid_type', message: 'Expected object', path: [] }]);
    }

    const issues: Issue[] = [];

    // Validate properties
    for (const key in this.shape) {
      const result = await this.shape[key].safeParseAsync((value as any)[key]);
      if (!result.success) {
        issues.push(
          ...result.error.issues.map((issue) => ({
            ...issue,
            path: [key, ...issue.path],
          })),
        );
      }
    }

    // Run async validators on the object itself
    for (const validate of this._asyncValidators) {
      const result = await validate(value, []);
      if (result) issues.push(...result);
    }

    if (issues.length) throw new ValidationError(issues);
    return value as InferObject<T>;
  }

  partial(): ObjectSchema<{ [K in keyof T]: Schema<Infer<T[K]> | undefined> }> {
    const partialShape: any = {};
    for (const key in this.shape) {
      partialShape[key] = this.shape[key].optional();
    }
    return new ObjectSchema(partialShape);
  }

  pick<K extends keyof T>(...keys: K[]): ObjectSchema<Pick<T, K>> {
    const picked: any = {};
    for (const key of keys) {
      picked[key] = this.shape[key];
    }
    return new ObjectSchema(picked);
  }

  omit<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K>> {
    const omitted: any = {};
    const keySet = new Set(keys);
    for (const key in this.shape) {
      if (!keySet.has(key as unknown as K)) {
        omitted[key] = this.shape[key];
      }
    }
    return new ObjectSchema(omitted);
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
        for (const validate of this._asyncValidators) {
          const issues = await validate(value, []);
          if (issues) throw new ValidationError(issues);
        }
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
  any: () => new Schema([]),
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
  literal: <T extends string | number | boolean | null | undefined>(value: T) => new LiteralSchema(value),
  negativeInt: () => new NumberSchema().int().negative(),
  null: () => new LiteralSchema(null),
  number: () => new NumberSchema(),
  object: <T extends ObjectShape>(shape: T) => new ObjectSchema(shape),
  oneOf: <T extends readonly [string | number, ...(string | number)[]]>(...values: T) => new EnumSchema(values),
  positiveInt: () => new NumberSchema().int().positive(),
  string: () => new StringSchema(),
  undefined: () => new LiteralSchema(undefined),
  union: <T extends readonly [Schema<any>, Schema<any>, ...Schema<any>[]]>(...schemas: T) => new UnionSchema(schemas),
  unknown: () => new Schema([]),
  url: () => new StringSchema().url(),
  uuid: () => new StringSchema().uuid(),
  void: () => new LiteralSchema(undefined),
};
