import { deepFreeze, materialize } from './_object';
import { chain, invalid, issue, type MaybePromise, type Outcome, ok, type ParseValue, type RunContext } from './_parse';
import { SpellDefinitionError, SpellError, SpellValidationError } from './errors';
import { defaultContext, type Messages } from './messages';
import {
  type AcceptsMissing,
  type AnySchema,
  type CheckContext,
  ErrorCode,
  type InferInput,
  type InferOutput,
  type Issue,
  type ParseContext,
  type ParseResult,
  type SchemaDescriptor,
  type SchemaKind,
  type StandardSchemaV1,
  schemaInput,
  schemaOutput,
  type ValidateResult,
} from './types';

type Step =
  | {
      readonly async: boolean;
      readonly kind: 'check';
      readonly run: (value: unknown, ctx: RunContext) => MaybePromise<Issue[] | null>;
    }
  | { readonly kind: 'transform'; readonly run: (value: unknown) => unknown };

/** Immutable configuration shared by every schema; each modifier returns a copy with a new state. */
export type SchemaState = {
  readonly catch?: () => unknown;
  readonly default?: () => unknown;
  readonly description?: string;
  /** Declarative contributions of built-in constraints, read by `definition()`. */
  readonly meta: Readonly<Record<string, unknown>>;
  readonly nullable: boolean;
  readonly optional: boolean;
  /** False once runtime-only behavior is attached; `definition()` then throws. */
  readonly portable: boolean;
  readonly preprocess: readonly ((value: unknown) => unknown)[];
  /** Checks and transforms, run in the order they were chained. */
  readonly steps: readonly Step[];
};

const initialState: SchemaState = {
  meta: {},
  nullable: false,
  optional: false,
  portable: true,
  preprocess: [],
  steps: [],
};

const asyncMisuse = () => new SpellError('Schema contains async checks; use parseAsync() or safeParseAsync().');

function toResult<T>({ issues, value }: Outcome): ParseResult<T> {
  return issues.length === 0
    ? { data: value as T, success: true }
    : { error: new SpellValidationError(issues), success: false };
}

function checkIssues(result: ValidateResult, reported: Issue[], messages: Messages): Issue[] | null {
  if (typeof result === 'string') reported.push(issue(ErrorCode.custom, result));
  else if (result === false && reported.length === 0) reported.push(issue(ErrorCode.custom, messages.check.default()));

  return reported.length > 0 ? reported : null;
}

export class Schema<Output = unknown, Input = Output> implements StandardSchemaV1<Input, Output> {
  declare readonly [schemaInput]: Input;
  declare readonly [schemaOutput]: Output;

  protected state: SchemaState = initialState;

  get kind(): SchemaKind {
    return 'unknown';
  }

  get description(): string | undefined {
    return this.state.description;
  }

  /** Whether missing (`undefined`) input is accepted: `optional()`, `nullish()`, `default()`, or `catch()`. */
  get isOptional(): boolean {
    return this.state.optional || this.state.default !== undefined || this.state.catch !== undefined;
  }

  get isNullable(): boolean {
    return this.state.nullable;
  }

  get '~standard'(): StandardSchemaV1.Props<Input, Output> {
    return {
      validate: (value) =>
        chain(this._run(value, { async: true, messages: defaultContext.messages }), ({ issues, value: data }) =>
          issues.length === 0
            ? { value: data as Output }
            : { issues: issues.map(({ message, path }) => ({ message, path })) },
        ),
      vendor: 'vielzeug',
      version: 1,
    };
  }

  /* -------------------- Parsing -------------------- */

  /** Parses synchronously; throws `SpellValidationError` on invalid input and `SpellError` when async checks are present. */
  parse(value: unknown, context?: ParseContext): Output {
    const result = this.safeParse(value, context);

    if (result.success) return result.data;

    throw result.error;
  }

  safeParse(value: unknown, context: ParseContext = defaultContext): ParseResult<Output> {
    const outcome = this._run(value, { async: false, messages: context.messages });

    if (outcome instanceof Promise) throw asyncMisuse();

    return toResult(outcome);
  }

  async parseAsync(value: unknown, context?: ParseContext): Promise<Output> {
    const result = await this.safeParseAsync(value, context);

    if (result.success) return result.data;

    throw result.error;
  }

  async safeParseAsync(value: unknown, context: ParseContext = defaultContext): Promise<ParseResult<Output>> {
    return toResult(await this._run(value, { async: true, messages: context.messages }));
  }

