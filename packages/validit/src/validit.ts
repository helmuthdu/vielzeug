/** biome-ignore-all lint/suspicious/noExplicitAny: - */

// validit - Lightweight, type-safe schema validation

/* ============================================
   Core Types
   ============================================ */

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

/* ============================================
   Base Schema
   ============================================ */

export class Schema<Output = unknown> {
  protected _validators: ValidateFn[] = [];
  protected _asyncValidators: AsyncValidateFn[] = [];
  protected _description?: string;

  constructor(validators: ValidateFn[] = []) {
    this._validators = validators;
  }

  // Helper to describe the schema (useful for better error messages)
  describe(description: string): this {
    const cloned = this._clone(this._validators);
    cloned._description = description;
    return cloned;
  }

  // Helper to run sync validators
  protected _runSyncValidators(value: unknown, path: (string | number)[] = []): Issue[] {
    const issues: Issue[] = [];
    for (const validate of this._validators) {
      const result = validate(value, path);
      if (result) issues.push(...result);
    }
    return issues;
  }

  // Helper to run async validators
  protected async _runAsyncValidators(value: unknown, path: (string | number)[] = []): Promise<Issue[]> {
    const issues: Issue[] = [];
    for (const validate of this._asyncValidators) {
      const result = await validate(value, path);
      if (result) issues.push(...result);
    }
    return issues;
  }

  // Helper to map issues with a path prefix
  protected _mapIssuesWithPath(issues: Issue[], pathPrefix: string | number): Issue[] {
    return issues.map((issue) => ({ ...issue, path: [pathPrefix, ...issue.path] }));
  }

  // Helper to validate an array of items with a schema (supports parallel and sequential)
  protected async _validateArrayItems<T>(items: unknown[], itemSchema: Schema<T>, parallel: boolean): Promise<Issue[]> {
    const issues: Issue[] = [];

    if (parallel && items.length > 0) {
      // Parallel validation
      const results = await Promise.all(
        items.map((item, i) => itemSchema.safeParseAsync(item).then((result) => ({ i, result }))),
      );

      for (const { i, result } of results) {
        if (!result.success) {
          issues.push(...this._mapIssuesWithPath(result.error.issues, i));
        }
      }
    } else {
      // Sequential validation
      for (let i = 0; i < items.length; i++) {
        const result = await itemSchema.safeParseAsync(items[i]);
        if (!result.success) {
          issues.push(...this._mapIssuesWithPath(result.error.issues, i));
        }
      }
    }

    return issues;
  }

  // Helper to run a list of validators (useful for closures in modifiers)
  protected _runValidatorList(value: unknown, path: (string | number)[], validators: ValidateFn[]): Issue[] {
    const issues: Issue[] = [];
    for (const validate of validators) {
      const result = validate(value, path);
      if (result) issues.push(...result);
    }
    return issues;
  }

  // Helper to create a validator with common error pattern
  protected _addValidator(
    check: (value: unknown) => boolean,
    code: string,
    message: string,
    params?: Record<string, unknown>,
  ): this {
    return this._clone([
      ...this._validators,
      (value, path) => (check(value) ? null : [{ code, message, params, path }]),
    ]);
  }

  // Transformation helper
  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput> {
    const transformedValidators: ValidateFn[] = [
      (value, path) => {
        const syncIssues = this._runSyncValidators(value, path);
        if (syncIssues.length) return syncIssues;
        return null;
      },
    ];

    const newSchema = new Schema<NewOutput>(transformedValidators);
    newSchema._asyncValidators = [...this._asyncValidators];

    // Override parse to apply transformation
    const originalParse = newSchema.parse.bind(newSchema);
    newSchema.parse = (value: unknown): NewOutput => {
      originalParse(value);
      return fn(value as Output);
    };

    // Override parseAsync to apply transformation
    const originalParseAsync = newSchema.parseAsync.bind(newSchema);
    newSchema.parseAsync = async (value: unknown): Promise<NewOutput> => {
      await originalParseAsync(value);
      return fn(value as Output);
    };

    return newSchema;
  }

