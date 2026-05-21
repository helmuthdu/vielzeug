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

export type SchemaConstraints = {
  contentEncoding?: string;
  exclusiveMaximum?: number;
  exclusiveMinimum?: number;
  format?: string;
  maximum?: number;
  maxItems?: number;
  maxLength?: number;
  minimum?: number;
  minItems?: number;
  minLength?: number;
  multipleOf?: number;
  pattern?: string;
};

export type StringConstraints = Pick<
  SchemaConstraints,
  'contentEncoding' | 'format' | 'maxLength' | 'minLength' | 'pattern'
>;

export type NumberConstraints = Pick<
  SchemaConstraints,
  'exclusiveMaximum' | 'exclusiveMinimum' | 'maximum' | 'minimum' | 'multipleOf'
>;

export type ArrayConstraints = Pick<SchemaConstraints, 'maxItems' | 'minItems'>;

export type SchemaMeta<TConstraints extends object = SchemaConstraints> = {
  constraints?: Partial<TConstraints>;
  typeHint?: 'integer';
};

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
  | { code: 'invalid_string'; message: string; params: { format?: string; includes?: string; pattern?: string; prefix?: string; suffix?: string }; path: (string | number)[] }
  | { code: 'invalid_type'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_union'; message: string; params: { errors: Issue[][] }; path: (string | number)[] }
  | { code: 'invalid_unique'; message: string; params: { unique: true }; path: (string | number)[] }
  | { code: 'invalid_url'; message: string; params: { format: string }; path: (string | number)[] }
  | { code: 'invalid_variant'; message: string; params: { discriminator: string; expected: string[] }; path: (string | number)[] }
  | { code: 'too_big'; message: string; params: { exclusive?: boolean; max: number | bigint | Date }; path: (string | number)[] }
  | { code: 'too_small'; message: string; params: { exclusive?: boolean; min: number | bigint | Date }; path: (string | number)[] }
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
  addIssue: (issue: { code: string; message: string; params?: Record<string, unknown>; path?: (string | number)[] }) => void;
};

export type CheckFnResult = void | null | undefined | boolean | string;

export type FlatError = { messages: string[]; path: (string | number)[] };
export type FlatErrorFirst = { message: string; path: (string | number)[] };

/**
 * Visitor map for schema.walk(). Container handlers receive already-walked children (type R).
 * Provide `unknown` as a catch-all fallback for unrecognised schema kinds.
 */
export type SchemaWalker<R> = {
  any?: (schema: AnySchema) => R;
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
  record?: (schema: AnySchema, key: R, value: R) => R;
  set?: (schema: AnySchema, item: R) => R;
  string?: (schema: AnySchema) => R;
  tuple?: (schema: AnySchema, items: R[], rest: R | null) => R;
  union?: (schema: AnySchema, branches: R[]) => R;
  unknown?: (schema: AnySchema) => R;
  variant?: (schema: AnySchema, branches: Record<string, R>) => R;
};

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

export interface SchemaState<TOutput = unknown, TConstraints extends object = never> {
  coreValidators: ValidateFn[];
  validators: ValidateFn[];
  postprocessors: Postprocessor[];
  preprocessors: Preprocessor[];
  isOptional: boolean;
  isNullable: boolean;
  description?: string;
  meta?: SchemaMeta<TConstraints>;
  patternAmbiguous: boolean;
  defaultValue?: () => TOutput;
  catch?: () => TOutput;
}

function defaultState<TOutput, TConstraints extends object>(): SchemaState<TOutput, TConstraints> {
  return {
    coreValidators: [],
    isNullable: false,
    isOptional: false,
    patternAmbiguous: false,
    postprocessors: [],
    preprocessors: [],
    validators: [],
  };
}

