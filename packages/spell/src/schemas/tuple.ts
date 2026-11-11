import {
  all,
  chain,
  invalid,
  issue,
  type MaybePromise,
  type ParseValue,
  prefixIssues,
  type RunContext,
} from '../_parse';
import { Schema } from '../schema';
import {
  type AnySchema,
  ErrorCode,
  type InferInput,
  type InferOutput,
  type Issue,
  type SchemaDescriptor,
  type SchemaKind,
} from '../types';

export type TupleSchemas = readonly [AnySchema, ...AnySchema[]];

type InferTuple<T extends TupleSchemas, R extends AnySchema | null> = R extends AnySchema
  ? readonly [...{ [K in keyof T]: InferOutput<T[K]> }, ...InferOutput<R>[]]
  : { readonly [K in keyof T]: InferOutput<T[K]> };

type InferTupleInput<T extends TupleSchemas, R extends AnySchema | null> = R extends AnySchema
  ? readonly [...{ [K in keyof T]: InferInput<T[K]> }, ...InferInput<R>[]]
  : { readonly [K in keyof T]: InferInput<T[K]> };

export class TupleSchema<T extends TupleSchemas, R extends AnySchema | null = null> extends Schema<
  InferTuple<T, R>,
  InferTupleInput<T, R>
> {
  readonly items: T;
  readonly restSchema: R;

  constructor(items: T, restSchema: R = null as R) {
    super();
    this.items = Object.freeze([...items]) as unknown as T;
    this.restSchema = restSchema;
  }

  override get kind(): SchemaKind {
    return 'tuple';
  }

  /** Accepts any number of trailing items matching `schema`. Keeps this tuple's checks and modifiers. */
  rest<U extends AnySchema>(schema: U): TupleSchema<T, U> {
    const next = new TupleSchema(this.items, schema);

    next.state = this.state;

    return next;
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    const { messages } = ctx;
    const fixed = this.items.length;

    if (!Array.isArray(value)) return invalid(value, issue(ErrorCode.invalid_type, messages.tuple.type()));

    if (this.restSchema === null && value.length !== fixed) {
      return invalid(value, issue(ErrorCode.invalid_length, messages.tuple.length({ exact: fixed }), { exact: fixed }));
    }

    if (value.length < fixed) {
      return invalid(value, issue(ErrorCode.too_small, messages.tuple.min({ min: fixed }), { min: fixed }));
    }

    const rest = this.restSchema;
    const runs = value.map((item, index) => (index < fixed ? this.items[index]! : rest!)._run(item, ctx));

    return chain(all(runs), (results) => {
      const issues: Issue[] = [];
      const output = results.map((result, index) => {
        if (result.issues.length === 0) return result.value;

        issues.push(...prefixIssues(result.issues, index));

        return value[index];
      });

      return { issues, typeOk: true, value: output };
    });
  }

  protected override _describe(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      items: this.items.map((schema) => schema.definition()),
      kind: 'tuple',
      rest: this.restSchema?.definition() ?? null,
    };
  }
}
