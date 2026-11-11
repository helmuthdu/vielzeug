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

type SizeMeta = { maxSize: number; minSize: number };

export class SetSchema<T extends AnySchema> extends Schema<Set<InferOutput<T>>, Set<InferInput<T>>> {
  readonly itemSchema: T;

  constructor(itemSchema: T) {
    super();
    this.itemSchema = itemSchema;
  }

  override get kind(): SchemaKind {
    return 'set';
  }

  /** Item failures are reported by iteration index; failed items are left out of the parsed set. */
  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    if (!(value instanceof Set)) return invalid(value, issue(ErrorCode.invalid_type, ctx.messages.set.type()));

    return chain(all([...value].map((item) => this.itemSchema._run(item, ctx))), (results) => {
      const issues: Issue[] = [];
      const output = new Set<unknown>();

      results.forEach((result, index) => {
        if (result.issues.length === 0) output.add(result.value);
        else issues.push(...prefixIssues(result.issues, index));
      });

      return { issues, typeOk: true, value: output };
    });
  }

  min(size: number, message?: MessageFn<{ min: number; value: Set<unknown> }>): this {
    return this._refine<SizeMeta>(
      (value) => value.size >= size,
      (value, m) =>
        issue(ErrorCode.too_small, resolveMessage(message ?? m.set.min, { min: size, value }), { min: size }),
      (current) => ({ minSize: atLeast(current.minSize, size) }),
    );
  }

  max(size: number, message?: MessageFn<{ max: number; value: Set<unknown> }>): this {
    return this._refine<SizeMeta>(
      (value) => value.size <= size,
      (value, m) => issue(ErrorCode.too_big, resolveMessage(message ?? m.set.max, { max: size, value }), { max: size }),
      (current) => ({ maxSize: atMost(current.maxSize, size) }),
    );
  }

  size(exact: number, message?: MessageFn<{ exact: number; value: Set<unknown> }>): this {
    return this._refine<SizeMeta>(
      (value) => value.size === exact,
      (value, m) => issue(ErrorCode.invalid_length, resolveMessage(message ?? m.set.size, { exact, value }), { exact }),
      (current) => ({ maxSize: atMost(current.maxSize, exact), minSize: atLeast(current.minSize, exact) }),
    );
  }

  nonEmpty(message?: MessageFn<{ value: Set<unknown> }>): this {
    return this._refine<SizeMeta>(
      (value) => value.size > 0,
      (value, m) => issue(ErrorCode.too_small, resolveMessage(message ?? m.set.nonEmpty, { value }), { min: 1 }),
      (current) => ({ minSize: atLeast(current.minSize, 1) }),
    );
  }

  protected override _describe(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      ...(this.state.meta as Partial<SizeMeta>),
      items: this.itemSchema.definition(),
      kind: 'set',
    };
  }
}