function cloneState<TOutput, TConstraints extends object>(
  state: SchemaState<TOutput, TConstraints>,
): SchemaState<TOutput, TConstraints> {
  return {
    catch: state.catch,
    coreValidators: [...state.coreValidators],
    defaultValue: state.defaultValue,
    description: state.description,
    isNullable: state.isNullable,
    isOptional: state.isOptional,
    meta: state.meta
      ? {
          constraints: state.meta.constraints ? { ...state.meta.constraints } : undefined,
          typeHint: state.meta.typeHint,
        }
      : undefined,
    patternAmbiguous: state.patternAmbiguous,
    postprocessors: [...state.postprocessors],
    preprocessors: [...state.preprocessors],
    validators: [...state.validators],
  };
}

/* R4: Table-driven mergeConstraints */
const LOWER_BOUNDS = ['minimum', 'exclusiveMinimum', 'minLength', 'minItems'] as const;
const UPPER_BOUNDS = ['maximum', 'exclusiveMaximum', 'maxLength', 'maxItems'] as const;
const DIRECT_KEYS = ['contentEncoding', 'format', 'multipleOf'] as const;

function mergeConstraints(
  current: SchemaConstraints | undefined,
  incoming: Partial<SchemaConstraints>,
  patternAmbiguous: boolean,
): { constraints: SchemaConstraints | undefined; patternAmbiguous: boolean } {
  let changed = false;
  const merged: SchemaConstraints = current ? { ...current } : {};
  let nextPatternAmbiguous = patternAmbiguous;

  for (const key of LOWER_BOUNDS) {
    const value = incoming[key];
    if (value !== undefined) {
      const prev = merged[key];
      const next = prev === undefined ? value : Math.max(prev, value);
      if (prev !== next) { merged[key] = next; changed = true; }
    }
  }

  for (const key of UPPER_BOUNDS) {
    const value = incoming[key];
    if (value !== undefined) {
      const prev = merged[key];
      const next = prev === undefined ? value : Math.min(prev, value);
      if (prev !== next) { merged[key] = next; changed = true; }
    }
  }

  for (const key of DIRECT_KEYS) {
    const value = incoming[key];
    if (value !== undefined && merged[key] !== value) {
      (merged as Record<string, unknown>)[key] = value;
      changed = true;
    }
  }

  if (incoming.pattern !== undefined) {
    if (nextPatternAmbiguous) {
      // keep unset once ambiguity detected
    } else if (merged.pattern === undefined) {
      merged.pattern = incoming.pattern;
      changed = true;
    } else if (merged.pattern !== incoming.pattern) {
      delete merged.pattern;
      nextPatternAmbiguous = true;
      changed = true;
      console.warn(
        '[validit] Multiple .regex() constraints detected on a single string schema. ' +
          'JSON Schema `pattern` cannot represent multiple patterns and will be omitted from schema() output.',
      );
    }
  }

  if (!changed) return { constraints: current, patternAmbiguous: nextPatternAmbiguous };
  return { constraints: merged, patternAmbiguous: nextPatternAmbiguous };
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

  constructor(issues: Issue[]) {
    super(formatIssues(issues));
    this.name = 'ValidationError';
    this.issues = issues;
  }

  static is(value: unknown): value is ValidationError {
    return value instanceof ValidationError;
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

export class Schema<Output = unknown, Input = Output, TConstraints extends object = SchemaConstraints> {
  protected state: SchemaState<Output, TConstraints>;

  constructor(coreValidators: ValidateFn[] = []) {
    this.state = {
      ...defaultState<Output, TConstraints>(),
      coreValidators: [...coreValidators],
    };
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

  *parseEach(items: Iterable<unknown>): Generator<ParseResult<Output>> {
    for (const item of items) yield this.safeParse(item);
  }

  async *parseEachAsync(items: Iterable<unknown> | AsyncIterable<unknown>): AsyncGenerator<ParseResult<Output>> {
    for await (const item of items) yield await this.safeParseAsync(item);
  }

  check(fn: (value: Output, ctx: CheckContext) => CheckFnResult | Promise<CheckFnResult>): this {
    /* F5: dev-mode warning for async check functions used with sync parse */
    if (fn.constructor?.name === 'AsyncFunction') {
      console.warn(
        '[validit] An async function was passed to check(). Calls to .parse() or .safeParse() will throw at runtime. ' +
          'Use parseAsync() or safeParseAsync() for schemas with async validators.',
      );
    }

    /* R2: validator receives only value, no path */
    const validator: ValidateFn = (value) => {
      const ctxIssues: Issue[] = [];
      const ctx: CheckContext = {
        addIssue: (issue) => {
          ctxIssues.push({ ...issue, path: issue.path ?? [] } as Issue);
        },
      };
      const result = fn(value as Output, ctx);
      if (result instanceof Promise) return result.then((r) => normalizeCheckResult(r, ctxIssues));
      return normalizeCheckResult(result, ctxIssues);
    };

    return this._addValidator(validator);
  }

  /* F2: optional/nullable/nullish return typed wrapper schemas preserving subtype */
  optional(): OptionalSchema<this> {
    return new OptionalSchema(this);
  }

  nullable(): NullableSchema<this> {
    return new NullableSchema(this);
  }

  nullish(): NullishSchema<this> {
    return new NullishSchema(this);
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
    cloned.state.catch =
      typeof fallback === 'function' ? (fallback as () => Output) : () => materializeValue(fallback);
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

  pipe<B>(next: Schema<B, NoInfer<Output>, any>): Schema<B, Input> {
    return new PipeSchema<B, Input>(this, next);
  }

  describe(description: string): this {
    const cloned = this._clone();
    cloned.state.description = description;
    return cloned;
  }

  get description(): string | undefined { return this.state.description; }
  get isOptional(): boolean { return this.state.isOptional; }
  get isNullable(): boolean { return this.state.isNullable; }
  get meta(): SchemaMeta<TConstraints> | undefined { return this.state.meta; }

  brand<Brand extends string>(): Schema<Output & { __brand: Brand }, Input> {
    return this as unknown as Schema<Output & { __brand: Brand }, Input>;
  }

  is(value: unknown): value is Output {
    return this.safeParse(value).success;
  }

  /**
   * Returns a JSON Schema (2020-12) representation of this schema.
   * Unrepresentable schemas (Date, Map, Set, instanceof, lazy) emit `{ $comment: '...' }`.
   */
  schema(): JsonSchema {
    const base = this._toSchemaBase();
    let result = base;
    if (this.state.isNullable) result = { anyOf: [base, { type: 'null' }] };
    if (this.state.description) result = { ...result, description: this.state.description };
    return result;
  }

  /**
   * Traverse this schema tree with a typed visitor.
   * Container visitors receive already-walked children as the last argument(s).
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

  /* R2: validate(value) — no path arg */
  private _runSyncValidators(value: unknown): Issue[] {
    const issues: Issue[] = [];

    for (const validate of this.state.coreValidators) {
      const result = validate(value);
      if (result instanceof Promise) {
        throw new Error(
          'A check() callback returned a Promise in a sync parse context. Use parseAsync() or safeParseAsync() for async validation.',
        );
      }
      if (result) {
        issues.push(...result);
        if (result.some((i: Issue) => i.code === ErrorCode.invalid_type)) return issues;
      }
    }

    for (const validate of this.state.validators) {
      const result = validate(value);
      if (result instanceof Promise) {
        throw new Error(
          'A check() callback returned a Promise in a sync parse context. Use parseAsync() or safeParseAsync() for async validation.',
        );
      }
      if (result) {
        issues.push(...result);
        if (result.some((i: Issue) => i.code === ErrorCode.invalid_type)) break;
      }
    }

    return issues;
  }

  protected async _runAllValidators(value: unknown): Promise<Issue[]> {
    const issues: Issue[] = [];

    for (const validate of this.state.coreValidators) {
      const result = await validate(value);
      if (result) {
        issues.push(...result);
        if (result.some((i: Issue) => i.code === ErrorCode.invalid_type)) return issues;
      }
    }

    if (this.state.validators.length > 0) {
      const results = await Promise.all(this.state.validators.map((fn) => fn(value)));
      for (const result of results) {
        if (result) issues.push(...result);
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

  /* R3: typeHint merged in as optional param — _addValidatorWithTypeHint removed */
  protected _addValidatorWithConstraints(
    validator: ValidateFn,
    constraints: Partial<TConstraints>,
    typeHint?: 'integer',
  ): this {
    const cloned = this._clone();
    cloned.state.validators.push(validator);

    const merged = mergeConstraints(
      cloned.state.meta?.constraints as SchemaConstraints | undefined,
      constraints as Partial<SchemaConstraints>,
      cloned.state.patternAmbiguous,
    );
    const mergedConstraints = merged.constraints as Partial<TConstraints> | undefined;
    cloned.state.patternAmbiguous = merged.patternAmbiguous;

    const nextTypeHint = typeHint ?? cloned.state.meta?.typeHint;
    if (mergedConstraints === undefined && nextTypeHint === undefined) {
      cloned.state.meta = undefined;
    } else {
      cloned.state.meta = { constraints: mergedConstraints, typeHint: nextTypeHint };
    }

    return cloned;
  }

  protected _copyStateTo<T extends Schema<any, any, any>>(target: T): T {
    target.state = cloneState(this.state) as SchemaState<any, any>;
    return target;
  }

  protected _construct(state: SchemaState<any, any>): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this, { state }) as this;
  }

  protected _clone(): this {
    return this._construct(cloneState(this.state));
  }

  /** Override in concrete schemas to return kind-specific JSON Schema. */
  protected _toSchemaBase(): JsonSchema {
    return {};
  }

  /** Override in concrete schemas for walk() dispatch. */
  protected _walk<R>(visitor: SchemaWalker<R>): R {
    const fallback = visitor.unknown ?? visitor.any;
    if (fallback) return fallback(this);
    throw new Error('[validit] walk(): no handler matched and no `unknown` fallback provided.');
  }

  /**
   * Override in concrete schemas for structural equality beyond base checks.
   * The default compares constraint metadata only. custom check() validators are NOT compared.
   */
  protected _equalsImpl(other: AnySchema): boolean {
    return (
      JSON.stringify(this.state.meta?.constraints) === JSON.stringify(other.state.meta?.constraints) &&
      this.state.meta?.typeHint === other.state.meta?.typeHint
    );
  }
}

/* -------------------- Type Inference -------------------- */

export type AnySchema = Schema<unknown, unknown, any>;
export type InferOutput<T> = T extends Schema<infer O> ? O : never;
export type InferInput<T> = T extends Schema<any, infer I> ? I : never;
export type Infer<T> = InferOutput<T>;

/* -------------------- Optional / Nullable Wrappers (F2) -------------------- */

/**
 * Preserves the inner schema type through optional wrapping.
 * Created by `schema.optional()`. Unwrap with `.required()`.
 *
 * @example
 * ```ts
 * const s = v.string().min(3).optional();
 * // s: OptionalSchema<StringSchema> — inner StringSchema accessible for introspection
 * s.required(); // StringSchema (no new allocation)
 * ```
 */
export class OptionalSchema<T extends AnySchema> extends Schema<InferOutput<T> | undefined, InferInput<T> | undefined> {
  readonly inner: T;

  constructor(inner: T) {
    super([]);
    this.inner = inner;
    this.state.isOptional = true;
  }

  // Returns inner so the OptionalSchema wrapper is removed.
  // Cast is safe: inner's output/input types are a subtype of the base required() signature.
  override required(): Schema<Exclude<InferOutput<T> | undefined, undefined>, Exclude<InferInput<T> | undefined, undefined>> {
    return this.inner as unknown as Schema<Exclude<InferOutput<T> | undefined, undefined>, Exclude<InferInput<T> | undefined, undefined>>;
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
    return (this.inner as unknown as OptionalSchema<T>)._toSchemaBase();
  }

  protected override _walk<R>(visitor: SchemaWalker<R>): R {
    if (visitor.optional) return visitor.optional(this, this.inner.walk(visitor));
    return super._walk(visitor);
  }

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof OptionalSchema)) return false;
    return this.inner.equals(other.inner);
  }

  protected override _construct(state: SchemaState<any, any>): this {
    const next = new OptionalSchema(this.inner) as this;
    next.state = state as any;
    return next;
  }
}

/** Preserves the inner schema type through nullable wrapping. Created by `schema.nullable()`. */
export class NullableSchema<T extends AnySchema> extends Schema<InferOutput<T> | null, InferInput<T> | null> {
  readonly inner: T;

  constructor(inner: T) {
    super([]);
    this.inner = inner;
    this.state.isNullable = true;
  }

  // Returns inner so the NullableSchema wrapper is removed.
  override required(): Schema<Exclude<InferOutput<T> | null, undefined>, Exclude<InferInput<T> | null, undefined>> {
    return this.inner as unknown as Schema<Exclude<InferOutput<T> | null, undefined>, Exclude<InferInput<T> | null, undefined>>;
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
    return (this.inner as unknown as NullableSchema<T>)._toSchemaBase();
  }

  protected override _walk<R>(visitor: SchemaWalker<R>): R {
    if (visitor.nullable) return visitor.nullable(this, this.inner.walk(visitor));
    return super._walk(visitor);
  }

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof NullableSchema)) return false;
    return this.inner.equals(other.inner);
  }

  protected override _construct(state: SchemaState<any, any>): this {
    const next = new NullableSchema(this.inner) as this;
    next.state = state as any;
    return next;
  }
}

