import { isPlainObject } from '@vielzeug/arsenal/guards';

import { SpellDefinitionError, SpellValidationError } from './errors';
import { createParseContext } from './messages';
import { defineOwnProperty } from './safe-object';
import {
  type AnySchema,
  type CheckContext,
  ErrorCode,
  type FlatError,
  type FlatErrorFirst,
  type Infer,
  type InferInput,
  type InferOutput,
  type InferSchemaMode,
  type Issue,
  type JsonSchema,
  type MergeSchemaModes,
  type MessageFn,
  type Messages,
  type ParseContext,
  type ParseResult,
  type SchemaDefinition,
  type SchemaDescriptor,
  type SchemaMode,
  type SchemaWalker,
  schemaInput,
  schemaMode,
  schemaOutput,
  type ValidateFn,
  type ValidateResult,
} from './types';

export {
  fail,
  prependIssuePath,
  resolveMessage,
  SpellDefinitionError,
  SpellError,
  SpellValidationError,
} from './errors';
export {
  type AnySchema,
  type CheckContext,
  ErrorCode,
  type FlatError,
  type FlatErrorFirst,
  type Infer,
  type InferInput,
  type InferOutput,
  type InferSchemaMode,
  type Issue,
  type JsonSchema,
  type MergeSchemaModes,
  type MessageFn,
  type Messages,
  type ParseContext,
  type ParseResult,
  type SchemaDefinition,
  type SchemaDescriptor,
  type SchemaMode,
  type SchemaWalker,
  schemaMode,
  type ValidateFn,
  type ValidateResult,
};

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;

  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);

  return Object.freeze(value);
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

    for (const [key, entry] of Object.entries(value)) defineOwnProperty(out, key, materializeValue(entry));

    return out as T;
  }

  return value;
}

/* -------------------- Schema State -------------------- */

type Preprocessor = (value: unknown) => unknown;
type Postprocessor = (value: unknown) => unknown;

export interface SchemaState<Output = unknown> {
  catch?: () => Output;
  defaultValue?: () => Output;
  description?: string;
  hasAsyncChecks: boolean;
  hasRuntimeChecks: boolean;
  isNullable: boolean;
  isOptional: boolean;
  postprocessors: Postprocessor[];
  preprocessors: Preprocessor[];
  validators: ValidateFn[];
}

function defaultState<Output>(): SchemaState<Output> {
  return {
    hasAsyncChecks: false,
    hasRuntimeChecks: false,
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
    hasAsyncChecks: state.hasAsyncChecks,
    hasRuntimeChecks: state.hasRuntimeChecks,
    isNullable: state.isNullable,
    isOptional: state.isOptional,
    postprocessors: [...state.postprocessors],
    preprocessors: [...state.preprocessors],
    validators: [...state.validators],
  };
}

/* -------------------- Internal parse-value return type -------------------- */

/** @internal */
export type ParseValue = { data: unknown; issues: Issue[]; typeOk: boolean };

type MaybePromise<T> = T | Promise<T>;

/* -------------------- ParseContext default -------------------- */

/** @internal */
export function _makeCtx(messages?: Messages): ParseContext {
  return messages ? { messages } : createParseContext();
}

/* -------------------- ValidateResult normalizer -------------------- */

function normalizeValidateResult(result: ValidateResult, ctxIssues: Issue[], ctx: ParseContext): Issue[] | null {
  const issues = [...ctxIssues];

  if (typeof result === 'string') {
    issues.push({ code: ErrorCode.custom, message: result, path: [] });
  } else if (result === false && issues.length === 0) {
    issues.push({ code: ErrorCode.custom, message: ctx.messages.check.default(), path: [] });
  }

  return issues.length ? issues : null;
}

/* -------------------- Base Schema -------------------- */

export class Schema<Output = unknown, Input = Output, Mode extends SchemaMode = 'sync'> {
  declare readonly [schemaInput]: Input;
  declare readonly [schemaMode]: Mode;
  declare readonly [schemaOutput]: Output;

