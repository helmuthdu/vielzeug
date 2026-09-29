import { isPlainObject } from '@vielzeug/arsenal';

import { SpellDefinitionError, SpellValidationError } from './errors';
import { createParseContext } from './messages';
import { defineOwnProperty } from './safe-object';
import {
  type AcceptsMissing,
  type AnySchema,
  type CheckContext,
  ErrorCode,
  type FlatError,
  type FlatErrorFirst,
  type Infer,
  type InferInput,
  type InferOutput,
  type Issue,
  type IssuePath,
  type IssuePathSegment,
  type JsonSchema,
  type MessageFn,
  type Messages,
  type ParseContext,
  type ParseResult,
  type SchemaDescriptor,
  type StandardSchemaV1,
  type SyncParsable,
  schemaInput,
  schemaOutput,
  type ValidateFn,
  type ValidateResult,
} from './types';

export {
  fail,
  joinIssuePath,
  prependIssuePath,
  resolveMessage,
  SpellDefinitionError,
  SpellError,
  SpellValidationError,
} from './errors';
export {
  type AcceptsMissing,
  type AnySchema,
  type CheckContext,
  ErrorCode,
  type FlatError,
  type FlatErrorFirst,
  type Infer,
  type InferInput,
  type InferOutput,
  type Issue,
  type IssuePath,
  type IssuePathSegment,
  type JsonSchema,
  type MessageFn,
  type Messages,
  type ParseContext,
  type ParseResult,
  type SchemaDescriptor,
  type StandardSchemaV1,
  type SyncParsable,
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

/* -------------------- Parse-value return type -------------------- */

/** Parse-value return type for `_parse` implementations. Emitted as part of the public class surface. */
export type ParseValue = { data: unknown; issues: Issue[]; typeOk: boolean };

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

export class Schema<Output = unknown, Input = Output> implements StandardSchemaV1<Input, Output> {
  declare readonly [schemaInput]: Input;
  declare readonly [schemaOutput]: Output;

  protected state: SchemaState<Output>;

  protected _annotations: Record<string, unknown> = {};

  private _typeValidator: ValidateFn | null = null;

  get '~standard'(): StandardSchemaV1.Props<Input, Output> {
    return {
      validate: async (value) => {
        const result = await this.safeParseAsync(value);

        if (result.success) return { value: result.data };

        return { issues: result.error.issues.map(({ message, path }) => ({ message, path })) };
      },
      vendor: 'vielzeug',
      version: 1,
    };
  }

  constructor(typeValidator?: ValidateFn) {
    this.state = defaultState<Output>();
    this._typeValidator = typeValidator ?? null;
  }

  /* -------------------- Parse -------------------- */

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

      const core = this._parse(prepared.value, c);
      const validationIssues = core.typeOk ? this._runValidatorsSync(core.data, c) : [];
      const allIssues = [...core.issues, ...validationIssues];

      if (allIssues.length) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(core.data) as Output;
    });
  }

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

      const core = await this._parseAsync(prepared.value, c);
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

    const core = this._parse(prepared.value, c);
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

    const core = await this._parseAsync(prepared.value, c);
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

  checkAsync(fn: (value: Output, ctx: CheckContext) => Promise<ValidateResult>): this {
    return this._addCheck(fn, true);
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

  optional(): Schema<Output | undefined, Input | undefined> & AcceptsMissing {
    const cloned = this._clone() as unknown as Schema<Output | undefined, Input | undefined>;

    cloned.state.isOptional = true;

    return cloned as Schema<Output | undefined, Input | undefined> & AcceptsMissing;
  }

  nullable(): Schema<Output | null, Input | null> {
    const cloned = this._clone() as unknown as Schema<Output | null, Input | null>;

    cloned.state.isNullable = true;

    return cloned;
  }

  nullish(): Schema<Output | null | undefined, Input | null | undefined> & AcceptsMissing {
    const cloned = this._clone() as unknown as Schema<Output | null | undefined, Input | null | undefined>;

    cloned.state.isOptional = true;
    cloned.state.isNullable = true;

    return cloned as Schema<Output | null | undefined, Input | null | undefined> & AcceptsMissing;
  }

  required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>> {
    const cloned = this._clone() as unknown as Schema<Exclude<Output, undefined>, Exclude<Input, undefined>>;

    cloned.state.isOptional = false;

    return cloned;
  }

  /* -------------------- Transforms -------------------- */

  default(defaultValue: Output | (() => Output)): this & AcceptsMissing {
    const cloned = this._clone();

    cloned.state.defaultValue =
      typeof defaultValue === 'function' ? (defaultValue as () => Output) : () => materializeValue(defaultValue);

    return cloned as this & AcceptsMissing;
  }

  catch(fallback: Output | (() => Output)): this & AcceptsMissing {
    const cloned = this._clone();

    cloned.state.catch = typeof fallback === 'function' ? (fallback as () => Output) : () => materializeValue(fallback);

    return cloned as this & AcceptsMissing;
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

  pipe<B extends AnySchema>(next: B): PipeSchema<B, this> {
    return new PipeSchema(this, next);
  }

  /* -------------------- Introspection -------------------- */

  label(description: string): this {
    const cloned = this._clone();

    cloned.state.description = description;

    return cloned;
  }

  definition(): SchemaDescriptor {
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

    return deepFreeze(this._toDescriptorImpl()) as SchemaDescriptor;
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
    return this.safeParse(value).success;
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

  get kind(): string {
    return this._kind;
  }

  protected get _kind(): string {
    return 'unknown';
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

  protected _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'unknown' };
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

  protected _parse(_value: unknown, _ctx: ParseContext): ParseValue {
    return { data: _value, issues: [], typeOk: true };
  }

  /**
   * Async counterpart of `_parse`. Composites override this to parse their
   * children through `_parseFullAsync`, which keeps async checks reachable at
   * any nesting depth. The default defers to the synchronous `_parse`.
   */
  protected _parseAsync(value: unknown, ctx: ParseContext): Promise<ParseValue> {
    return Promise.resolve(this._parse(value, ctx));
  }
}

/* -------------------- PipeSchema -------------------- */

export class PipeSchema<To extends AnySchema, From extends AnySchema> extends Schema<
  InferOutput<To>,
  InferInput<From>
> {
  readonly from: From;
  readonly to: To;

  protected override get _kind(): string {
    return 'pipe';
  }

  constructor(from: From, to: To) {
    super();
    this.from = from;
    this.to = to;
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    const first = this.from._parseFullSync(value, ctx);

    if (first.issues.length > 0) return { data: value, issues: first.issues, typeOk: false };

    const second = this.to._parseFullSync(first.data, ctx);

    return second.issues.length > 0
      ? { data: first.data, issues: second.issues, typeOk: false }
      : { data: second.data, issues: [], typeOk: true };
  }

  protected override async _parseAsync(value: unknown, ctx: ParseContext): Promise<ParseValue> {
    const first = await this.from._parseFullAsync(value, ctx);

    if (first.issues.length > 0) return { data: value, issues: first.issues, typeOk: false };

    const second = await this.to._parseFullAsync(first.data, ctx);

    return second.issues.length > 0
      ? { data: first.data, issues: second.issues, typeOk: false }
      : { data: second.data, issues: [], typeOk: true };
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
