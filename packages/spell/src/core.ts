import { _messages } from './messages';

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

/* -------------------- Core Types -------------------- */

export type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> = string | ((ctx: Ctx) => string);

/** Plain JSON Schema object (targeting JSON Schema 2020-12). */
export type JsonSchema = Record<string, unknown>;

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
 * Path prepending is the container schema's responsibility, not the validator's.
 */
export type ValidateFn = (value: unknown) => Issue[] | null | Promise<Issue[] | null>;

type Preprocessor = (value: unknown) => unknown;
type Postprocessor = (value: unknown) => unknown;

type PreparedInput = { skip: true; value: null | undefined } | { skip: false; value: unknown };

export type CheckContext = {
  addIssue: (issue: {
    code: string;
    message: string;
    params?: Record<string, unknown>;
    path?: (string | number)[];
  }) => void;
};

export type CheckFnResult = void | null | undefined | boolean | string;

export type FlatError = { messages: string[]; path: (string | number)[] };
export type FlatErrorFirst = { message: string; path: (string | number)[] };

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

/* -------------------- Schema Descriptor (typed introspection) -------------------- */

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

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== 'object') return false;

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function materializeValue<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;

  if (Array.isArray(value)) return value.map((item) => materializeValue(item)) as T;

  if (value instanceof Date) return new Date(value.getTime()) as T;

  if (value instanceof Map) {
    const out = new Map<unknown, unknown>();

    for (const [key, mapValue] of value.entries()) out.set(materializeValue(key), materializeValue(mapValue));

    return out as T;
  }

  if (value instanceof Set) return new Set([...value.values()].map((item) => materializeValue(item))) as T;

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) out[key] = materializeValue(entry);

    return out as T;
  }

  return value;
}

export interface SchemaState<Output = unknown> {
  validators: ValidateFn[];
  postprocessors: Postprocessor[];
  preprocessors: Preprocessor[];
  isOptional: boolean;
  isNullable: boolean;
  description?: string;
  defaultValue?: () => Output;
  catch?: () => Output;
}

function defaultState<Output>(): SchemaState<Output> {
  return {
    isNullable: false,
    isOptional: false,
    postprocessors: [],
    preprocessors: [],
    validators: [],
  };
}

function cloneState<Output>(state: SchemaState<Output>): SchemaState<Output> {
  return {
    catch: state.catch,
    defaultValue: state.defaultValue,
    description: state.description,
    isNullable: state.isNullable,
    isOptional: state.isOptional,
    postprocessors: [...state.postprocessors],
    preprocessors: [...state.preprocessors],
    validators: [...state.validators],
  };
}

/**
 * Creates a single-issue failure array. Use in validator functions instead of building the array manually.
 */
export function fail(code: string, message: string, params?: Record<string, unknown>): Issue[] {
  return [{ code, message, params, path: [] } as Issue];
}

export function resolveMessage<Ctx extends Record<string, unknown>>(msg: MessageFn<Ctx>, ctx: Ctx): string {
  return typeof msg === 'function' ? msg(ctx) : msg;
}

export function prependIssuePath(issues: Issue[], prefix: string | number): Issue[] {
  return issues.map((issue) => ({ ...issue, path: [prefix, ...issue.path] }));
}

function formatIssues(issues: Issue[]): string {
  return issues
    .map(({ code, message, path }) => {
      const pathStr = path.length ? path.join('.') : 'value';

      return `${pathStr}: ${message} [${code}]`;
    })
    .join('\n');
}

/* R2: no path param — always uses path: [] */
function normalizeCheckResult(result: CheckFnResult, ctxIssues: Issue[]): Issue[] | null {
  const issues = [...ctxIssues];

  if (result === false) issues.push({ code: ErrorCode.custom, message: _messages().check.default(), path: [] });
  else if (typeof result === 'string') issues.push({ code: ErrorCode.custom, message: result, path: [] });

  return issues.length ? issues : null;
}

export class ValidationError extends Error {
  readonly issues: Issue[];

  constructor(issues: Issue[], cause?: unknown) {
    super(formatIssues(issues), { cause });
    this.name = 'ValidationError';
    this.issues = issues;
  }

  static is(value: unknown): value is ValidationError {
    return value instanceof ValidationError;
  }

