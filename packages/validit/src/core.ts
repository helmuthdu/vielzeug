import type { SchemaState } from './core/schema-state';
import type { AsyncValidateFn, ValidateFn } from './core/validation-types';

import { defaultState, cloneState } from './core/schema-state';
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

export type { AsyncValidateFn, ValidateFn };

/* -------------------- Base Schema -------------------- */

export class Schema<Output = unknown> {
  protected state: SchemaState;

  constructor(coreValidators: ValidateFn[] = []) {
    this.state = { ...defaultState(), coreValidators };
  }

  parse(value: unknown): Output {
    if (this.state.asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      // Phase 1: Preprocess
      const processed = this._applyPhase(value, this.state.preprocessors);

      // Phase 2: Nullable/Optional short-circuit
      const short = this._checkNullableOptional(processed);

      if (short.matched) return short.value as Output;

      // Phase 3: Core validation
      const core = this._parseValueSync(processed, []);
      const hasInvalidTypeIssue = core.issues.some((issue) => issue.code === ErrorCode.invalid_type);

      // Phase 4: User validators
      const userIssues = !hasInvalidTypeIssue ? this._runUserValidators(core.data, []) : [];
      const allIssues = [...core.issues, ...userIssues];

      if (allIssues.length) throw new ValidationError(allIssues);

      // Phase 5: Postprocess
      return this._applyPhase(core.data, this.state.postprocessors) as Output;
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
      const processed = this._applyPhase(value, this.state.preprocessors);
      const short = this._checkNullableOptional(processed);

      if (short.matched) return short.value as Output;

      const core = await this._parseValueAsync(processed, []);
      const hasInvalidTypeIssue = core.issues.some((issue) => issue.code === ErrorCode.invalid_type);

      const canRunUserValidators = !hasInvalidTypeIssue;
      const syncIssues = canRunUserValidators ? this._runUserValidators(core.data, []) : [];
      const asyncIssues = canRunUserValidators ? await this._runAsyncValidators(core.data, []) : [];
      const allIssues = [...core.issues, ...syncIssues, ...asyncIssues];

      if (allIssues.length) throw new ValidationError(allIssues);

      return this._applyPhase(core.data, this.state.postprocessors) as Output;
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

  /** Sync-only custom validator. Throws at first parse if given an async function. */
  refine(
    check: (value: Output) => boolean,
    message: MessageFn<{ value: Output }> = () => _messages().refine_default(),
  ): this {
    return this._addUserValidator((value, path) => {
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

    cloned.state.isOptional = true;

    return cloned;
  }

  /** Allows null. */
  nullable(): Schema<Output | null> {
    const cloned = this._clone() as unknown as Schema<Output | null>;

    cloned.state.isNullable = true;

    return cloned;
  }

  /** Allows both null and undefined. */
  nullish(): Schema<Output | null | undefined> {
    const cloned = this._clone() as unknown as Schema<Output | null | undefined>;

    cloned.state.isOptional = true;
    cloned.state.isNullable = true;

    return cloned;
  }

  /** Removes undefined from the output type (reverses optional). */
  required(): Schema<Exclude<Output, undefined>> {
    const cloned = this._clone() as unknown as Schema<Exclude<Output, undefined>>;

    cloned.state.isOptional = false;

    return cloned;
  }

  default(defaultValue: Output | (() => Output)): this {
    const factory = typeof defaultValue === 'function' ? (defaultValue as () => Output) : () => defaultValue;
    const cloned = this._clone();

    cloned.state.preprocessors = [...this.state.preprocessors, (v) => (v === undefined ? factory() : v)];

    return cloned;
  }

  /** Returns a fallback value on ANY validation failure instead of throwing. */
  catch(fallback: Output | (() => Output)): this {
    const cloned = this._clone();

    cloned.state.catch = {
      enabled: true,
      factory: typeof fallback === 'function' ? (fallback as () => Output) : () => fallback,
    };

    return cloned;
  }

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput> {
    const next = new Schema<NewOutput>(this.state.coreValidators);

    next.state = cloneState(this.state);
    next.state.postprocessors.push(fn as (v: any) => any);

    return next;
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
  brand<Brand extends string>(): Schema<Output & { __brand: Brand }> {
    return this as unknown as Schema<Output & { __brand: Brand }>;
  }

  /** Type guard — narrows value to Output using safeParse. */
  is(value: unknown): value is Output {
    return this.safeParse(value).success;
  }

  /** Prepend a transformation step before validation. */
  preprocess(fn: (value: unknown) => unknown): this {
    const cloned = this._clone();

    cloned.state.preprocessors = [fn, ...this.state.preprocessors];

    return cloned;
  }

  protected _withCatch<T>(fn: () => T): T {
    if (!this.state.catch?.enabled) return fn();

    try {
      return fn();
    } catch (error) {
      if (ValidationError.is(error)) return this.state.catch.factory() as unknown as T;

      throw error;
    }
  }

  protected async _withCatchAsync<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.state.catch?.enabled) return fn();

    try {
      return await fn();
    } catch (error) {
      if (ValidationError.is(error)) return this.state.catch.factory() as unknown as T;

      throw error;
    }
  }

  protected _applyPhase(value: unknown, fns: Array<(v: unknown) => unknown>): unknown {
    return fns.reduce((v, fn) => fn(v), value);
  }

  protected _runUserValidators(value: unknown, path: (string | number)[]): Issue[] {
    const issues: Issue[] = [];

    for (const validate of this.state.userValidators) {
      const result = validate(value, path);

      if (result) issues.push(...result);
    }

    return issues;
  }

  protected _runCoreValidators(value: unknown, path: (string | number)[]): Issue[] {
    const issues: Issue[] = [];

    for (const validate of this.state.coreValidators) {
      const result = validate(value, path);

      if (result) {
        issues.push(...result);

        if (result.some((i: Issue) => i.code === ErrorCode.invalid_type)) break;
      }
    }

    return issues;
  }

  protected async _runAsyncValidators(value: unknown, path: (string | number)[]): Promise<Issue[]> {
    if (this.state.isOptional && value === undefined) return [];

    if (this.state.isNullable && value === null) return [];

    const results = await Promise.all(this.state.asyncValidators.map((fn) => fn(value, path)));

    return results.flatMap((r: Issue[] | null) => r ?? []);
  }

  protected _parseValueSync(value: unknown, path: (string | number)[]): { data: unknown; issues: Issue[] } {
    if (this.state.isOptional && value === undefined) return { data: value, issues: [] };

    if (this.state.isNullable && value === null) return { data: value, issues: [] };

    return { data: value, issues: this._runCoreValidators(value, path) };
  }

  protected async _parseValueAsync(
    value: unknown,
    path: (string | number)[],
  ): Promise<{ data: unknown; issues: Issue[] }> {
    return this._parseValueSync(value, path);
  }

  protected _checkNullableOptional(value: unknown): { matched: true; value: unknown } | { matched: false } {
    if (this.state.isOptional && value === undefined) return { matched: true, value };

    if (this.state.isNullable && value === null) return { matched: true, value };

    return { matched: false };
  }

  protected _addCoreValidator(validator: ValidateFn): this {
    const cloned = this._clone();

    cloned.state.coreValidators.push(validator);

    return cloned;
  }

  protected _addUserValidator(validator: ValidateFn): this {
    const cloned = this._clone();

    cloned.state.userValidators.push(validator);

    return cloned;
  }

  protected _addAsyncValidator(fn: AsyncValidateFn): this {
    const cloned = this._clone();

    cloned.state.asyncValidators.push(fn);

    return cloned;
  }

  protected _addPreprocessor(fn: (value: unknown) => unknown): this {
    const cloned = this._clone();

    cloned.state.preprocessors.push(fn);

    return cloned;
  }

  protected _copyStateTo<T extends Schema<any>>(target: T): T {
    target.state = cloneState(this.state);

    return target;
  }

  protected _clone(): this {
    const cloned = Object.create(Object.getPrototypeOf(this)) as this;

    cloned.state = cloneState(this.state);
    // Copy all own properties from this to cloned
    for (const key of Object.getOwnPropertyNames(this)) {
      if (key !== 'state') {
        (cloned as any)[key] = (this as any)[key];
      }
    }

    return cloned;
  }
}

/* -------------------- Type Inference -------------------- */

export type InferOutput<T> = T extends Schema<infer O> ? O : never;

/** Alias for InferOutput — infers the output type of a schema. */
export type Infer<T> = InferOutput<T>;

/** Alias for InferOutput — aligns with common schema-library naming. */
export type TypeOf<T> = InferOutput<T>;