  // Main validation methods
  parse(value: unknown): Output {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    const issues = this._runSyncValidators(value);
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

  // Async validation methods
  async parseAsync(value: unknown): Promise<Output> {
    const syncIssues = this._runSyncValidators(value);
    const asyncIssues = await this._runAsyncValidators(value);
    const allIssues = [...syncIssues, ...asyncIssues];

    if (allIssues.length) throw new ValidationError(allIssues);
    return value as Output;
  }

  async safeParseAsync(value: unknown): Promise<ParseResult<Output>> {
    try {
      return { data: await this.parseAsync(value), success: true };
    } catch (error) {
      return { error: error as ValidationError, success: false };
    }
  }

  refine(check: (value: Output) => boolean | Promise<boolean>, message = 'Invalid value'): this {
    // Detect if check is an async function by checking its constructor name
    // Async functions have constructor.name === 'AsyncFunction'
    if (check.constructor.name === 'AsyncFunction') {
      return this.refineAsync(check, message);
    }

    // Sync function - add to sync validators
    return this._clone([
      ...this._validators,
      (value, path) => ((check(value as Output) as boolean) ? null : [{ message, path }]),
    ]);
  }

  refineAsync(check: (value: Output) => Promise<boolean> | boolean, message = 'Invalid value'): this {
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

  // Modifiers
  optional(): this & Schema<Output | undefined> {
    const parentValidators = this._validators;
    return this._clone([
      (value, path) => {
        if (value === undefined) return null;
        const issues = this._runValidatorList(value, path, parentValidators);
        return issues.length ? issues : null;
      },
    ]) as this & Schema<Output | undefined>;
  }

  required(message = 'Required'): this {
    return this._clone([
      (value, path) => (value !== undefined && value !== null ? null : [{ code: 'required', message, path }]),
      ...this._validators,
    ]);
  }

  nullable(): this & Schema<Output | null> {
    const parentValidators = this._validators;
    return this._clone([
      (value, path) => {
        if (value === null) return null;
        const issues = this._runValidatorList(value, path, parentValidators);
        return issues.length ? issues : null;
      },
    ]) as this & Schema<Output | null>;
  }

  default(defaultValue: Output): this {
    const parentValidators = this._validators;
    const cloned = this._clone([
      (value, path) => {
        const val = value === undefined ? defaultValue : value;
        const issues = this._runValidatorList(val, path, parentValidators);
        return issues.length ? issues : null;
      },
    ]);

    // Override parse to return the transformed value
    const originalParse = cloned.parse.bind(cloned);
    cloned.parse = (value: unknown): Output => {
      const val = value === undefined ? defaultValue : value;
      originalParse(val);
      return val as Output;
    };

    return cloned;
  }

  protected _clone(validators: ValidateFn[]): this {
    // Create a new instance using Object.create to preserve a prototype
    const cloned = Object.create(Object.getPrototypeOf(this));
    // Copy all enumerable own properties from the parent
    Object.assign(cloned, this);
    // Override validators with new ones
    cloned._validators = validators;
    cloned._asyncValidators = [...this._asyncValidators];
    // Preserve description
    if (this._description) cloned._description = this._description;
    return cloned;
  }
}

/* ============================================
   Primitive Schemas
   ============================================ */

export class StringSchema extends Schema<string> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'string'
          ? null
          : [{ code: 'invalid_type', message: 'Expected string', params: { expected: 'string' }, path }],
    ]);
  }

  min(length: number, message = `Must be at least ${length} characters`): this {
    return this._addValidator((value) => typeof value === 'string' && value.length >= length, 'too_small', message, {
      minimum: length,
      type: 'string',
    });
  }

  max(length: number, message = `Must be at most ${length} characters`): this {
    return this._addValidator((value) => typeof value === 'string' && value.length <= length, 'too_big', message, {
      maximum: length,
      type: 'string',
    });
  }

  length(exact: number, message = `Must be exactly ${exact} characters`): this {
    return this._addValidator(
      (value) => typeof value === 'string' && value.length === exact,
      'invalid_length',
      message,
      { exact, type: 'string' },
    );
  }

  pattern(regex: RegExp, message = 'Invalid format'): this {
    return this._addValidator((value) => typeof value === 'string' && regex.test(value), 'invalid_string', message, {
      pattern: regex.source,
    });
  }

  email(message = 'Invalid email address'): this {
    return this._addValidator(
      (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      'invalid_email',
      message,
    );
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

  trim(): StringSchema {
    // Note: trim() creates a schema that expects already-trimmed input
    // It doesn't transform the value, just validates it's trimmed
    return this.refine((val) => val === val.trim(), 'String must be trimmed');
  }
}

export class NumberSchema extends Schema<number> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'number' && !Number.isNaN(value)
          ? null
          : [{ code: 'invalid_type', message: 'Expected number', params: { expected: 'number' }, path }],
    ]);
  }

  min(minimum: number, message = `Must be at least ${minimum}`): this {
    return this._addValidator((value) => typeof value === 'number' && value >= minimum, 'too_small', message, {
      minimum,
      type: 'number',
    });
  }

  max(maximum: number, message = `Must be at most ${maximum}`): this {
    return this._addValidator((value) => typeof value === 'number' && value <= maximum, 'too_big', message, {
      maximum,
      type: 'number',
    });
  }

  int(message = 'Must be an integer'): this {
    return this._addValidator(
      (value) => typeof value === 'number' && Number.isInteger(value),
      'invalid_type',
      message,
      { expected: 'integer' },
    );
  }

  positive(message = 'Must be positive'): this {
    return this.min(0, message);
  }

  negative(message = 'Must be negative'): this {
    return this.max(0, message);
  }
}

