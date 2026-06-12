import { isPlainObject } from '@vielzeug/arsenal';

import { fail, resolveMessage, ValidationError } from './errors';
import { descriptorToJsonSchema } from './json-schema';
import { _messages, _warn } from './messages';
import { defineOwnProperty } from './safe-object';
import {
  type AnySchema,
  type CheckContext,
  type CheckFnResult,
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
  type ParseResult,
  type ReconstructibleSchemaDescriptor,
  type SchemaDescriptor,
  type SchemaWalker,
  type ValidateFn,
  type WrapperMode,
} from './types';

export {
  ErrorCode,
  type AnySchema,
  type CheckContext,
  type CheckFnResult,
  type FlatError,
  type FlatErrorFirst,
  type FormattedErrors,
  type Infer,
  type InferInput,
  type InferOutput,
  type Issue,
  type JsonSchema,
  type MessageFn,
  type ParseResult,
  type ReconstructibleSchemaDescriptor,
  type SchemaDescriptor,
  type SchemaWalker,
  type ValidateFn,
  type WrapperMode,
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

/* -------------------- Base Schema -------------------- */

function normalizeCheckResult(result: CheckFnResult, ctxIssues: Issue[]): Issue[] | null {
  const issues = [...ctxIssues];

  if (result === false) issues.push({ code: ErrorCode.custom, message: _messages().check.default(), path: [] });
  else if (typeof result === 'string') issues.push({ code: ErrorCode.custom, message: result, path: [] });

  return issues.length ? issues : null;
}

export class Schema<Output = unknown, Input = Output> {
  protected state: SchemaState<Output>;

  /**
   * JSON Schema annotation fields set by constraint methods (min, max, pattern, etc.).
   * Subclasses narrow this type locally at usage sites when they need typed access.
   */
  protected _annotations: Record<string, unknown> = {};

  /**
   * Primary type-check validator set via the constructor. Runs before constraint validators;
   * if it returns issues, constraint validators are skipped entirely.
   */
  private _typeValidator: ValidateFn | null = null;

  constructor(typeValidator?: ValidateFn) {
    this.state = defaultState<Output>();
    this._typeValidator = typeValidator ?? null;
  }

  /* -------------------- Parse -------------------- */

  parse(value: unknown): Output {
    return this._withCatch(() => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as Output;

      const core = this._parseValueSync(prepared.value);
      const validationIssues = core.typeOk ? this._executeValidators(core.data) : [];
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
      const validationIssues = core.typeOk ? await this._runAllValidators(core.data) : [];
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
   * Internal full parse without throwing. Returns { data, issues }.
   * Used by WrapperSchema, ArraySchema, ObjectSchema etc. to avoid
   * the try/catch + object allocation overhead of safeParse().
   * @internal
   */
  _parseFullSync(value: unknown): { data: unknown; issues: Issue[] } {
    const prepared = this._prepareInput(value);

    if (prepared.skip) return { data: prepared.value, issues: [] };

    const core = this._parseValueSync(prepared.value);
    const validationIssues = core.typeOk ? this._executeValidators(core.data) : [];
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
  async _parseFullAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const prepared = this._prepareInput(value);

    if (prepared.skip) return { data: prepared.value, issues: [] };

    const core = await this._parseValueAsync(prepared.value);
    const validationIssues = core.typeOk ? await this._runAllValidators(core.data) : [];
    const allIssues = [...core.issues, ...validationIssues];

    if (allIssues.length > 0) {
      if (this.state.catch) return { data: this.state.catch(), issues: [] };

      return { data: core.data, issues: allIssues };
    }

    return { data: this._runPostprocessors(core.data), issues: [] };
  }

  /* -------------------- Validators -------------------- */

  check(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this;
  check(fn: (value: Output, ctx: CheckContext) => Exclude<CheckFnResult, Promise<any>>): this;
  check(
    fn: ((value: Output, ctx: CheckContext) => Exclude<CheckFnResult, Promise<any>>) | ((value: Output) => boolean),
    message?: MessageFn<{ value: Output }>,
  ): this {
    if (message !== undefined) {
      const predicate = fn as (value: Output) => boolean;

      return this._addConstraint((value) => {
        if (predicate(value as Output)) return null;

        return fail(ErrorCode.custom, resolveMessage(message, { value: value as Output }));
      });
    }

    const checkFn = fn as (value: Output, ctx: CheckContext) => CheckFnResult;
    const validator: ValidateFn = (value) => {
      const ctxIssues: Issue[] = [];
      const ctx: CheckContext = {
        addIssue: (issue) => ctxIssues.push({ ...issue, path: issue.path ?? [] } as Issue),
      };
      const result = checkFn(value as Output, ctx);

      if ((result as unknown) instanceof Promise) {
        throw new ValidationError([
          {
            code: ErrorCode.custom,
            message: 'check() callback returned a Promise. Use checkAsync() for async validation.',
            path: [],
          },
        ]);
      }

      return normalizeCheckResult(result, ctxIssues);
    };

    return this._addConstraint(validator);
  }

  /**
   * Alias for `check(predicate, message)` — familiar for users coming from zod / valibot.
   * Accepts a boolean predicate and an optional message. For context-based refinements
   * (using `ctx.addIssue()`), use `check()` directly.
   *
   * @example
   * s.string().refine((v) => v.startsWith('https'), () => 'Must start with https')
   */
  refine(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this {
    return this.check(predicate, message);
  }

  checkAsync(fn: (value: Output, ctx: CheckContext) => Promise<CheckFnResult>): this {
    const validator: ValidateFn = (value) => {
      const ctxIssues: Issue[] = [];
      const ctx: CheckContext = {
        addIssue: (issue) => ctxIssues.push({ ...issue, path: issue.path ?? [] } as Issue),
      };

      return fn(value as Output, ctx).then((r) => normalizeCheckResult(r, ctxIssues));
    };

    return this._addConstraint(validator);
  }

  /* -------------------- Nullability / Optionality -------------------- */

  optional(): WrapperSchema<this, 'optional'> {
    if (this instanceof WrapperSchema) {
      const merged = this.mode === 'nullable' || this.mode === 'nullish' ? 'nullish' : 'optional';

      return this._withMode(merged) as unknown as WrapperSchema<this, 'optional'>;
    }

    return new WrapperSchema(this, 'optional');
  }

  nullable(): WrapperSchema<this, 'nullable'> {
    if (this instanceof WrapperSchema) {
      const merged = this.mode === 'optional' || this.mode === 'nullish' ? 'nullish' : 'nullable';

      return this._withMode(merged) as unknown as WrapperSchema<this, 'nullable'>;
    }

    return new WrapperSchema(this, 'nullable');
  }

  nullish(): WrapperSchema<this, 'nullish'> {
    if (this instanceof WrapperSchema) {
      return this._withMode('nullish') as unknown as WrapperSchema<this, 'nullish'>;
    }

    return new WrapperSchema(this, 'nullish');
  }

  required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>> {
    const cloned = this._clone() as unknown as Schema<Exclude<Output, undefined>, Exclude<Input, undefined>>;

    cloned.state.isOptional = false;

    return cloned;
  }

  /* -------------------- Transforms -------------------- */

  /**
   * Sets a default value used when the input is `undefined`.
   *
   * **Note:** For mutable default values (objects, arrays, class instances), prefer the
   * factory form `.default(() => myValue)` to ensure each parse gets a fresh copy.
   * The static form deep-clones `Date`, `Map`, `Set`, plain objects, and arrays automatically,
   * but custom class instances are returned as-is (shared reference).
   */
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

  /**
   * Sets the human-readable description label for this schema (fluent, immutable).
   *
   * ```ts
   * const Username = s.string().min(3).label('Username');
   * Username.description; // 'Username'
   * ```
   */
  label(description: string): this {
    const cloned = this._clone();

    cloned.state.description = description;

    return cloned;
  }

  /**
   * Returns the full structural descriptor for this schema.
   * Useful for introspection, code generation, and documentation.
   *
   * ```ts
   * s.string().min(3).email().toDescriptor();
   * // { kind: 'string', minLength: 3, format: 'email' }
   * ```
   */
  toDescriptor(): SchemaDescriptor {
    if (this.state.preprocessors.length > 0) {
      _warn(
        '[@vielzeug/spell] toDescriptor(): this schema has preprocessors (e.g. trim(), lowercase(), coerce()). ' +
          'Preprocessors are not serializable and will not be restored by fromDescriptor().',
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

  /**
   * Serializes this schema to a JSON Schema object (draft 2020-12 compatible).
   * Derived from `toDescriptor()` — no separate serialization path per schema.
   */
  toJsonSchema(): JsonSchema {
    return descriptorToJsonSchema(this.toDescriptor());
  }

  /**
   * Asserts that `value` matches this schema. Throws a `ValidationError` on failure.
   * Unlike `parse()`, this method has no return value — it's an assertion only.
   *
   * ```ts
   * schema.assert(value, 'userId');
   * // throws: "userId: Expected string [invalid_type]"
   * ```
   *
   * **Note:** `label` is only prepended to root-level issues (those with an empty `path`).
   * Nested field validation messages (e.g. `user.email` path) are not prefixed by the label.
   *
   * @param value The value to validate.
   * @param label Optional name for the value, prepended to root-level error messages.
   */
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

  walk<R>(visitor: SchemaWalker<R>): R {
    return this._walk(visitor);
  }

  /**
   * Returns true if `other` describes the same schema shape.
   *
   * **Note:** `equals()` compares schema structure only: kind, constraints, annotations,
   * `description`, `isOptional`, and `isNullable`. It does NOT compare preprocessors or
   * postprocessors — function reference equality is not meaningful in this context.
   * Two schemas with different `.preprocess()` / `.transform()` chains may return `true`.
   */
  equals(other: AnySchema): boolean {
    if (other === this) return true;

    if (Object.getPrototypeOf(other) !== Object.getPrototypeOf(this)) return false;

    if (other.isOptional !== this.isOptional) return false;

    if (other.isNullable !== this.isNullable) return false;

    if (other.description !== this.description) return false;

    return this._equalsImpl(other);
  }

  /**
   * The kind identifier for this schema (e.g. `'string'`, `'object'`, `'union'`).
   * Subclasses override `_kind` directly — reads this without allocating a descriptor.
   */
  get kind(): string {
    return this._kind;
  }

  /** @internal Override in every subclass to declare the schema kind string. */
  protected get _kind(): string {
    return 'any';
  }

  /* -------------------- Protected helpers -------------------- */

  /**
   * Returns the base descriptor fields shared by every schema (description, isNullable, isOptional).
   * Use in _toDescriptorImpl overrides: `{ ...this._describeBase(), kind: 'string', ... }`
   */
  protected _describeBase(): { description?: string; isNullable?: true; isOptional?: true } {
    return {
      ...(this.state.description !== undefined ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true as const } : {}),
      ...(this.state.isOptional ? { isOptional: true as const } : {}),
    };
  }

  /**
   * Shallow-compares _annotations across two schema instances.
   * Call from _equalsImpl in annotation-bearing schemas.
   */
  protected _annotationsEqual(other: AnySchema): boolean {
    const a = this._annotations;
    const b = (other as Schema)._annotations;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((k) => a[k] === b[k]);
  }

  /**
   * Adds a constraint validator and optionally updates `_annotations` atomically.
   * This is the single method for adding constraints — both plain validators and
   * annotation-bearing ones use this path.
   *
   * The `mergeAnnotations` callback receives the current annotations as
   * `Record<string, unknown>`. Cast to your annotation type inside the callback:
   * ```ts
   * (ann) => { const a = ann as StringAnnotations; return { ...a, minLength: n }; }
   * ```
   */
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

  /**
   * Creates a clone of this schema with the given state. Uses `Object.assign` over a
   * new instance sharing the same prototype, then copies `_annotations` shallowly.
   *
   * **Subclass note:** Only `state` and `_annotations` are explicitly handled.
   * Subclasses that add extra instance properties (beyond those already on `this`)
   * must override `_clone()` and call `_construct()` to copy those properties too.
   */
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

  protected _copyStateToWithFlags<T extends Schema<any, any>>(target: T, isOptional: boolean, isNullable: boolean): T {
    target.state = cloneState(this.state);
    target.state.isOptional = isOptional;
    target.state.isNullable = isNullable;

    return target;
  }

  protected _walk<R>(visitor: SchemaWalker<R>): R {
    if (visitor.unknown) return visitor.unknown(this);

    throw new Error('[@vielzeug/spell] walk(): no handler matched and no `unknown` fallback provided.');
  }

  /** Override in subclasses to return the full schema descriptor. */
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

  private async _withCatchAsync<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.state.catch) return fn();

    try {
      return await fn();
    } catch (error) {
      if (ValidationError.is(error)) return this.state.catch() as unknown as T;

      throw error;
    }
  }

  private _prepareInput(value: unknown): { skip: true; value: null | undefined } | { skip: false; value: unknown } {
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

  private _executeValidators(value: unknown): Issue[] {
    if (this._typeValidator) {
      const typeResult = this._typeValidator(value);

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
      const result = validate(value);

      if (result instanceof Promise) {
        throw new ValidationError([
          {
            code: ErrorCode.custom,
            message: 'check() callback returned a Promise. Use checkAsync() for async validation.',
            path: [],
          },
        ]);
      }

      if (result) issues.push(...result);
    }

    return issues;
  }

  protected async _runAllValidators(value: unknown): Promise<Issue[]> {
    if (this._typeValidator) {
      const typeResult = await this._typeValidator(value);

      if (typeResult && typeResult.length > 0) return typeResult;
    }

    const issues: Issue[] = [];

    for (const validate of this.state.validators) {
      const result = await validate(value);

      if (result) issues.push(...result);
    }

    return issues;
  }

  protected _parseValueSync(value: unknown): ParseValue {
    return { data: value, issues: [], typeOk: true };
  }

  protected async _parseValueAsync(value: unknown): Promise<ParseValue> {
    return this._parseValueSync(value);
  }
}

/* -------------------- Re-export for schema files -------------------- */

/* -------------------- Type Aliases -------------------- */

export type OptionalSchema<T extends AnySchema> = WrapperSchema<T, 'optional'>;
export type NullableSchema<T extends AnySchema> = WrapperSchema<T, 'nullable'>;
export type NullishSchema<T extends AnySchema> = WrapperSchema<T, 'nullish'>;

/* -------------------- WrapperSchema -------------------- */

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

export class WrapperSchema<T extends AnySchema, Mode extends WrapperMode> extends Schema<
  WrapperOutput<T, Mode>,
  WrapperInput<T, Mode>
> {
  readonly inner: T;
  readonly mode: Mode;

  protected override get _kind(): string {
    return this.inner.kind;
  }

  constructor(inner: T, mode: Mode) {
    super();
    this.inner = inner;
    this.mode = mode;
    this.state.isOptional = mode === 'optional' || mode === 'nullish';
    this.state.isNullable = mode === 'nullable' || mode === 'nullish';
  }

  override get description(): string | undefined {
    return this.state.description ?? this.inner.description;
  }

  /** @internal */
  _withMode<NewMode extends WrapperMode>(mode: NewMode): WrapperSchema<T, NewMode> {
    return this._copyStateToWithFlags(
      new WrapperSchema(this.inner, mode),
      mode === 'optional' || mode === 'nullish',
      mode === 'nullable' || mode === 'nullish',
    ) as WrapperSchema<T, NewMode>;
  }

  override required(): Schema<Exclude<WrapperOutput<T, Mode>, undefined>, Exclude<WrapperInput<T, Mode>, undefined>> {
    return this._copyStateToWithFlags(
      this.mode === 'nullable' || this.mode === 'nullish' ? this.inner.nullable() : this.inner.required(),
      false,
      this.mode === 'nullable' || this.mode === 'nullish',
    ) as Schema<Exclude<WrapperOutput<T, Mode>, undefined>, Exclude<WrapperInput<T, Mode>, undefined>>;
  }

  protected override _parseValueSync(value: unknown): ParseValue {
    const result = this.inner._parseFullSync(value);

    return result.issues.length > 0
      ? { data: value, issues: result.issues, typeOk: false }
      : { data: result.data, issues: [], typeOk: true };
  }

  protected override async _parseValueAsync(value: unknown): Promise<ParseValue> {
    const result = await this.inner._parseFullAsync(value);

    return result.issues.length > 0
      ? { data: value, issues: result.issues, typeOk: false }
      : { data: result.data, issues: [], typeOk: true };
  }

  protected override _walk<R>(visitor: SchemaWalker<R>): R {
    const innerR = this.inner.walk(visitor);

    if (this.mode === 'optional' && visitor.optional) {
      return visitor.optional(this as WrapperSchema<T, 'optional'>, innerR);
    }

    if (this.mode === 'nullable' && visitor.nullable) {
      return visitor.nullable(this as WrapperSchema<T, 'nullable'>, innerR);
    }

    if (this.mode === 'nullish' && visitor.nullish) {
      return visitor.nullish(this as WrapperSchema<T, 'nullish'>, innerR);
    }

    return super._walk(visitor);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this.inner.toDescriptor(), ...this._describeBase() };
  }

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof WrapperSchema)) return false;

    return this.mode === other.mode && this.inner.equals(other.inner);
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

  protected override _parseValueSync(value: unknown): ParseValue {
    const r1 = this.from._parseFullSync(value);

    if (r1.issues.length > 0) return { data: value, issues: r1.issues, typeOk: false };

    const r2 = this.to._parseFullSync(r1.data);

    return r2.issues.length > 0
      ? { data: r1.data, issues: r2.issues, typeOk: false }
      : { data: r2.data, issues: [], typeOk: true };
  }

  protected override async _parseValueAsync(value: unknown): Promise<ParseValue> {
    const r1 = await this.from._parseFullAsync(value);

    if (r1.issues.length > 0) return { data: value, issues: r1.issues, typeOk: false };

    const r2 = await this.to._parseFullAsync(r1.data);

    return r2.issues.length > 0
      ? { data: r1.data, issues: r2.issues, typeOk: false }
      : { data: r2.data, issues: [], typeOk: true };
  }

  protected override _walk<R>(visitor: SchemaWalker<R>): R {
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
