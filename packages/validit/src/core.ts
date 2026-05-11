import { _messages } from './messages';

/* -------------------- Error Codes -------------------- */

export const ErrorCode = {
  custom: 'custom',
  invalid_base64: 'invalid_base64',
  invalid_bigint: 'invalid_bigint',
  invalid_date: 'invalid_date',
  invalid_duration: 'invalid_duration',
  invalid_enum: 'invalid_enum',
  invalid_length: 'invalid_length',
  invalid_literal: 'invalid_literal',
  invalid_string: 'invalid_string',
  invalid_type: 'invalid_type',
  invalid_union: 'invalid_union',
  invalid_url: 'invalid_url',
  invalid_variant: 'invalid_variant',
  not_finite: 'not_finite',
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

type PreparedInput = { skip: true; value: null | undefined } | { skip: false; value: unknown };

interface SchemaState {
  asyncValidators: AsyncValidateFn[];
  coreValidators: ValidateFn[];
  postprocessors: Postprocessor[];
  preprocessors: Preprocessor[];
  userValidators: ValidateFn[];
  isOptional: boolean;
  isNullable: boolean;
  description?: string;
  defaultValue?: () => any;
  catch?: () => any;
}

function defaultState(): SchemaState {
  return {
    asyncValidators: [],
    coreValidators: [],
    isNullable: false,
    isOptional: false,
    postprocessors: [],
    preprocessors: [],
    userValidators: [],
  };
}

function cloneState(state: SchemaState): SchemaState {
  return {
    asyncValidators: [...state.asyncValidators],
    catch: state.catch,
    coreValidators: [...state.coreValidators],
    defaultValue: state.defaultValue,
    description: state.description,
    isNullable: state.isNullable,
    isOptional: state.isOptional,
    postprocessors: [...state.postprocessors],
    preprocessors: [...state.preprocessors],
    userValidators: [...state.userValidators],
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
        const existing = node[key];

        if (!existing || Array.isArray(existing)) {
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
  protected state: SchemaState;

  constructor(coreValidators: ValidateFn[] = []) {
    this.state = {
      ...defaultState(),
      coreValidators: [...coreValidators],
    };
  }

  parse(value: unknown): Output {
    if (this._hasAsyncValidators()) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as Output;

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

      if (prepared.skip) return prepared.value as Output;

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
    return this.superRefine((value, ctx) => {
      const result: unknown = check(value);

      if (result instanceof Promise) {
        throw new Error('refine() only accepts sync functions. Use refineAsync() for async validation.');
      }

      if (!result) {
        ctx.addIssue({ code: ErrorCode.custom, message: resolveMessage(message, { value }) });
      }
    });
  }

  /** Async custom validator — deferred to parseAsync(). */
  refineAsync(
    check: (value: Output) => Promise<boolean>,
    message: MessageFn<{ value: Output }> = () => _messages().refine.default(),
  ): this {
    return this.superRefineAsync(async (value, ctx) => {
      const ok = await check(value as Output);

      if (!ok) {
        ctx.addIssue({ code: ErrorCode.custom, message: resolveMessage(message, { value: value as Output }) });
      }
    });
  }

  /** Sync multi-issue validator with full path/code control. */
  superRefine(
    check: (
      value: Output,
      ctx: { addIssue: (issue: Omit<Issue, 'path'> & { path?: (string | number)[] }) => void },
    ) => void,
  ): this {
    return this._addUserValidator((value, path) => {
      const issues: Issue[] = [];
      const ctx = {
        addIssue: (issue: Omit<Issue, 'path'> & { path?: (string | number)[] }) => {
          issues.push({ ...issue, path: issue.path ?? path });
        },
      };

      check(value as Output, ctx);

      return issues.length ? issues : null;
    });
  }

  /** Async multi-issue validator with full path/code control. */
  superRefineAsync(
    check: (
      value: Output,
      ctx: { addIssue: (issue: Omit<Issue, 'path'> & { path?: (string | number)[] }) => void },
    ) => Promise<void>,
  ): this {
    return this._addAsyncValidator(async (value, path) => {
      const issues: Issue[] = [];
      const ctx = {
        addIssue: (issue: Omit<Issue, 'path'> & { path?: (string | number)[] }) => {
          issues.push({ ...issue, path: issue.path ?? path });
        },
      };

      await check(value as Output, ctx);

      return issues.length ? issues : null;
    });
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

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput, Input> {
    const next = this._clone() as unknown as Schema<NewOutput, Input>;

    next.state.postprocessors.push(fn as (v: unknown) => unknown);

    return next;
  }

  private _prepareInput(value: unknown): PreparedInput {
    const withDefault = value === undefined && this.state.defaultValue ? this.state.defaultValue() : value;
    const processed = this._runPreprocessors(withDefault);

    if ((this.state.isOptional && processed === undefined) || (this.state.isNullable && processed === null)) {
      return { skip: true, value: processed };
    }

    return { skip: false, value: processed };
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

  /** Prepend a transformation step before validation. */
  preprocess(fn: (value: unknown) => unknown): this {
    const cloned = this._clone();

    cloned.state.preprocessors.push(fn);

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
    return this.state.asyncValidators.length > 0;
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

  protected _runUserValidators(value: unknown): Issue[] {
    return this._runValidators(this.state.userValidators, value, false);
  }

  protected _runCoreValidators(value: unknown): Issue[] {
    return this._runValidators(this.state.coreValidators, value, true);
  }

  protected async _runAsyncValidators(value: unknown): Promise<Issue[]> {
    const results = await Promise.all(this.state.asyncValidators.map((fn) => fn(value, [])));

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

/** Infers the accepted input type for a schema. */
export type InferInput<T> = T extends Schema<any, infer I> ? I : never;

/** Alias for InferOutput — infers the output type of a schema. */
export type Infer<T> = InferOutput<T>;

/** Alias for InferOutput — aligns with common schema-library naming. */
export type TypeOf<T> = InferOutput<T>;
