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
  not_safe: 'not_safe',
  not_unique: 'not_unique',
  too_big: 'too_big',
  too_small: 'too_small',
  unrecognized_keys: 'unrecognized_keys',
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

export type ValidateFn = (value: unknown, path: (string | number)[]) => Issue[] | null;
export type AsyncValidateFn = (value: unknown, path: (string | number)[]) => Promise<Issue[] | null>;

type Preprocessor = (value: unknown) => unknown;
type Postprocessor = (value: unknown) => unknown;

type PipeStep =
  | { fn: AsyncValidateFn; type: 'async' }
  | { fn: ValidateFn; type: 'core' }
  | { fn: Postprocessor; type: 'post' }
  | { fn: Preprocessor; type: 'pre' }
  | { fn: ValidateFn; type: 'user' };

interface SchemaState {
  pipe: PipeStep[];
  isOptional: boolean;
  isNullable: boolean;
  description?: string;
  defaultValue?: () => any;
  catch?: () => any;
}

function defaultState(): SchemaState {
  return {
    isNullable: false,
    isOptional: false,
    pipe: [],
  };
}

function cloneState(state: SchemaState): SchemaState {
  return {
    catch: state.catch,
    defaultValue: state.defaultValue,
    description: state.description,
    isNullable: state.isNullable,
    isOptional: state.isOptional,
    pipe: [...state.pipe],
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

  /** Like flatten() but returns only the first error per field for form UIs. */
  flattenFirst(): { fieldErrors: Record<string, string>; formErrors: string[] } {
    const { fieldErrors, formErrors } = this.flatten();

    return {
      fieldErrors: Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v[0]])),
      formErrors,
    };
  }
}

export type ParseResult<T> = { data: T; success: true } | { error: ValidationError; success: false };

/* -------------------- Base Schema -------------------- */

export class Schema<Output = unknown> {
  protected state: SchemaState;

  constructor(coreValidators: ValidateFn[] = []) {
    this.state = {
      ...defaultState(),
      pipe: coreValidators.map((fn) => ({ fn, type: 'core' as const })),
    };
  }

  parse(value: unknown): Output {
    if (this._hasAsyncValidators()) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const prepared = this._prepareInput(value);

      if (prepared.done) return prepared.value as Output;

      // Phase 3: Core validation
      const core = this._parseValueSync(prepared.value);
      const hasInvalidTypeIssue = core.issues.some((issue) => issue.code === ErrorCode.invalid_type);

      // Phase 4: User validators
      const userIssues = !hasInvalidTypeIssue ? this._runUserValidators(core.data) : [];
      const allIssues = [...core.issues, ...userIssues];

      if (allIssues.length) throw new ValidationError(allIssues);

      // Phase 5: Postprocess
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

      if (prepared.done) return prepared.value as Output;

      const core = await this._parseValueAsync(prepared.value);
      const hasInvalidTypeIssue = core.issues.some((issue) => issue.code === ErrorCode.invalid_type);

      const canRunUserValidators = !hasInvalidTypeIssue;
      const syncIssues = canRunUserValidators ? this._runUserValidators(core.data) : [];
      const asyncIssues = canRunUserValidators ? await this._runAsyncValidators(core.data) : [];
      const allIssues = [...core.issues, ...syncIssues, ...asyncIssues];

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

  /** Sync-only custom validator. Throws at first parse if given an async function. */
  refine(
    check: (value: Output) => boolean,
    message: MessageFn<{ value: Output }> = () => _messages().refine.default(),
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
    message: MessageFn<{ value: Output }> = () => _messages().refine.default(),
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
    const cloned = this._clone();

    cloned.state.defaultValue =
      typeof defaultValue === 'function' ? (defaultValue as () => Output) : () => defaultValue;

    return cloned;
  }

  /** Returns a fallback value on ANY validation failure instead of throwing. */
  catch(fallback: Output | (() => Output)): this {
    const cloned = this._clone();

    cloned.state.catch = typeof fallback === 'function' ? (fallback as () => Output) : () => fallback;

    return cloned;
  }

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput> {
    const next = this._clone() as unknown as Schema<NewOutput>;

    next.state.pipe.push({ fn: fn as (v: unknown) => unknown, type: 'post' });

    return next;
  }

  private _prepareInput(value: unknown): { done: boolean; value: unknown } {
    const withDefault = value === undefined && this.state.defaultValue ? this.state.defaultValue() : value;
    const processed = this._runPreprocessors(withDefault);

    if (this.state.isOptional && processed === undefined) return { done: true, value: processed };

    if (this.state.isNullable && processed === null) return { done: true, value: processed };

    return { done: false, value: processed };
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

    cloned.state.pipe.push({ fn, type: 'pre' });

    return cloned;
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

  private _hasAsyncValidators(): boolean {
    return this.state.pipe.some((step) => step.type === 'async');
  }

  protected _runPreprocessors(value: unknown): unknown {
    return this.state.pipe.reduce((current, step) => {
      if (step.type === 'pre') return step.fn(current);

      return current;
    }, value);
  }

  protected _runPostprocessors(value: unknown): unknown {
    return this.state.pipe.reduce((current, step) => {
      if (step.type === 'post') return step.fn(current);

      return current;
    }, value);
  }

  private _runValidators(validators: ValidateFn[], value: unknown, stopOnInvalidType: boolean): Issue[] {
    const issues: Issue[] = [];

    for (const validate of validators) {
      const result = validate(value, []);

      if (result) {
        issues.push(...result);

        if (stopOnInvalidType && result.some((i: Issue) => i.code === ErrorCode.invalid_type)) break;
      }
    }

    return issues;
  }

  private _collectValidators(type: 'core' | 'user'): ValidateFn[] {
    const validators: ValidateFn[] = [];

    for (const step of this.state.pipe) {
      if (step.type === type) validators.push(step.fn);
    }

    return validators;
  }

  protected _runUserValidators(value: unknown): Issue[] {
    return this._runValidators(this._collectValidators('user'), value, false);
  }

  protected _runCoreValidators(value: unknown): Issue[] {
    return this._runValidators(this._collectValidators('core'), value, true);
  }

  protected async _runAsyncValidators(value: unknown): Promise<Issue[]> {
    const validators = this.state.pipe
      .filter((step): step is Extract<PipeStep, { type: 'async' }> => step.type === 'async')
      .map((step) => step.fn);

    const results = await Promise.all(validators.map((fn) => fn(value, [])));

    return results.flatMap((r: Issue[] | null) => r ?? []);
  }

  protected _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    return { data: value, issues: this._runCoreValidators(value) };
  }

  protected async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    return this._parseValueSync(value);
  }

  protected _addCoreValidator(validator: ValidateFn): this {
    const cloned = this._clone();

    cloned.state.pipe.push({ fn: validator, type: 'core' });

    return cloned;
  }

  protected _addUserValidator(validator: ValidateFn): this {
    const cloned = this._clone();

    cloned.state.pipe.push({ fn: validator, type: 'user' });

    return cloned;
  }

  protected _addAsyncValidator(fn: AsyncValidateFn): this {
    const cloned = this._clone();

    cloned.state.pipe.push({ fn, type: 'async' });

    return cloned;
  }

  protected _copyStateTo<T extends Schema<any>>(target: T): T {
    target.state = cloneState(this.state);

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

/** Alias for InferOutput — infers the output type of a schema. */
export type Infer<T> = InferOutput<T>;

/** Alias for InferOutput — aligns with common schema-library naming. */
export type TypeOf<T> = InferOutput<T>;