  /**
   * Returns the union branch errors from the most-specific failing branch.
   * When parsing against a union, this surfaces the branch with the fewest issues
   * at the deepest path — the branch that "came closest" to matching.
   */
  bestMatch(): Issue[] | null {
    const unionIssue = this.issues.find(
      (i): i is Extract<Issue, { code: 'invalid_union' }> => i.code === ErrorCode.invalid_union,
    );

    if (!unionIssue) return null;

    const branches = unionIssue.params.errors;

    if (branches.length === 0) return null;

    // Score: prefer branches with deeper errors (more fields parsed) and fewer issues
    const scored = branches.map((branchIssues) => {
      const maxDepth = branchIssues.reduce((d, i) => Math.max(d, i.path.length), 0);

      return { issues: branchIssues, score: maxDepth * 1000 - branchIssues.length };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored[0]!.issues;
  }

  flatten(): { fieldErrors: FlatError[]; formErrors: string[] } {
    const fieldErrors: FlatError[] = [];
    const formErrors: string[] = [];
    const pathMap = new Map<string, number>();

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        formErrors.push(issue.message);
      } else {
        const key = JSON.stringify(issue.path);
        const existing = pathMap.get(key);

        if (existing !== undefined) {
          fieldErrors[existing].messages.push(issue.message);
        } else {
          pathMap.set(key, fieldErrors.length);
          fieldErrors.push({ messages: [issue.message], path: [...issue.path] });
        }
      }
    }

    return { fieldErrors, formErrors };
  }

  flattenFirst(): { fieldErrors: FlatErrorFirst[]; formErrors: string[] } {
    const { fieldErrors, formErrors } = this.flatten();

    return {
      fieldErrors: fieldErrors.map((fe) => ({ message: fe.messages[0]!, path: fe.path })),
      formErrors,
    };
  }

  format(): FormattedErrors {
    const root: FormattedErrors = { _errors: [] };

    for (const issue of this.issues) {
      if (issue.path.length === 0) {
        root._errors.push(issue.message);
        continue;
      }

      let node = root;

      for (const segment of issue.path) {
        const key = String(segment);

        if (!node[key]) node[key] = { _errors: [] };

        node = node[key] as FormattedErrors;
      }

      node._errors.push(issue.message);
    }

    return root;
  }
}

export function errorsAt(formatted: FormattedErrors, ...path: (string | number)[]): string[] {
  let node: FormattedErrors | string[] = formatted;

  for (const key of path) {
    if (Array.isArray(node)) return [];

    node = (node as FormattedErrors)[String(key)] ?? { _errors: [] };
  }

  return Array.isArray(node) ? node : (node as FormattedErrors)._errors;
}

export type ParseResult<T> = { data: T; success: true } | { error: ValidationError; success: false };

export type FormattedErrors = {
  _errors: string[];
  [key: string]: FormattedErrors | string[];
};

/* -------------------- Base Schema -------------------- */

/** Module-level WeakMap for memoizing schema() JSON Schema output. */
const _schemaCache = new WeakMap<object, JsonSchema>();

export class Schema<Output = unknown, Input = Output> {
  protected state: SchemaState<Output>;
  /**
   * JSON Schema annotation fields populated by constraint methods (min, max, pattern, etc.).
   * Subclasses access this in `_toSchemaBase()` and `_describeImpl()` to build schema output.
   * Use `_addConstraint()` to atomically add a validator and update annotations.
   */
  protected _annotations: Record<string, unknown> = {};

  constructor(typeValidator?: ValidateFn) {
    this.state = defaultState<Output>();

    if (typeValidator) this.state.validators.push(typeValidator);
  }

