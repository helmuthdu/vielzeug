import {
  all,
  atLeast,
  atMost,
  chain,
  invalid,
  issue,
  type MaybePromise,
  type ParseValue,
  prefixIssues,
  type RunContext,
  resolveMessage,
} from '../_parse';
import { Schema } from '../schema';
import {
  type AnySchema,
  ErrorCode,
  type InferInput,
  type InferOutput,
  type Issue,
  type MessageFn,
  type SchemaDescriptor,
  type SchemaKind,
} from '../types';

type ArrayMeta = { maxItems: number; minItems: number; uniqueItems: true };

type ItemsMessage<Ctx = object> = MessageFn<Ctx & { value: unknown[] }>;

export class ArraySchema<T extends AnySchema> extends Schema<InferOutput<T>[], InferInput<T>[]> {
  readonly itemSchema: T;

  constructor(itemSchema: T) {
    super();
    this.itemSchema = itemSchema;
  }

  override get kind(): SchemaKind {
    return 'array';
  }

  /** Item failures are reported per index; failed items keep their input value. */
  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    if (!Array.isArray(value)) return invalid(value, issue(ErrorCode.invalid_type, ctx.messages.array.type()));

    return chain(all(value.map((item) => this.itemSchema._run(item, ctx))), (results) => {
      const issues: Issue[] = [];
      const output = results.map((result, index) => {
        if (result.issues.length === 0) return result.value;

        issues.push(...prefixIssues(result.issues, index));

        return value[index];
      });

      return { issues, typeOk: true, value: output };
    });
  }

  min(length: number, message?: ItemsMessage<{ min: number }>): this {
    return this._refine<ArrayMeta>(
      (value) => value.length >= length,
      (value, m) =>
        issue(ErrorCode.too_small, resolveMessage(message ?? m.array.min, { min: length, value }), { min: length }),
      (current) => ({ minItems: atLeast(current.minItems, length) }),
    );
  }

  max(length: number, message?: ItemsMessage<{ max: number }>): this {
    return this._refine<ArrayMeta>(
      (value) => value.length <= length,
      (value, m) =>
        issue(ErrorCode.too_big, resolveMessage(message ?? m.array.max, { max: length, value }), { max: length }),
      (current) => ({ maxItems: atMost(current.maxItems, length) }),
    );
  }

  length(exact: number, message?: ItemsMessage<{ exact: number }>): this {
    return this._refine<ArrayMeta>(
      (value) => value.length === exact,
      (value, m) =>
        issue(ErrorCode.invalid_length, resolveMessage(message ?? m.array.length, { exact, value }), { exact }),
      (current) => ({ maxItems: atMost(current.maxItems, exact), minItems: atLeast(current.minItems, exact) }),
    );
  }

  nonEmpty(message?: ItemsMessage): this {
    return this._refine<ArrayMeta>(
      (value) => value.length > 0,
      (value, m) => issue(ErrorCode.too_small, resolveMessage(message ?? m.array.nonEmpty, { value }), { min: 1 }),
      (current) => ({ minItems: atLeast(current.minItems, 1) }),
    );
  }

  /**
   * Requires distinct items under `SameValueZero` (reference equality for objects), or distinct
   * `by(item)` keys. A `by` selector is runtime behavior, so `definition()` then throws.
   *
   * @example
   * s.array(s.object({ id: s.number() })).unique({ by: (item) => item.id })
   */
  unique(options: { by?: (item: InferOutput<T>) => unknown; message?: ItemsMessage } = {}): this {
    const { by, message } = options;
    const next = this._refine<ArrayMeta>(
      (value) => new Set(by ? value.map(by) : value).size === value.length,
      (value, m) => issue(ErrorCode.invalid_unique, resolveMessage(message ?? m.array.unique, { value })),
      by ? undefined : () => ({ uniqueItems: true }),
    );

    return by ? next._with({ portable: false }) : next;
  }

  protected override _describe(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      ...(this.state.meta as Partial<ArrayMeta>),
      items: this.itemSchema.definition(),
      kind: 'array',
    };
  }
}
