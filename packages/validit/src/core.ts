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

export type Issue = {
  code: ErrorCode | (string & {});
  message: string;
  params?: Record<string, unknown>;
  path: (string | number)[];
};

/** A validator function. May return issues synchronously or as a Promise for async validation. */
export type ValidateFn = (value: unknown, path: (string | number)[]) => Issue[] | null | Promise<Issue[] | null>;

type Preprocessor = (value: unknown) => unknown;
type Postprocessor = (value: unknown) => unknown;

type PreparedInput = { skip: true; value: null | undefined } | { skip: false; value: unknown };

export type CheckContext = { addIssue: (issue: Omit<Issue, 'path'> & { path?: (string | number)[] }) => void };

/**
 * Return type for `.check()` callbacks.
 *
 * - `void | null | undefined | true` — validation passed
 * - `false` — validation failed; uses the default "Invalid value" message
 * - `string` — validation failed; the string becomes the error message
 *
 * Use `ctx.addIssue()` for structured errors with custom codes and params.
 */
export type CheckFnResult = void | null | undefined | boolean | string;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== 'object') return false;

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function resolveIssuePath(basePath: (string | number)[], issuePath?: (string | number)[]): (string | number)[] {
  return issuePath === undefined ? basePath : [...basePath, ...issuePath];
}

function materializeValue<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => materializeValue(item)) as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (value instanceof Map) {
    const out = new Map<unknown, unknown>();

    for (const [key, mapValue] of value.entries()) {
      out.set(materializeValue(key), materializeValue(mapValue));
    }

    return out as T;
  }

  if (value instanceof Set) {
    return new Set([...value.values()].map((item) => materializeValue(item))) as T;
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      out[key] = materializeValue(entry);
    }

    return out as T;
  }

  // Preserve unsupported runtime objects (functions, class instances, DOM handles, etc.)
  // without throwing. Users can pass factories for stricter per-call construction.
  return value;
}

interface SchemaState<TOutput = unknown> {
  /**
   * Framework-defined validators passed to the constructor (type checks, coercions).
   * Always run first, sequentially, with early-exit on invalid_type.
   */
  coreValidators: ValidateFn[];
  /**
   * User-added validators from _addValidator() — constraint methods (.min, .max, .email…)
   * and .check() callbacks. Run after coreValidators pass.
   * In async contexts these run in parallel.
   */
  validators: ValidateFn[];
  postprocessors: Postprocessor[];
  preprocessors: Preprocessor[];
  isOptional: boolean;
  isNullable: boolean;
  description?: string;
  defaultValue?: () => TOutput;
  catch?: () => TOutput;
}

function defaultState<TOutput>(): SchemaState<TOutput> {
  return {
    coreValidators: [],
    isNullable: false,
    isOptional: false,
    postprocessors: [],
    preprocessors: [],
    validators: [],
  };
}

function cloneState<TOutput>(state: SchemaState<TOutput>): SchemaState<TOutput> {
  return {
    catch: state.catch,
    coreValidators: [...state.coreValidators],
    defaultValue: state.defaultValue,
    description: state.description,
    isNullable: state.isNullable,
    isOptional: state.isOptional,
    postprocessors: [...state.postprocessors],
    preprocessors: [...state.preprocessors],
    validators: [...state.validators],
  };
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

function normalizeCheckResult(result: CheckFnResult, path: (string | number)[], ctxIssues: Issue[]): Issue[] | null {
  const issues = [...ctxIssues];

  if (result === false) {
    issues.push({ code: ErrorCode.custom, message: _messages().check.default(), path });
  } else if (typeof result === 'string') {
    issues.push({ code: ErrorCode.custom, message: result, path });
  }

  return issues.length ? issues : null;
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
   * Returns flat field/form error maps ready for form UIs.
   * `fieldErrors` keys are full dotted paths (e.g. `"address.zip"`).
   * Fields may have multiple errors.
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

  /**
   * Like `flatten()` but keeps only the first error per field.
   * Convenient for single-error-per-field form UIs.
   */
  flattenFirst(): { fieldErrors: Record<string, string>; formErrors: string[] } {
    const { fieldErrors, formErrors } = this.flatten();

    return {
      fieldErrors: Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0]!])),
      formErrors,
    };
  }

  /** Returns a nested error tree keyed by issue path segments, with `_errors` at each node. */
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

        if (!node[key]) {
          node[key] = { _errors: [] };
        }

        node = node[key] as FormattedErrors;
      }

      node._errors.push(issue.message);
    }

    return root;
  }
}