  is(value: unknown): value is Output {
    return this.safeParse(value).success;
  }

  /** Narrows `value` or throws `SpellValidationError`; `label` prefixes root-level messages. */
  assert(value: unknown, label?: string): asserts value is Output {
    const result = this.safeParse(value);

    if (result.success) return;

    if (!label) throw result.error;

    throw new SpellValidationError(
      result.error.issues.map((entry) =>
        entry.path.length === 0 ? { ...entry, message: `${label}: ${entry.message}` } : entry,
      ),
    );
  }

  /**
   * Runs the full pipeline: preprocessors, missing/null handling, the structural parse, then
   * checks and transforms in chain order. Synchronous unless an async check runs.
   * @internal Composite schemas call this on their children.
   */
  _run(input: unknown, ctx: RunContext): MaybePromise<Outcome> {
    const { catch: fallback, default: defaultValue, nullable, optional, preprocess } = this.state;
    let value = input;

    for (const fn of preprocess) value = fn(value);

    if (value === undefined) {
      if (defaultValue) return { issues: [], value: defaultValue() };

      if (optional) return { issues: [], value };
    }

    if (value === null && nullable) return { issues: [], value };

    const outcome = chain(this._parse(value, ctx), (parsed) =>
      parsed.typeOk ? this._runSteps(parsed.value, parsed.issues, ctx, 0) : parsed,
    );

    if (!fallback) return outcome;

    return chain(outcome, (result) => (result.issues.length === 0 ? result : { issues: [], value: fallback() }));
  }

  private _runSteps(value: unknown, issues: Issue[], ctx: RunContext, from: number): MaybePromise<Outcome> {
    const { steps } = this.state;
    let current = value;

    for (let index = from; index < steps.length; index++) {
      const step = steps[index]!;

      if (step.kind === 'transform') {
        if (issues.length > 0) break;

        current = step.run(current);
        continue;
      }

      if (step.async && !ctx.async) throw asyncMisuse();

      const found = step.run(current, ctx);

      if (found instanceof Promise) {
        if (!ctx.async) {
          found.catch(() => {});
          throw asyncMisuse();
        }

        const settled = current;

        return found.then((late) => this._runSteps(settled, late ? [...issues, ...late] : issues, ctx, index + 1));
      }

      if (found) issues = [...issues, ...found];
    }

    return { issues, value: current };
  }

  /** Structural parse of a value that is neither missing-and-optional nor null-and-nullable. */
  protected _parse(value: unknown, _ctx: RunContext): MaybePromise<ParseValue> {
    return ok(value);
  }

  /* -------------------- Checks -------------------- */

  /** Adds a synchronous rule. For asynchronous work use `checkAsync()`. */
  check<F extends (value: Output, ctx: CheckContext) => ValidateResult | Promise<ValidateResult>>(
    fn: ReturnType<F> extends PromiseLike<unknown> ? never : F,
  ): this {
    return this._addCheck(fn as (value: Output, ctx: CheckContext) => ValidateResult, false);
  }

  /** Adds an asynchronous rule; the schema then requires `parseAsync()` or `safeParseAsync()`. */
  checkAsync(fn: (value: Output, ctx: CheckContext) => Promise<ValidateResult>): this {
    return this._addCheck(fn, true);
  }

  private _addCheck(fn: (value: Output, ctx: CheckContext) => MaybePromise<ValidateResult>, async: boolean): this {
    const run = (value: unknown, ctx: RunContext): MaybePromise<Issue[] | null> => {
      const reported: Issue[] = [];
      const checkCtx: CheckContext = {
        addIssue: ({ path = [], ...rest }) => reported.push({ ...rest, path } as Issue),
      };

      return chain(fn(value as Output, checkCtx), (result) => checkIssues(result, reported, ctx.messages));
    };

    return this._with({ portable: false, steps: [...this.state.steps, { async, kind: 'check', run }] });
  }

  /**
   * Adds a built-in declarative constraint. `meta` returns the constraint's contribution to `definition()`.
   */
  protected _refine<M extends Record<string, unknown>>(
    test: (value: Output) => boolean,
    fail: (value: Output, messages: Messages) => Issue,
    meta?: (current: Partial<M>) => Partial<M>,
  ): this {
    const run = (value: unknown, ctx: RunContext) =>
      test(value as Output) ? null : [fail(value as Output, ctx.messages)];

    return this._with({
      meta: meta ? { ...this.state.meta, ...meta(this.state.meta as Partial<M>) } : this.state.meta,
      steps: [...this.state.steps, { async: false, kind: 'check', run }],
    });
  }