  parse(value: unknown): Output {
    return this._withCatch(() => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as Output;

      const core = this._parseValueSync(prepared.value);
      const hasInvalidType = core.issues.some((i) => i.code === ErrorCode.invalid_type && i.path.length === 0);
      const validationIssues = !hasInvalidType ? this._runSyncValidators(core.data) : [];
      const allIssues = [...core.issues, ...validationIssues];

      if (allIssues.length) throw new ValidationError(allIssues);

      return this._runPostprocessors(core.data) as Output;
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
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as Output;

      const core = await this._parseValueAsync(prepared.value);
      const hasInvalidType = core.issues.some((i) => i.code === ErrorCode.invalid_type && i.path.length === 0);
      const validationIssues = !hasInvalidType ? await this._runAllValidators(core.data) : [];
      const allIssues = [...core.issues, ...validationIssues];

      if (allIssues.length) throw new ValidationError(allIssues);

      return this._runPostprocessors(core.data) as Output;
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

  /**
   * Adds a synchronous validator. Two overload forms:
   *
   * **Predicate form** — pass a boolean-returning function and an optional error message.
   * This replaces the old `refine()` method.
   * ```ts
   * s.string().check(v => v.includes('@'), 'Must contain @')
   * ```
   *
   * **Context form** — full access to `ctx.addIssue()` for multi-issue, path-aware validation.
   * ```ts
   * s.object({ a: s.string(), b: s.string() }).check((d, ctx) => {
   *   if (d.a === d.b) ctx.addIssue({ code: 'custom', message: 'Must differ', path: ['a'] });
   * })
   * ```
   *
   * For async validators, use `checkAsync()` instead.
   */
  check(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this;
  check(fn: (value: Output, ctx: CheckContext) => CheckFnResult): this;
  check(
    fn: ((value: Output, ctx: CheckContext) => CheckFnResult) | ((value: Output) => boolean),
    message?: MessageFn<{ value: Output }>,
  ): this {
    if (message !== undefined) {
      // Predicate form (replaces refine())
      const predicate = fn as (value: Output) => boolean;

      return this._addValidator((value) => {
        if (predicate(value as Output)) return null;

        return fail(ErrorCode.custom, resolveMessage(message, { value: value as Output }));
      });
    }

    const checkFn = fn as (value: Output, ctx: CheckContext) => CheckFnResult;
    const validator: ValidateFn = (value) => {
      const ctxIssues: Issue[] = [];
      const ctx: CheckContext = {
        addIssue: (issue) => {
          ctxIssues.push({ ...issue, path: issue.path ?? [] } as Issue);
        },
      };
      const result = checkFn(value as Output, ctx);

      if ((result as unknown) instanceof Promise) {
        throw new Error('check() callback returned a Promise. Use checkAsync() for async validation.');
      }

      return normalizeCheckResult(result, ctxIssues);
    };

    return this._addValidator(validator);
  }

  /**
   * Adds an async validator. The schema must be used with `parseAsync()` / `safeParseAsync()`.
   *
   * ```ts
   * const schema = s.string().checkAsync(async (v) => {
   *   const exists = await db.users.exists({ email: v });
   *   return exists || 'Email already registered';
   * });
   * await schema.parseAsync('alice@example.com');
   * ```
   */
  checkAsync(fn: (value: Output, ctx: CheckContext) => Promise<CheckFnResult>): this {
    const validator: ValidateFn = (value) => {
      const ctxIssues: Issue[] = [];
      const ctx: CheckContext = {
        addIssue: (issue) => {
          ctxIssues.push({ ...issue, path: issue.path ?? [] } as Issue);
        },
      };

      return fn(value as Output, ctx).then((r) => normalizeCheckResult(r, ctxIssues));
    };

    return this._addValidator(validator);
  }

  /* optional/nullable/nullish return typed wrapper schemas preserving subtype.
     If this schema is already a WrapperSchema, the modes are merged to avoid double-wrapping:
       optional + nullable → nullish, optional + optional → optional, etc. */
  optional(): WrapperSchema<this, 'optional'> {
    if (this instanceof WrapperSchema) {
      const merged = this.mode === 'nullable' || this.mode === 'nullish' ? 'nullish' : 'optional';

      return new WrapperSchema(this.inner, merged) as unknown as WrapperSchema<this, 'optional'>;
    }

    return new WrapperSchema(this, 'optional');
  }

  nullable(): WrapperSchema<this, 'nullable'> {
    if (this instanceof WrapperSchema) {
      const merged = this.mode === 'optional' || this.mode === 'nullish' ? 'nullish' : 'nullable';

      return new WrapperSchema(this.inner, merged) as unknown as WrapperSchema<this, 'nullable'>;
    }

    return new WrapperSchema(this, 'nullable');
  }

  nullish(): WrapperSchema<this, 'nullish'> {
    if (this instanceof WrapperSchema) {
      return new WrapperSchema(this.inner, 'nullish') as unknown as WrapperSchema<this, 'nullish'>;
    }

    return new WrapperSchema(this, 'nullish');
  }

  required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>> {
    const cloned = this._clone() as unknown as Schema<Exclude<Output, undefined>, Exclude<Input, undefined>>;

    cloned.state.isOptional = false;

    return cloned;
  }

  default(defaultValue: Output | (() => Output)): this {
    const cloned = this._clone();

    cloned.state.defaultValue =
      typeof defaultValue === 'function' ? (defaultValue as () => Output) : () => materializeValue(defaultValue);

    return cloned;
  }

  catch(fallback: Output | (() => Output)): this {
    const cloned = this._clone();

    cloned.state.catch = typeof fallback === 'function' ? (fallback as () => Output) : () => materializeValue(fallback);

    return cloned;
  }

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput, Input> {
    const next = this._clone() as unknown as Schema<NewOutput, Input>;

    next.state.postprocessors.push(fn as (v: unknown) => unknown);

    return next;
  }

  preprocess(fn: (value: unknown) => unknown): this {
    const cloned = this._clone();

    cloned.state.preprocessors.push(fn);

    return cloned;
  }

  pipe<B>(next: Schema<B, NoInfer<Output>>): Schema<B, Input> {
    return new PipeSchema<B, Input>(this, next);
  }

  /** @overload Set a human-readable description on this schema (fluent setter). */
  describe(description: string): this;
  /** @overload Return a typed introspection descriptor for this schema. */
  describe(): SchemaDescriptor;
  describe(description?: string): this | SchemaDescriptor {
    if (description !== undefined) {
      const cloned = this._clone();

      cloned.state.description = description;

      return cloned;
    }

    return this._describeImpl();
  }

  /** Override in subclasses to customize introspection output. */
  protected _describeImpl(): SchemaDescriptor {
    return {
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
      kind: 'any',
    };
  }

  get description(): string | undefined {
    return this.state.description;
  }
  get isOptional(): boolean {
    return this.state.isOptional;
  }
  get isNullable(): boolean {
    return this.state.isNullable;
  }

  brand<Brand extends string>(): Schema<Output & { __brand: Brand }, Input> {
    return this as unknown as Schema<Output & { __brand: Brand }, Input>;
  }

  is(value: unknown): value is Output {
    return this.safeParse(value).success;
  }

  /**
   * Returns a JSON Schema (2020-12) representation of this schema.
   * Unrepresentable schemas (Date, Map, Set, instanceof, lazy) emit `{ $comment: '...' }`.
   * Result is memoized — each distinct schema instance caches its output.
   */
  toJsonSchema(): JsonSchema {
    let cached = _schemaCache.get(this);

    if (cached === undefined) {
      const base = this._toSchemaBase();
      let result: JsonSchema = base;

      if (this.state.isNullable) result = { anyOf: [base, { type: 'null' }] };

      if (this.state.description) result = { ...result, description: this.state.description };

      _schemaCache.set(this, result);
      cached = result;
    }

    return cached;
  }

  /**
   * Traverse this schema tree with a typed visitor.
   * Container visitors receive already-walked children as the last argument(s).
   * Throws only if no handler matches AND no `unknown` fallback is provided.
   *
   * @example
   * ```ts
   * const labels = v.object({ name: v.string() }).walk({
   *   object: (_, fields) => Object.keys(fields),
   *   unknown: () => [],
   * });
   * ```
   */
  walk<R>(visitor: SchemaWalker<R>): R {
    return this._walk(visitor);
  }

  /**
   * Structural equality. True if both schemas have the same kind, constraints, and modifiers.
   * Custom check() validators are NOT compared.
   */
  equals(other: AnySchema): boolean {
    if (other === this) return true;

    if (Object.getPrototypeOf(other) !== Object.getPrototypeOf(this)) return false;

    if (other.isOptional !== this.isOptional) return false;

    if (other.isNullable !== this.isNullable) return false;

    if (other.description !== this.description) return false;

    return this._equalsImpl(other);
  }

  /* R5: private — not accessible from subclasses */
  private _withCatch<T>(fn: () => T): T {
    if (!this.state.catch) return fn();

    try {
      return fn();
    } catch (error) {
      if (ValidationError.is(error)) return this.state.catch() as unknown as T;

      throw error;
    }
  }

  private async _withCatchAsync<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.state.catch) return fn();

    try {
      return await fn();
    } catch (error) {
      if (ValidationError.is(error)) return this.state.catch() as unknown as T;

      throw error;
    }
  }

  private _prepareInput(value: unknown): PreparedInput {
    const processed = this._runPreprocessors(value);
    const withDefault = processed === undefined && this.state.defaultValue ? this.state.defaultValue() : processed;

    if ((this.state.isOptional && withDefault === undefined) || (this.state.isNullable && withDefault === null)) {
      return { skip: true, value: withDefault };
    }

    return { skip: false, value: withDefault };
  }

  protected _runPreprocessors(value: unknown): unknown {
    let current = value;

    for (const preprocess of this.state.preprocessors) current = preprocess(current);

    return current;
  }

  protected _runPostprocessors(value: unknown): unknown {
    let current = value;

    for (const postprocess of this.state.postprocessors) current = postprocess(current);

    return current;
  }

  /* R2: validate(value) — single validator array, short-circuit on invalid_type */
  private _runSyncValidators(value: unknown): Issue[] {
    const issues: Issue[] = [];

    for (const validate of this.state.validators) {
      const result = validate(value);

      if (result instanceof Promise) {
        throw new Error('check() callback returned a Promise. Use checkAsync() for async validation.');
      }

      if (result) {
        issues.push(...result);

        if (result.some((i: Issue) => i.code === ErrorCode.invalid_type)) return issues;
      }
    }

    return issues;
  }

  protected async _runAllValidators(value: unknown): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const validate of this.state.validators) {
      const result = await validate(value);

      if (result) {
        issues.push(...result);

        if (result.some((i: Issue) => i.code === ErrorCode.invalid_type)) return issues;
      }
    }