export type ParseResult<T> = { data: T; success: true } | { error: ValidationError; success: false };

export type FormattedErrors = {
  _errors: string[];
  [key: string]: FormattedErrors | string[];
};

/* -------------------- Base Schema -------------------- */

export class Schema<Output = unknown, Input = Output> {
  protected state: SchemaState<Output>;

  constructor(coreValidators: ValidateFn[] = []) {
    this.state = {
      ...defaultState<Output>(),
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

  /**
   * Adds a custom validation step.
   *
   * The callback receives the typed value and a `ctx` object.
   * Return `void`/`null`/`undefined`/`true` to pass.
   * Return `false` to fail with the default message.
   * Return a `string` to fail with that string as the message.
   * Use `ctx.addIssue()` for structured errors with custom codes and params.
   *
   * Async callbacks (or callbacks returning a Promise) are supported
   * but require `parseAsync()` / `safeParseAsync()`.
   *
   * @example
   * // Inline condition
   * v.string().check(s => s.startsWith('http') || 'Must start with http')
   *
   * // Async check
   * v.string().check(async (id) => await exists(id) || 'Not found')
   *
   * // Structured error via ctx
   * v.string().check((s, ctx) => { ctx.addIssue({ code: 'custom', message: '...' }) })
   */
  check(fn: (value: Output, ctx: CheckContext) => CheckFnResult | Promise<CheckFnResult>): this {
    const validator: ValidateFn = (value, path) => {
      const ctxIssues: Issue[] = [];
      const ctx: CheckContext = {
        addIssue: (issue) => {
          ctxIssues.push({ ...issue, path: resolveIssuePath(path, issue.path) });
        },
      };

      const result = fn(value as Output, ctx);

      if (result instanceof Promise) {
        return result.then((r) => normalizeCheckResult(r, path, ctxIssues));
      }

      return normalizeCheckResult(result, path, ctxIssues);
    };

    return this._addValidator(validator);
  }

  /** Allows undefined. */
  optional(): Schema<Output | undefined, Input | undefined> {
    const cloned = this._clone() as unknown as Schema<Output | undefined, Input | undefined>;

    cloned.state.isOptional = true;

    return cloned;
  }

  /** Allows null. */
  nullable(): Schema<Output | null, Input | null> {
    const cloned = this._clone() as unknown as Schema<Output | null, Input | null>;

    cloned.state.isNullable = true;

    return cloned;
  }

  /** Allows both null and undefined. */
  nullish(): Schema<Output | null | undefined, Input | null | undefined> {
    const cloned = this._clone() as unknown as Schema<Output | null | undefined, Input | null | undefined>;

    cloned.state.isOptional = true;
    cloned.state.isNullable = true;

    return cloned;
  }

  /** Removes undefined from the output type (reverses optional). */
  required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>> {
    const cloned = this._clone() as unknown as Schema<Exclude<Output, undefined>, Exclude<Input, undefined>>;

    cloned.state.isOptional = false;

    return cloned;
  }

  /**
   * Supplies a value when input is `undefined`.
   * Non-function values are materialized per parse call to avoid shared mutable references.
   */
  default(defaultValue: Output | (() => Output)): this {
    const cloned = this._clone();

    cloned.state.defaultValue =
      typeof defaultValue === 'function' ? (defaultValue as () => Output) : () => materializeValue(defaultValue);

    return cloned;
  }

  /**
   * Returns a fallback value on ANY validation failure instead of throwing.
   * Non-function values are materialized per failure to avoid shared mutable references.
   */
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

  /** Prepend a transformation step before validation. */
  preprocess(fn: (value: unknown) => unknown): this {
    const cloned = this._clone();

    cloned.state.preprocessors.push(fn);

    return cloned;
  }

  /** Attach a description for documentation or tooling generation. */
  describe(description: string): this {
    const cloned = this._clone();

    cloned.state.description = description;

    return cloned;
  }

  /** Read-only description attached via `.describe()`. */
  get description(): string | undefined {
    return this.state.description;
  }

  /** Create a branded type (zero runtime cost). */
  brand<Brand extends string>(): Schema<Output & { __brand: Brand }, Input> {
    return this as unknown as Schema<Output & { __brand: Brand }, Input>;
  }

  /** Mark output as readonly at type level (no runtime cost). */
  readonly(): Schema<Readonly<Output>, Input> {
    return this as unknown as Schema<Readonly<Output>, Input>;
  }

  /** Type guard — narrows value to Output using safeParse. */
  is(value: unknown): value is Output {
    return this.safeParse(value).success;
  }

  protected _withCatch<T>(fn: () => T): T {
    if (!this.state.catch) return fn();

    try {
      return fn();
    } catch (error) {
      if (ValidationError.is(error)) return this.state.catch() as unknown as T;

      throw error;
    }
  }

  protected async _withCatchAsync<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.state.catch) return fn();

    try {
      return await fn();
    } catch (error) {
      if (ValidationError.is(error)) return this.state.catch() as unknown as T;

      throw error;
    }
  }