export class BooleanSchema extends Schema<boolean> {
  constructor() {
    super([(value, path) => (typeof value === 'boolean' ? null : [{ message: 'Expected boolean', path }])]);
  }
}

export class DateSchema extends Schema<Date> {
  constructor() {
    super([
      (value, path) =>
        value instanceof Date && !Number.isNaN(value.getTime()) ? null : [{ message: 'Expected valid date', path }],
    ]);
  }

  min(date: Date, message = `Must be after ${date.toISOString()}`): this {
    return this._clone([
      ...this._validators,
      (value, path) => (value instanceof Date && value >= date ? null : [{ message, path }]),
    ]);
  }

  max(date: Date, message = `Must be before ${date.toISOString()}`): this {
    return this._clone([
      ...this._validators,
      (value, path) => (value instanceof Date && value <= date ? null : [{ message, path }]),
    ]);
  }
}

/* ============================================
   Literal & Enum Schemas
   ============================================ */

export class LiteralSchema<T extends string | number | boolean> extends Schema<T> {
  constructor(value: T) {
    super([(val, path) => (val === value ? null : [{ message: `Expected ${JSON.stringify(value)}`, path }])]);
  }
}

export class EnumSchema<T extends readonly [string | number, ...(string | number)[]]> extends Schema<T[number]> {
  constructor(values: T) {
    const set = new Set(values);
    super([
      (value, path) =>
        set.has(value as T[number]) ? null : [{ message: `Expected one of: ${values.join(', ')}`, path }],
    ]);
  }
}

/* ============================================
   Complex Schemas
   ============================================ */

export type ArrayOptions = {
  parallel?: boolean;
};

export class ArraySchema<T> extends Schema<T[]> {
  private readonly itemSchema: Schema<T>;
  private readonly parallel: boolean;

  constructor(itemSchema: Schema<T>, options: ArrayOptions = {}) {
    const { parallel = false } = options;

    super([
      (value, path) => {
        if (!Array.isArray(value)) {
          return [{ code: 'invalid_type', message: 'Expected array', params: { expected: 'array' }, path }];
        }

        // Sequential validation for sync parse()
        const issues: Issue[] = [];
        for (let i = 0; i < value.length; i++) {
          const result = itemSchema.safeParse(value[i]);
          if (!result.success) {
            issues.push(
              ...result.error.issues.map((issue) => ({
                ...issue,
                path: [...path, i, ...issue.path],
              })),
            );
          }
        }
        return issues.length ? issues : null;
      },
    ]);

    this.itemSchema = itemSchema;
    this.parallel = parallel;
  }

  // Override parseAsync to support parallel validation
  override async parseAsync(value: unknown): Promise<T[]> {
    if (!Array.isArray(value)) {
      throw new ValidationError([
        { code: 'invalid_type', message: 'Expected array', params: { expected: 'array' }, path: [] },
      ]);
    }

    // Validate items using strategy (parallel or sequential)
    const itemIssues = await this._validateArrayItems(value, this.itemSchema, this.parallel);

    // Run parent async validators
    const parentIssues = await this._runAsyncValidators(value);

    const allIssues = [...itemIssues, ...parentIssues];
    if (allIssues.length) throw new ValidationError(allIssues);
    return value;
  }

  min(length: number, message = `Must have at least ${length} items`): this {
    return this._addValidator((value) => Array.isArray(value) && value.length >= length, 'too_small', message, {
      minimum: length,
      type: 'array',
    });
  }

  max(length: number, message = `Must have at most ${length} items`): this {
    return this._addValidator((value) => Array.isArray(value) && value.length <= length, 'too_big', message, {
      maximum: length,
      type: 'array',
    });
  }