    return issues;
  }

  protected _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    return { data: value, issues: [] };
  }

  protected async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    return this._parseValueSync(value);
  }

  protected _addValidator(validator: ValidateFn): this {
    const cloned = this._clone();

    cloned.state.validators.push(validator);

    return cloned;
  }

  /**
   * Adds a constraint validator and optionally merges JSON Schema annotation fields.
   * Use in concrete schema methods (min, max, email, etc.) instead of manually calling
   * `_addValidator()` + updating annotation fields separately.
   *
   * @example
   * ```ts
   * min(n: number): this {
   *   return this._addConstraint(
   *     (v) => (v as string).length >= n ? null : fail(ErrorCode.too_small, ..., { min: n }),
   *     (ann) => ({ ...ann, minLength: ann.minLength === undefined ? n : Math.max(ann.minLength as number, n) })
   *   );
   * }
   * ```
   */
  protected _addConstraint(
    validator: ValidateFn,
    mergeAnnotations?: (current: Record<string, unknown>) => Record<string, unknown>,
  ): this {
    const next = this._addValidator(validator);

    if (mergeAnnotations) {
      next._annotations = mergeAnnotations({ ...next._annotations });
    }

    return next;
  }

  protected _construct(state: SchemaState<any>): this {
    const next = Object.assign(Object.create(Object.getPrototypeOf(this)), this, { state }) as this;

    next._annotations = { ...this._annotations };

    return next;
  }

  protected _clone(): this {
    return this._construct(cloneState(this.state));
  }

  /** Copy this schema's validators/processors/modifiers onto an already-created target instance. */
  protected _copyStateTo<T extends Schema<any, any>>(target: T): T {
    target.state = cloneState(this.state);

    return target;
  }

  /** Override in concrete schemas to return kind-specific JSON Schema. */
  protected _toSchemaBase(): JsonSchema {
    return {};
  }

  /** Override in concrete schemas for walk() dispatch. */
  protected _walk<R>(visitor: SchemaWalker<R>): R {
    if (visitor.unknown) return visitor.unknown(this);

    throw new Error('[sieve] walk(): no handler matched and no `unknown` fallback provided.');
  }

  /**
   * Override in concrete schemas for structural equality beyond base checks.
   * Returns true by default — subclasses with constraint fields override this.
   * Custom check() validators are NOT compared.
   */
  protected _equalsImpl(_other: AnySchema): boolean {
    return true;
  }
}