/** Preserves the inner schema type through nullish wrapping. Created by `schema.nullish()`. */
export class NullishSchema<T extends AnySchema> extends Schema<
  InferOutput<T> | null | undefined,
  InferInput<T> | null | undefined
> {
  readonly inner: T;

  constructor(inner: T) {
    super([]);
    this.inner = inner;
    this.state.isOptional = true;
    this.state.isNullable = true;
  }

  override required(): Schema<Exclude<InferOutput<T> | null | undefined, undefined>, Exclude<InferInput<T> | null | undefined, undefined>> {
    return this.inner as unknown as Schema<Exclude<InferOutput<T> | null | undefined, undefined>, Exclude<InferInput<T> | null | undefined, undefined>>;
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
    return (this.inner as unknown as NullishSchema<T>)._toSchemaBase();
  }

  protected override _walk<R>(visitor: SchemaWalker<R>): R {
    if (visitor.nullish) return visitor.nullish(this, this.inner.walk(visitor));
    return super._walk(visitor);
  }

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof NullishSchema)) return false;
    return this.inner.equals(other.inner);
  }

  protected override _construct(state: SchemaState<any, any>): this {
    const next = new NullishSchema(this.inner) as this;
    next.state = state as any;
    return next;
  }
}

/* -------------------- Pipe Schema -------------------- */

class PipeSchema<Output, Input> extends Schema<Output, Input> {
  private readonly _from: AnySchema;
  private readonly _to: AnySchema;

  constructor(from: AnySchema, to: AnySchema) {
    super([]);
    this._from = from;
    this._to = to;
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const r1 = this._from.safeParse(value);
    if (!r1.success) return { data: value, issues: r1.error.issues };
    const r2 = this._to.safeParse(r1.data as unknown);
    if (!r2.success) return { data: value, issues: r2.error.issues };
    return { data: r2.data, issues: [] };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const r1 = await this._from.safeParseAsync(value);
    if (!r1.success) return { data: value, issues: r1.error.issues };
    const r2 = await this._to.safeParseAsync(r1.data as unknown);
    if (!r2.success) return { data: value, issues: r2.error.issues };
    return { data: r2.data, issues: [] };
  }

  protected override _construct(state: SchemaState<any, any>): this {
    const next = new PipeSchema<Output, Input>(this._from, this._to) as this;
    next.state = state as SchemaState<Output, SchemaConstraints>;
    return next;
  }
}