  /* -------------------- Modifiers -------------------- */

  optional(): Schema<Output | undefined, Input | undefined> & AcceptsMissing {
    return this._with({ optional: true }) as unknown as Schema<Output | undefined, Input | undefined> & AcceptsMissing;
  }

  nullable(): Schema<Output | null, Input | null> {
    return this._with({ nullable: true }) as unknown as Schema<Output | null, Input | null>;
  }

  nullish(): Schema<Output | null | undefined, Input | null | undefined> & AcceptsMissing {
    return this._with({ nullable: true, optional: true }) as unknown as Schema<
      Output | null | undefined,
      Input | null | undefined
    > &
      AcceptsMissing;
  }

  /** Rejects `undefined` again: clears `optional()` and `default()`. */
  required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>> {
    return this._with({ default: undefined, optional: false }) as unknown as Schema<
      Exclude<Output, undefined>,
      Exclude<Input, undefined>
    >;
  }

  /** Returns `value` (a fresh copy each time) for `undefined` input without parsing it. A function is a factory. */
  default(value: Output | (() => Output)): this & AcceptsMissing {
    const factory = typeof value === 'function' ? (value as () => Output) : () => materialize(value);

    return this._with({ default: factory, portable: false }) as this & AcceptsMissing;
  }

  /** Returns `fallback` (a fresh copy each time) whenever validation fails. A function is a factory. */
  catch(fallback: Output | (() => Output)): this & AcceptsMissing {
    const factory = typeof fallback === 'function' ? (fallback as () => Output) : () => materialize(fallback);

    return this._with({ catch: factory, portable: false }) as this & AcceptsMissing;
  }

  /** Maps the parsed value. Runs in chain order, only when no earlier check failed. */
  transform<Next>(fn: (value: Output) => Next): Schema<Next, Input> {
    const step: Step = { kind: 'transform', run: fn as (value: unknown) => unknown };

    return this._with({ portable: false, steps: [...this.state.steps, step] }) as unknown as Schema<Next, Input>;
  }

  /** Maps raw input before the type check, e.g. for coercion. */
  preprocess(fn: (value: unknown) => unknown): this {
    return this._with({ portable: false, preprocess: [...this.state.preprocess, fn] });
  }

  /** Feeds this schema's output into `next`. */
  pipe<Next extends AnySchema>(next: Next): PipeSchema<this, Next> {
    return new PipeSchema(this, next);
  }

  describe(description: string): this {
    return this._with({ description });
  }

  /* -------------------- Definitions -------------------- */

  /** Returns a frozen declarative descriptor; throws `SpellDefinitionError` when runtime-only behavior is attached. */
  definition(): SchemaDescriptor {
    if (!this.state.portable) {
      throw new SpellDefinitionError(
        'Schemas with custom checks, transforms, preprocessors, defaults, or catches have no declarative definition.',
      );
    }

    return deepFreeze(this._describe());
  }

  protected _describe(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'unknown' };
  }

  protected _describeBase(): { description?: string; isNullable?: true; isOptional?: true } {
    const { description, nullable, optional } = this.state;

    return {
      ...(description !== undefined && { description }),
      ...(nullable && { isNullable: true as const }),
      ...(optional && { isOptional: true as const }),
    };
  }

  /** Copy of this schema with `patch` merged into its state. */
  protected _with(patch: Partial<SchemaState>): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)) as this, this, {
      state: { ...this.state, ...patch },
    });
  }
}

/* -------------------- Pipe -------------------- */

export class PipeSchema<From extends AnySchema, To extends AnySchema> extends Schema<
  InferOutput<To>,
  InferInput<From>
> {
  readonly from: From;
  readonly to: To;

  constructor(from: From, to: To) {
    super();
    this.from = from;
    this.to = to;
  }

  override get kind(): SchemaKind {
    return 'pipe';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return chain(this.from._run(value, ctx), (first) =>
      first.issues.length > 0
        ? invalid(value, ...first.issues)
        : chain(this.to._run(first.value, ctx), (second) =>
            second.issues.length > 0 ? invalid(first.value, ...second.issues) : ok(second.value),
          ),
    );
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), from: this.from.definition(), kind: 'pipe', to: this.to.definition() };
  }
}