/* -------------------- Type Inference -------------------- */

export type AnySchema = Schema<unknown, unknown>;
export type InferOutput<T> = T extends Schema<infer O> ? O : never;
export type InferInput<T> = T extends Schema<any, infer I> ? I : never;
export type Infer<T> = InferOutput<T>;

/* -------------------- Wrapper Schemas (optional / nullable / nullish) -------------------- */

export type WrapperMode = 'nullable' | 'nullish' | 'optional';

type WrapperOutput<T extends AnySchema, Mode extends WrapperMode> = Mode extends 'optional'
  ? InferOutput<T> | undefined
  : Mode extends 'nullable'
    ? InferOutput<T> | null
    : InferOutput<T> | null | undefined;

type WrapperInput<T extends AnySchema, Mode extends WrapperMode> = Mode extends 'optional'
  ? InferInput<T> | undefined
  : Mode extends 'nullable'
    ? InferInput<T> | null
    : InferInput<T> | null | undefined;

/**
 * Single wrapper class replacing the three separate Optional/Nullable/NullishSchema classes.
 * The `mode` field declares which nullability the wrapper adds.
 *
 * @example
 * ```ts
 * const s = v.string().optional(); // WrapperSchema<StringSchema, 'optional'>
 * s.inner; // StringSchema
 * s.mode;  // 'optional'
 * s.required(); // StringSchema
 * ```
 */