  protected state: SchemaState<Output>;

  protected _annotations: Record<string, unknown> = {};

  private _typeValidator: ValidateFn | null = null;

  constructor(typeValidator?: ValidateFn) {
    this.state = defaultState<Output>();
    this._typeValidator = typeValidator ?? null;
  }

  /* -------------------- Parse -------------------- */

  parse(this: Schema<Output, Input, 'sync'>, value: unknown, ctx?: ParseContext): Output;
  parse(value: unknown, ctx?: ParseContext): Output {
    if (this.state.hasAsyncChecks) {
      throw new SpellValidationError([
        { code: ErrorCode.custom, message: 'parse() cannot evaluate async checks. Use parseAsync().', path: [] },
      ]);
    }

    const c = ctx ?? _makeCtx();

    return this._withCatch(() => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as Output;

      const coreOrPromise = this._parse(prepared.value, c);

      if (coreOrPromise instanceof Promise) {
        throw new SpellValidationError([
          {
            code: ErrorCode.custom,
            message: 'parse() received an async schema. Use parseAsync() instead.',
            path: [],
          },
        ]);
      }

      const core = coreOrPromise;
      const validationIssues = core.typeOk ? this._runValidatorsSync(core.data, c) : [];
      const allIssues = [...core.issues, ...validationIssues];

      if (allIssues.length) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(core.data) as Output;
    });
  }

  safeParse(this: Schema<Output, Input, 'sync'>, value: unknown, ctx?: ParseContext): ParseResult<Output>;
  safeParse(value: unknown, ctx?: ParseContext): ParseResult<Output> {
    try {
      return {
        data: (this.parse as unknown as (value: unknown, ctx?: ParseContext) => Output)(value, ctx),
        success: true,
      };
    } catch (error) {
      if (error instanceof SpellValidationError) return { error, success: false };

      throw error;
    }
  }

  async parseAsync(value: unknown, ctx?: ParseContext): Promise<Output> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as Output;

      const core = await this._parse(prepared.value, c);
      const validationIssues = core.typeOk ? await this._runValidatorsAsync(core.data, c) : [];
      const allIssues = [...core.issues, ...validationIssues];

      if (allIssues.length) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(core.data) as Output;
    });
  }

  async safeParseAsync(value: unknown, ctx?: ParseContext): Promise<ParseResult<Output>> {
    try {
      return { data: await this.parseAsync(value, ctx), success: true };
    } catch (error) {
      if (error instanceof SpellValidationError) return { error, success: false };

      throw error;
    }
  }

  /**
   * Internal full parse without throwing. Returns { data, issues }.
   * Used by composite schemas (array, object, union, etc.) to avoid
   * the try/catch + object allocation overhead of safeParse().
   * @internal
   */
  _parseFullSync(value: unknown, ctx?: ParseContext): { data: unknown; issues: Issue[] } {
    if (this.state.hasAsyncChecks) {
      throw new SpellValidationError([
        { code: ErrorCode.custom, message: 'Sync parsing cannot evaluate async checks. Use parseAsync().', path: [] },
      ]);
    }

    const c = ctx ?? _makeCtx();
    const prepared = this._prepareInput(value);

    if (prepared.skip) return { data: prepared.value, issues: [] };

    const coreOrPromise = this._parse(prepared.value, c);

    if (coreOrPromise instanceof Promise) {
      throw new SpellValidationError([
        {
          code: ErrorCode.custom,
          message: 'Sync parse path received an async schema. Use parseAsync() instead.',
          path: [],
        },
      ]);
    }

    const core = coreOrPromise;
    const validationIssues = core.typeOk ? this._runValidatorsSync(core.data, c) : [];
    const allIssues = [...core.issues, ...validationIssues];

    if (allIssues.length > 0) {
      if (this.state.catch) return { data: this.state.catch(), issues: [] };

      return { data: core.data, issues: allIssues };
    }

    return { data: this._runPostprocessors(core.data), issues: [] };
  }

  /**
   * Async version of _parseFullSync.
   * @internal
   */
  async _parseFullAsync(value: unknown, ctx?: ParseContext): Promise<{ data: unknown; issues: Issue[] }> {
    const c = ctx ?? _makeCtx();
    const prepared = this._prepareInput(value);

    if (prepared.skip) return { data: prepared.value, issues: [] };

    const core = await this._parse(prepared.value, c);
    const validationIssues = core.typeOk ? await this._runValidatorsAsync(core.data, c) : [];
    const allIssues = [...core.issues, ...validationIssues];

    if (allIssues.length > 0) {
      if (this.state.catch) return { data: this.state.catch(), issues: [] };

      return { data: core.data, issues: allIssues };
    }

    return { data: this._runPostprocessors(core.data), issues: [] };
  }

  /* -------------------- Validators -------------------- */

  /**
   * Add a synchronous domain rule. For asynchronous work, use `checkAsync()`;
   * making execution mode explicit prevents unchecked Promise-returning callbacks.
   */
  check<F extends (value: Output, ctx: CheckContext) => ValidateResult | Promise<ValidateResult>>(
    fn: ReturnType<F> extends PromiseLike<unknown> ? never : F,
  ): this {
    return this._addCheck(fn as (value: Output, ctx: CheckContext) => ValidateResult, false);
  }

  checkAsync(
    this: Schema<Output, Input, 'sync'>,
    fn: (value: Output, ctx: CheckContext) => Promise<ValidateResult>,
  ): Schema<Output, Input, 'async'> {
    return this._addCheck(fn, true) as unknown as Schema<Output, Input, 'async'>;
  }

  protected _addCheck(
    fn:
      | ((value: Output, ctx: CheckContext) => ValidateResult)
      | ((value: Output, ctx: CheckContext) => Promise<ValidateResult>),
    async: boolean,
  ): this {
    const validator: ValidateFn = (value, ctx) => {
      const ctxIssues: Issue[] = [];
      const checkCtx: CheckContext = {
        addIssue: (issue) => ctxIssues.push({ ...issue, path: issue.path ?? [] } as Issue),
      };
      const result = fn(value as Output, checkCtx);

      if (result instanceof Promise) {
        return result.then((r) => normalizeValidateResult(r, ctxIssues, ctx!));
      }

      return normalizeValidateResult(result, ctxIssues, ctx!);
    };

    const next = this._addConstraint(validator);

    next.state.hasRuntimeChecks = true;

    if (async) next.state.hasAsyncChecks = true;

    return next;
  }

  /* -------------------- Nullability / Optionality -------------------- */

  optional(): Schema<Output | undefined, Input | undefined, Mode> {
    const cloned = this._clone() as unknown as Schema<Output | undefined, Input | undefined, Mode>;

    cloned.state.isOptional = true;

    return cloned;
  }

  nullable(): Schema<Output | null, Input | null, Mode> {
    const cloned = this._clone() as unknown as Schema<Output | null, Input | null, Mode>;

    cloned.state.isNullable = true;

    return cloned;
  }

  nullish(): Schema<Output | null | undefined, Input | null | undefined, Mode> {
    const cloned = this._clone() as unknown as Schema<Output | null | undefined, Input | null | undefined, Mode>;

    cloned.state.isOptional = true;
    cloned.state.isNullable = true;

    return cloned;
  }

  required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>, Mode> {
    const cloned = this._clone() as unknown as Schema<Exclude<Output, undefined>, Exclude<Input, undefined>, Mode>;

    cloned.state.isOptional = false;

    return cloned;
  }

  /* -------------------- Transforms -------------------- */

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

  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput, Input, Mode> {
    const next = this._clone() as unknown as Schema<NewOutput, Input, Mode>;

    next.state.postprocessors.push(fn as (v: unknown) => unknown);

    return next;
  }

  preprocess(fn: (value: unknown) => unknown): this {
    const cloned = this._clone();

    cloned.state.preprocessors.push(fn);

    return cloned;
  }

  pipe<B extends AnySchema>(next: B): PipeSchema<B, this, MergeSchemaModes<Mode | InferSchemaMode<B>>> {
    return new PipeSchema(this, next);
  }

  /* -------------------- Introspection -------------------- */

  label(description: string): this {
    const cloned = this._clone();

    cloned.state.description = description;

    return cloned;
  }

  definition(): SchemaDefinition {
    if (
      this.state.catch ||
      this.state.defaultValue ||
      this.state.postprocessors.length > 0 ||
      this.state.preprocessors.length > 0 ||
      this.state.hasRuntimeChecks
    ) {
      throw new SpellDefinitionError(
        'Schemas with checks, transforms, defaults, catches, or preprocessors have no declarative definition.',
      );
    }

    return deepFreeze(this._toDescriptorImpl()) as SchemaDefinition;
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

  is(value: unknown): value is Output {
    return (this.safeParse as unknown as (value: unknown) => ParseResult<Output>)(value).success;
  }

  assert(value: unknown, label?: string): asserts value is Output {
    const result = this._parseFullSync(value);

    if (result.issues.length === 0) return;

    const issues = label
      ? result.issues.map((issue) => ({
          ...issue,
          message: issue.path.length === 0 ? `${label}: ${issue.message}` : issue.message,
        }))
      : result.issues;

    throw new SpellValidationError(issues);
  }

  walk<R>(visitor: SchemaWalker<R>): R | null {
    return this._walk(visitor);
  }

  get kind(): string {
    return this._kind;
  }

  protected get _kind(): string {
    return 'any';
  }

  /* -------------------- Protected helpers -------------------- */

  protected _describeBase(): { description?: string; isNullable?: true; isOptional?: true } {
    return {
      ...(this.state.description !== undefined ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true as const } : {}),
      ...(this.state.isOptional ? { isOptional: true as const } : {}),
    };
  }

  protected _addConstraint(
    validator: ValidateFn,
    mergeAnnotations?: (current: Record<string, unknown>) => Record<string, unknown>,
  ): this {
    const next = this._clone();

    next.state.validators.push(validator);

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

  protected _copyStateTo<T extends Schema<any, any>>(target: T): T {
    target.state = cloneState(this.state);

    return target;
  }

  protected _walk<R>(visitor: SchemaWalker<R>): R | null {
    if (visitor.unknown) return visitor.unknown(this);

    return null;
  }

  protected _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'any' };
  }

  /* -------------------- Private -------------------- */

  private _withCatch<T>(fn: () => T): T {
    if (!this.state.catch) return fn();

    try {
      return fn();
    } catch (error) {
      if (error instanceof SpellValidationError) return this.state.catch() as unknown as T;

      throw error;
    }
  }

  protected async _withCatchAsync<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.state.catch) return fn();

    try {
      return await fn();
    } catch (error) {
      if (error instanceof SpellValidationError) return this.state.catch() as unknown as T;

      throw error;
    }
  }

  protected _prepareInput(value: unknown): { skip: true; value: null | undefined } | { skip: false; value: unknown } {
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

  private _runValidatorsSync(value: unknown, ctx: ParseContext): Issue[] {
    if (this._typeValidator) {
      const typeResult = this._typeValidator(value, ctx);

      if (typeResult instanceof Promise) {
        throw new SpellValidationError([
          {
            code: ErrorCode.custom,
            message: 'Type validator returned a Promise. Use parseAsync() for async validation.',
            path: [],
          },
        ]);
      }

      if (typeResult && typeResult.length > 0) return typeResult;
    }

    const issues: Issue[] = [];

    for (const validate of this.state.validators) {
      const result = validate(value, ctx);

      if (result instanceof Promise) {
        throw new SpellValidationError([
          {
            code: ErrorCode.custom,
            message: 'Sync parsing received an async check. Use checkAsync() and parseAsync().',
            path: [],
          },
        ]);
      }

      if (result) issues.push(...result);
    }

    return issues;
  }

  protected async _runValidatorsAsync(value: unknown, ctx: ParseContext): Promise<Issue[]> {
    if (this._typeValidator) {
      const typeResult = await this._typeValidator(value, ctx);

      if (typeResult && typeResult.length > 0) return typeResult;
    }

    const issues: Issue[] = [];

    for (const validate of this.state.validators) {
      const result = await validate(value, ctx);

      if (result) issues.push(...result);
    }

    return issues;
  }

  protected _parse(_value: unknown, _ctx: ParseContext): MaybePromise<ParseValue> {
    return { data: _value, issues: [], typeOk: true };
  }
}

