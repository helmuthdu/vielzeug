import { isPlainObject } from '@vielzeug/arsenal';

import { fail, resolveMessage, ValidationError } from './errors';
import { schemaToJsonSchema } from './json-schema';
import { _messages, _warn } from './messages';
import { defineOwnProperty } from './safe-object';
import {
  type AnySchema,
  type CheckContext,
  ErrorCode,
  type FlatError,
  type FlatErrorFirst,
  type FormattedErrors,
  type Infer,
  type InferInput,
  type InferOutput,
  type Issue,
  type JsonSchema,
  type MessageFn,
  type Messages,
  type ParseContext,
  type ParseResult,
  type SchemaDescriptor,
  type SchemaWalker,
  type ValidateFn,
  type ValidateResult,
} from './types';

export {
  ErrorCode,
  type AnySchema,
  type CheckContext,
  type FlatError,
  type FlatErrorFirst,
  type FormattedErrors,
  type Infer,
  type InferInput,
  type InferOutput,
  type Issue,
  type JsonSchema,
  type MessageFn,
  type Messages,
  type ParseContext,
  type ParseResult,
  type SchemaDescriptor,
  type SchemaWalker,
  type ValidateFn,
  type ValidateResult,
};

export { ValidationError, errorsAt, fail, prependIssuePath, resolveMessage } from './errors';

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
  isNullable: boolean;
  isOptional: boolean;
  postprocessors: Postprocessor[];
  preprocessors: Preprocessor[];
  validators: ValidateFn[];
}