export class WrapperSchema<T extends AnySchema, Mode extends WrapperMode> extends Schema<
  WrapperOutput<T, Mode>,
  WrapperInput<T, Mode>
> {
  readonly inner: T;
  readonly mode: Mode;

  constructor(inner: T, mode: Mode) {
    super();
    this.inner = inner;
    this.mode = mode;
    this.state.isOptional = mode === 'optional' || mode === 'nullish';
    this.state.isNullable = mode === 'nullable' || mode === 'nullish';
  }

  override required(): Schema<Exclude<WrapperOutput<T, Mode>, undefined>, Exclude<WrapperInput<T, Mode>, undefined>> {
    // T is the inner schema that already excludes the optional/nullable wrapper.
    // The cast is safe: T extends Schema<InferOutput<T>, InferInput<T>>, and Exclude strips
    // exactly the undefined/null that the WrapperSchema added.
    return this.inner as Schema<Exclude<WrapperOutput<T, Mode>, undefined>, Exclude<WrapperInput<T, Mode>, undefined>>;
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const result = this.inner.safeParse(value);

    return result.success ? { data: result.data, issues: [] } : { data: value, issues: result.error.issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const result = await this.inner.safeParseAsync(value);

    return result.success ? { data: result.data, issues: [] } : { data: value, issues: result.error.issues };
  }

  protected override _toSchemaBase(): JsonSchema {
    return this.inner.toJsonSchema();
  }

  protected override _walk<R>(visitor: SchemaWalker<R>): R {
    const innerR = this.inner.walk(visitor);

    if (this.mode === 'optional' && visitor.optional) return visitor.optional(this, innerR);

    if (this.mode === 'nullable' && visitor.nullable) return visitor.nullable(this, innerR);

    if (this.mode === 'nullish' && visitor.nullish) return visitor.nullish(this, innerR);

    return super._walk(visitor);
  }

  protected override _describeImpl(): SchemaDescriptor {
    const inner = this.inner.describe();

    return {
      ...inner,
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
    };
  }

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof WrapperSchema)) return false;

    return this.mode === other.mode && this.inner.equals(other.inner);
  }
}

/** Type alias — no runtime cost. */
export type OptionalSchema<T extends AnySchema> = WrapperSchema<T, 'optional'>;
/** Type alias — no runtime cost. */
export type NullableSchema<T extends AnySchema> = WrapperSchema<T, 'nullable'>;
/** Type alias — no runtime cost. */
export type NullishSchema<T extends AnySchema> = WrapperSchema<T, 'nullish'>;

/* -------------------- Pipe Schema -------------------- */

/** Schema produced by `.pipe()`. Parses with `from`, then feeds the result into `to`. */
export class PipeSchema<Output, Input> extends Schema<Output, Input> {
  readonly from: AnySchema;
  readonly to: AnySchema;

  constructor(from: AnySchema, to: AnySchema) {
    super();
    this.from = from;
    this.to = to;
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const r1 = this.from.safeParse(value);

    if (!r1.success) return { data: value, issues: r1.error.issues };

    const r2 = this.to.safeParse(r1.data as unknown);

    if (!r2.success) return { data: value, issues: r2.error.issues };

    return { data: r2.data, issues: [] };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const r1 = await this.from.safeParseAsync(value);

    if (!r1.success) return { data: value, issues: r1.error.issues };

    const r2 = await this.to.safeParseAsync(r1.data as unknown);

    if (!r2.success) return { data: value, issues: r2.error.issues };

    return { data: r2.data, issues: [] };
  }

  protected override _toSchemaBase(): JsonSchema {
    return { allOf: [this.from.toJsonSchema(), this.to.toJsonSchema()] };
  }

  protected override _walk<R>(visitor: SchemaWalker<R>): R {
    if (visitor.pipe) return visitor.pipe(this, this.from.walk(visitor), this.to.walk(visitor));

    return super._walk(visitor);
  }

  protected override _describeImpl(): SchemaDescriptor {
    return {
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
      from: this.from.describe(),
      kind: 'pipe',
      to: this.to.describe(),
    };
  }

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof PipeSchema)) return false;

    return this.from.equals(other.from) && this.to.equals(other.to);
  }
}