/* -------------------- PipeSchema -------------------- */

export class PipeSchema<
  To extends AnySchema,
  From extends AnySchema,
  Mode extends SchemaMode = MergeSchemaModes<InferSchemaMode<To | From>>,
> extends Schema<InferOutput<To>, InferInput<From>, Mode> {
  readonly from: From;
  readonly to: To;

  protected override get _kind(): string {
    return 'pipe';
  }

  override checkAsync(
    this: PipeSchema<To, From, 'sync'>,
    fn: (value: InferOutput<To>, ctx: CheckContext) => Promise<ValidateResult>,
  ): PipeSchema<To, From, 'async'> {
    return this._addCheck(fn, true) as unknown as PipeSchema<To, From, 'async'>;
  }

  constructor(from: From, to: To) {
    super();
    this.from = from;
    this.to = to;
  }

  protected override _parse(value: unknown, ctx: ParseContext): MaybePromise<ParseValue> {
    const r1OrPromise = this.from._parseFullSync(value, ctx);

    if (r1OrPromise instanceof Promise) {
      return (r1OrPromise as Promise<{ data: unknown; issues: Issue[] }>).then((r1) => {
        if (r1.issues.length > 0) return { data: value, issues: r1.issues, typeOk: false };

        return this.to
          ._parseFullAsync(r1.data, ctx)
          .then((r2) =>
            r2.issues.length > 0
              ? { data: r1.data, issues: r2.issues, typeOk: false }
              : { data: r2.data, issues: [], typeOk: true },
          );
      });
    }

    if (r1OrPromise.issues.length > 0) return { data: value, issues: r1OrPromise.issues, typeOk: false };

    const r2OrPromise = this.to._parseFullSync(r1OrPromise.data, ctx);

    if (r2OrPromise instanceof Promise) {
      return r2OrPromise.then((r2) =>
        r2.issues.length > 0
          ? { data: r1OrPromise.data, issues: r2.issues, typeOk: false }
          : { data: r2.data, issues: [], typeOk: true },
      );
    }

    return r2OrPromise.issues.length > 0
      ? { data: r1OrPromise.data, issues: r2OrPromise.issues, typeOk: false }
      : { data: r2OrPromise.data, issues: [], typeOk: true };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<InferOutput<To>> {
    const c = ctx ?? _makeCtx();
    const first = await this.from._parseFullAsync(value, c);

    if (first.issues.length > 0) throw new SpellValidationError(first.issues);

    const second = await this.to._parseFullAsync(first.data, c);

    if (second.issues.length > 0) throw new SpellValidationError(second.issues);

    const issues = await this._runValidatorsAsync(second.data, c);

    if (issues.length > 0) throw new SpellValidationError(issues);

    return this._runPostprocessors(second.data) as InferOutput<To>;
  }

  protected override _walk<R>(visitor: SchemaWalker<R>): R | null {
    const fromR = this.from.walk(visitor);
    const toR = this.to.walk(visitor);

    if (visitor.pipe) return visitor.pipe(this, fromR, toR);

    return super._walk(visitor);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      from: this.from.definition(),
      kind: 'pipe',
      to: this.to.definition(),
    };
  }
}