function defaultState<Output>(): SchemaState<Output> {
  return { isNullable: false, isOptional: false, postprocessors: [], preprocessors: [], validators: [] };
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

/* -------------------- Internal parse-value return type -------------------- */

/** @internal */
export type ParseValue = { data: unknown; issues: Issue[]; typeOk: boolean };

type MaybePromise<T> = T | Promise<T>;

/* -------------------- ParseContext default -------------------- */

/** @internal */
export function _makeCtx(messages?: Messages): ParseContext {
  return { messages: messages ?? _messages() };
}

/* -------------------- ValidateResult normalizer -------------------- */

function normalizeValidateResult(result: ValidateResult, ctxIssues: Issue[]): Issue[] | null {
  const issues = [...ctxIssues];

  if (typeof result === 'string') {
    issues.push({ code: ErrorCode.custom, message: result, path: [] });
  } else if (result === false && issues.length === 0) {
    issues.push({ code: ErrorCode.custom, message: _messages().check.default(), path: [] });
  }

  return issues.length ? issues : null;
}

/* -------------------- Base Schema -------------------- */

export class Schema<Output = unknown, Input = Output> {
  protected state: SchemaState<Output>;

  protected _annotations: Record<string, unknown> = {};

  private _typeValidator: ValidateFn | null = null;

  constructor(typeValidator?: ValidateFn) {
    this.state = defaultState<Output>();
    this._typeValidator = typeValidator ?? null;
  }

  /* -------------------- Parse -------------------- */

  parse(value: unknown, ctx?: ParseContext): Output {
    const c = ctx ?? _makeCtx();

    return this._withCatch(() => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as Output;

      const coreOrPromise = this._parse(prepared.value, c);

      if (coreOrPromise instanceof Promise) {
        throw new ValidationError([
          {
            code: ErrorCode.custom,
            message: '[@vielzeug/spell] parse() received an async schema. Use parseAsync() instead.',
            path: [],
          },
        ]);
      }

      const core = coreOrPromise;
      const validationIssues = core.typeOk ? this._runValidatorsSync(core.data, c) : [];
      const allIssues = [...core.issues, ...validationIssues];

      if (allIssues.length) throw new ValidationError(allIssues);

      return this._runPostprocessors(core.data) as Output;
    });
  }

  safeParse(value: unknown, ctx?: ParseContext): ParseResult<Output> {
    try {
      return { data: this.parse(value, ctx), success: true };
    } catch (error) {
      if (ValidationError.is(error)) return { error, success: false };

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

      if (allIssues.length) throw new ValidationError(allIssues);

      return this._runPostprocessors(core.data) as Output;
    });
  }

  async safeParseAsync(value: unknown, ctx?: ParseContext): Promise<ParseResult<Output>> {
    try {
      return { data: await this.parseAsync(value, ctx), success: true };
    } catch (error) {
      if (ValidationError.is(error)) return { error, success: false };

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
    const c = ctx ?? _makeCtx();
    const prepared = this._prepareInput(value);

    if (prepared.skip) return { data: prepared.value, issues: [] };

    const coreOrPromise = this._parse(prepared.value, c);

    if (coreOrPromise instanceof Promise) {
      throw new ValidationError([
        {
          code: ErrorCode.custom,
          message: '[@vielzeug/spell] Sync parse path received an async schema.',
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
   * Add a custom validation rule. The callback receives the typed value and an optional
   * `{ addIssue }` context for reporting multiple issues in one pass.
   *
   * **Return values:**
   * - `string` — fail with that message
   * - `false` — fail silently (use `addIssue` to report)
   * - `true` / `null` / `void` — pass
   *
   * The `|| 'message'` shorthand works naturally:
   * ```ts
   * s.string().validate(v => v.length > 0 || 'Cannot be empty')
   * ```
   *
   * For async validation, return a Promise:
   * ```ts
   * s.string().validate(async v => (await db.exists(v)) ? 'Already taken' : null)
   * ```
   */
  validate(
    fn:
      | ((value: Output, ctx: CheckContext) => ValidateResult)
      | ((value: Output, ctx: CheckContext) => Promise<ValidateResult>),
  ): this {
    const validator: ValidateFn = (value, _ctx) => {
      const ctxIssues: Issue[] = [];
      const checkCtx: CheckContext = {
        addIssue: (issue) => ctxIssues.push({ ...issue, path: issue.path ?? [] } as Issue),
      };
      const result = fn(value as Output, checkCtx);

      if (result instanceof Promise) {
        return result.then((r) => normalizeValidateResult(r, ctxIssues));
      }

      return normalizeValidateResult(result, ctxIssues);
    };

    return this._addConstraint(validator);
  }

  refine(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this {
    return this._addConstraint((value, ctx) => {
      if ((predicate as (v: unknown) => boolean)(value)) return null;

      const msg = message ? resolveMessage(message, { value: value as Output }) : ctx!.messages.check.default();

      return fail(ErrorCode.custom, msg);
    });
  }

  /* -------------------- Nullability / Optionality -------------------- */

  optional(): Schema<Output | undefined, Input | undefined> {
    const cloned = this._clone() as unknown as Schema<Output | undefined, Input | undefined>;

    cloned.state.isOptional = true;

    return cloned;
  }

  nullable(): Schema<Output | null, Input | null> {
    const cloned = this._clone() as unknown as Schema<Output | null, Input | null>;

    cloned.state.isNullable = true;

    return cloned;
  }

  nullish(): Schema<Output | null | undefined, Input | null | undefined> {
    const cloned = this._clone() as unknown as Schema<Output | null | undefined, Input | null | undefined>;

    cloned.state.isOptional = true;
    cloned.state.isNullable = true;

    return cloned;
  }

  required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>> {
    const cloned = this._clone() as unknown as Schema<Exclude<Output, undefined>, Exclude<Input, undefined>>;

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

  /* -------------------- Introspection -------------------- */

  label(description: string): this {
    const cloned = this._clone();

    cloned.state.description = description;

    return cloned;
  }

  toDescriptor(): SchemaDescriptor {
    if (this.state.preprocessors.length > 0) {
      _warn(
        'toDescriptor(): this schema has preprocessors (e.g. trim(), lowercase(), coerce()). ' +
          'Preprocessors are not serializable and will not appear in the descriptor output.',
      );
    }

    return this._toDescriptorImpl();
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

  toJsonSchema(): JsonSchema {
    return schemaToJsonSchema(this);
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

    throw new ValidationError(issues);
  }

  walk<R>(visitor: SchemaWalker<R>): R | null {
    return this._walk(visitor);
  }

  equals(other: AnySchema): boolean {
    if (other === this) return true;

    if (Object.getPrototypeOf(other) !== Object.getPrototypeOf(this)) return false;

    if (other.isOptional !== this.isOptional) return false;

    if (other.isNullable !== this.isNullable) return false;

    if (other.description !== this.description) return false;

    return this._equalsImpl(other);
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

  protected _annotationsEqual(other: AnySchema): boolean {
    const a = this._annotations;
    const b = (other as Schema)._annotations;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((k) => a[k] === b[k]);
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

  protected _equalsImpl(_other: AnySchema): boolean {
    return true;
  }

  /* -------------------- Private -------------------- */

  private _withCatch<T>(fn: () => T): T {
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
        throw new ValidationError([
          {
            code: ErrorCode.custom,
            message: 'Type validator returned a Promise. Use checkAsync() for async validation.',
            path: [],
          },
        ]);
      }

      if (typeResult && typeResult.length > 0) return typeResult;
    }

    const issues: Issue[] = [];

    for (const validate of this.state.validators) {
      const result = validate(value, ctx);

      if (result instanceof Promise) continue;

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

export class PipeSchema<Output, Input = unknown> extends Schema<Output, Input> {
  readonly from: Schema<any, Input>;
  readonly to: Schema<Output, any>;

  protected override get _kind(): string {
    return 'pipe';
  }

  constructor(from: Schema<any, Input>, to: Schema<Output, any>) {
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

  protected override _walk<R>(visitor: SchemaWalker<R>): R | null {
    const fromR = this.from.walk(visitor);
    const toR = this.to.walk(visitor);

    if (visitor.pipe) return visitor.pipe(this, fromR, toR);

    return super._walk(visitor);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      from: this.from.toDescriptor(),
      kind: 'pipe',
      to: this.to.toDescriptor(),
    };
  }

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof PipeSchema)) return false;

    return this.from.equals(other.from) && this.to.equals(other.to);
  }
}