  length(exact: number, message = `Must have exactly ${exact} items`): this {
    return this._addValidator((value) => Array.isArray(value) && value.length === exact, 'invalid_length', message, {
      exact,
      type: 'array',
    });
  }

  nonempty(message = 'Must not be empty'): this {
    return this.min(1, message);
  }
}

type ObjectShape = Record<string, Schema<any>>;
type InferObject<T extends ObjectShape> = { [K in keyof T]: Infer<T[K]> };

export class ObjectSchema<T extends ObjectShape> extends Schema<InferObject<T>> {
  private readonly shape: T;

  constructor(shape: T) {
    super([
      (value, path) => {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
          return [{ message: 'Expected object', path }];
        }
        const issues: Issue[] = [];
        for (const key in shape) {
          const result = shape[key].safeParse((value as any)[key]);
          if (!result.success) {
            issues.push(
              ...result.error.issues.map((issue) => ({
                ...issue,
                path: [...path, key, ...issue.path],
              })),
            );
          }
        }
        return issues.length ? issues : null;
      },
    ]);
    this.shape = shape;
  }

  // Override parseAsync to support async validators in child schemas
  override async parseAsync(value: unknown): Promise<InferObject<T>> {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      throw new ValidationError([{ message: 'Expected object', path: [] }]);
    }

    // Validate properties
    const propIssues = await this._validateProperties(value as Record<string, unknown>);

    // Run parent async validators
    const parentIssues = await this._runAsyncValidators(value);

    const allIssues = [...propIssues, ...parentIssues];
    if (allIssues.length) throw new ValidationError(allIssues);
    return value as InferObject<T>;
  }

  private async _validateProperties(value: Record<string, unknown>): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const key in this.shape) {
      const result = await this.shape[key].safeParseAsync(value[key]);
      if (!result.success) {
        issues.push(...this._mapIssuesWithPath(result.error.issues, key));
      }
    }

    return issues;
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

export class UnionSchema<T extends readonly Schema<any>[]> extends Schema<Infer<T[number]>> {
  private readonly schemas: T;

  constructor(schemas: T) {
    super([
      (value, path) => {
        for (const schema of schemas) {
          const result = schema.safeParse(value);
          if (result.success) return null;
        }
        return [{ message: 'Does not match any union type', path }];
      },
    ]);
    this.schemas = schemas;
  }

  // Override parseAsync to support async validators in union schemas
  override async parseAsync(value: unknown): Promise<Infer<T[number]>> {
    // Try each schema until one succeeds
    for (const schema of this.schemas) {
      const result = await schema.safeParseAsync(value);
      if (result.success) {
        // Found match, run parent async validators
        const parentIssues = await this._runAsyncValidators(value);
        if (parentIssues.length) throw new ValidationError(parentIssues);
        return result.data;
      }
    }

    // None matched
    throw new ValidationError([{ message: 'Does not match any union type', path: [] }]);
  }
}

/* ============================================
   Type Inference
   ============================================ */

export type Infer<T> = T extends Schema<infer U> ? U : never;

/* ============================================
   Factory Functions (Public API)
   ============================================ */

export const v = {
  any: () => new Schema([]),
  array: <T>(schema: Schema<T>, options?: ArrayOptions) => new ArraySchema(schema, options),
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
        (value, path) => {
          if (typeof value === 'string') return null;
          if (value == null) return [{ code: 'invalid_type', message: 'Expected string', path }];
          return null;
        },
      ]).transform((val) => String(val)),
  },
  date: () => new DateSchema(),
  email: () => new StringSchema().email(),
  literal: <T extends string | number | boolean>(value: T) => new LiteralSchema(value),
  negativeInt: () => new NumberSchema().int().negative(),
  null: () => new LiteralSchema(null as any),
  number: () => new NumberSchema(),
  object: <T extends ObjectShape>(shape: T) => new ObjectSchema(shape),
  oneOf: <T extends readonly [string | number, ...(string | number)[]]>(...values: T) => new EnumSchema(values),
  positiveInt: () => new NumberSchema().int().positive(),
  string: () => new StringSchema(),
  undefined: () => new LiteralSchema(undefined as any),
  union: <T extends readonly [Schema<any>, Schema<any>, ...Schema<any>[]]>(...schemas: T) => new UnionSchema(schemas),
  unknown: () => new Schema([]),
  url: () => new StringSchema().url(),
  uuid: () =>
    new StringSchema().pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID'),
  void: () => new LiteralSchema(undefined as any),
};
