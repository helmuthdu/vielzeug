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

export class MapSchema<K extends AnySchema, V extends AnySchema> extends Schema<
  Map<InferOutput<K>, InferOutput<V>>,
  Map<InferInput<K>, InferInput<V>>
> {
  readonly keySchema: K;
  readonly valueSchema: V;

  constructor(keySchema: K, valueSchema: V) {
    super();
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  override get kind(): SchemaKind {
    return 'map';
  }

  /** Key and value failures are reported by entry index; failed entries are left out of the parsed map. */
  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    if (!(value instanceof Map)) return invalid(value, issue(ErrorCode.invalid_type, ctx.messages.map.type()));

    const runs = [...value].map(([key, entry]) =>
      all([this.keySchema._run(key, ctx), this.valueSchema._run(entry, ctx)]),
    );

    return chain(all(runs), (results) => {
      const issues: Issue[] = [];
      const output = new Map<unknown, unknown>();

      results.forEach(([key, entry], index) => {
        issues.push(...prefixIssues(key!.issues, index), ...prefixIssues(entry!.issues, index));

        if (key!.issues.length === 0 && entry!.issues.length === 0) output.set(key!.value, entry!.value);
      });

      return { issues, typeOk: true, value: output };
    });
  }

  min(size: number, message?: MessageFn<{ min: number; value: Map<unknown, unknown> }>): this {
    return this._refine<SizeMeta>(
      (value) => value.size >= size,
      (value, m) =>
        issue(ErrorCode.too_small, resolveMessage(message ?? m.map.min, { min: size, value }), { min: size }),
      (current) => ({ minSize: atLeast(current.minSize, size) }),
    );
  }

  max(size: number, message?: MessageFn<{ max: number; value: Map<unknown, unknown> }>): this {
    return this._refine<SizeMeta>(
      (value) => value.size <= size,
      (value, m) => issue(ErrorCode.too_big, resolveMessage(message ?? m.map.max, { max: size, value }), { max: size }),
      (current) => ({ maxSize: atMost(current.maxSize, size) }),
    );
  }

  size(exact: number, message?: MessageFn<{ exact: number; value: Map<unknown, unknown> }>): this {
    return this._refine<SizeMeta>(
      (value) => value.size === exact,
      (value, m) => issue(ErrorCode.invalid_length, resolveMessage(message ?? m.map.size, { exact, value }), { exact }),
      (current) => ({ maxSize: atMost(current.maxSize, exact), minSize: atLeast(current.minSize, exact) }),
    );
  }

  nonEmpty(message?: MessageFn<{ value: Map<unknown, unknown> }>): this {
    return this._refine<SizeMeta>(
      (value) => value.size > 0,
      (value, m) => issue(ErrorCode.too_small, resolveMessage(message ?? m.map.nonEmpty, { value }), { min: 1 }),
      (current) => ({ minSize: atLeast(current.minSize, 1) }),
    );
  }

  protected override _describe(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      ...(this.state.meta as Partial<SizeMeta>),
      key: this.keySchema.definition(),
      kind: 'map',
      value: this.valueSchema.definition(),
    };
  }
}