  private _prepareInput(value: unknown): PreparedInput {
    // Preprocessors run first on the raw input, then defaults fill in remaining undefineds.
    const processed = this._runPreprocessors(value);
    const withDefault = processed === undefined && this.state.defaultValue ? this.state.defaultValue() : processed;

    if ((this.state.isOptional && withDefault === undefined) || (this.state.isNullable && withDefault === null)) {
      return { skip: true, value: withDefault };
    }

    return { skip: false, value: withDefault };
  }

  protected _runPreprocessors(value: unknown): unknown {
    let current = value;

    for (const preprocess of this.state.preprocessors) {
      current = preprocess(current);
    }

    return current;
  }

  protected _runPostprocessors(value: unknown): unknown {
    let current = value;

    for (const postprocess of this.state.postprocessors) {
      current = postprocess(current);
    }

    return current;
  }

  private _runSyncValidators(value: unknown): Issue[] {
    const issues: Issue[] = [];

    for (const validate of [...this.state.coreValidators, ...this.state.validators]) {
      const result = validate(value, []);

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

    // Core validators (type checks) run first, sequentially, with early-exit.
    for (const validate of this.state.coreValidators) {
      const result = await validate(value, []);

      if (result) {
        issues.push(...result);

        if (result.some((i: Issue) => i.code === ErrorCode.invalid_type)) return issues;
      }
    }

    // User validators (constraints + check() callbacks) run in parallel once type is confirmed.
    if (this.state.validators.length > 0) {
      const results = await Promise.all(this.state.validators.map((fn) => fn(value, [])));

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

  protected _copyStateTo<T extends Schema<any>>(target: T): T {
    target.state = cloneState(this.state) as SchemaState<any>;

    return target;
  }

  protected _clone(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this, {
      state: cloneState(this.state),
    });
  }
}

/* -------------------- Type Inference -------------------- */

export type InferOutput<T> = T extends Schema<infer O> ? O : never;

/** Infers the accepted input type for a schema (differs from output for coercing schemas). */
export type InferInput<T> = T extends Schema<any, infer I> ? I : never;

/** Alias for InferOutput — infers the validated output type of a schema. */
export type Infer<T> = InferOutput<T>;
