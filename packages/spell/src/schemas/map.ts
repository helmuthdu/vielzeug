import type {
  AnySchema,
  InferInput,
  InferOutput,
  Issue,
  MessageFn,
  ParseContext,
  ParseValue,
  SchemaDescriptor,
} from '../core';

import { ErrorCode, fail, prependIssuePath, resolveMessage, Schema } from '../core';

export class MapSchema<K extends AnySchema, V extends AnySchema> extends Schema<
  Map<InferOutput<K>, InferOutput<V>>,
  Map<InferInput<K>, InferInput<V>>
> {
  readonly keySchema: K;
  readonly valueSchema: V;

  protected override get _kind(): string {
    return 'map';
  }

  constructor(keySchema: K, valueSchema: V) {
    super();
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    if (!(value instanceof Map)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: ctx.messages.map.type(), path: [] }],
        typeOk: false,
      };
    }

    const out = new Map<InferOutput<K>, InferOutput<V>>();
    const issues: Issue[] = [];
    let i = 0;

    for (const [key, val] of value) {
      const keyResult = this.keySchema._parseFullSync(key, ctx);
      const valResult = this.valueSchema._parseFullSync(val, ctx);

      if (keyResult.issues.length > 0) issues.push(...prependIssuePath(keyResult.issues, i));

      if (valResult.issues.length > 0) issues.push(...prependIssuePath(valResult.issues, i));

      if (keyResult.issues.length === 0 && valResult.issues.length === 0)
        out.set(keyResult.data as InferOutput<K>, valResult.data as InferOutput<V>);

      i += 1;
    }

    return { data: out, issues, typeOk: true };
  }

  protected override async _parseAsync(value: unknown, ctx: ParseContext): Promise<ParseValue> {
    if (!(value instanceof Map)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: ctx.messages.map.type(), path: [] }],
        typeOk: false,
      };
    }

    const entries = [...value];
    const settled = await Promise.all(
      entries.map(([key, val]) =>
        Promise.all([this.keySchema._parseFullAsync(key, ctx), this.valueSchema._parseFullAsync(val, ctx)]),
      ),
    );

    const issues: Issue[] = [];
    const out = new Map<InferOutput<K>, InferOutput<V>>();

    for (let i = 0; i < settled.length; i++) {
      const [keyResult, valResult] = settled[i];

      if (keyResult.issues.length > 0) issues.push(...prependIssuePath(keyResult.issues, i));

      if (valResult.issues.length > 0) issues.push(...prependIssuePath(valResult.issues, i));

      if (keyResult.issues.length === 0 && valResult.issues.length === 0)
        out.set(keyResult.data as InferOutput<K>, valResult.data as InferOutput<V>);
    }

    return { data: out, issues, typeOk: true };
  }

  min(size: number, message?: MessageFn<{ min: number; value: Map<unknown, unknown> }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Map<unknown, unknown>;

      if (typed.size >= size) return null;

      return fail(ErrorCode.too_small, resolveMessage(message ?? ctx!.messages.map.min, { min: size, value: typed }), {
        min: size,
      });
    });
  }

  max(size: number, message?: MessageFn<{ max: number; value: Map<unknown, unknown> }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Map<unknown, unknown>;

      if (typed.size <= size) return null;

      return fail(ErrorCode.too_big, resolveMessage(message ?? ctx!.messages.map.max, { max: size, value: typed }), {
        max: size,
      });
    });
  }

  size(exact: number, message?: MessageFn<{ exact: number; value: Map<unknown, unknown> }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Map<unknown, unknown>;

      if (typed.size === exact) return null;

      return fail(
        ErrorCode.invalid_length,
        resolveMessage(message ?? ctx!.messages.map.size, { exact, value: typed }),
        { exact },
      );
    });
  }

  nonEmpty(message?: MessageFn<{ min: number }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Map<unknown, unknown>;

      if (typed.size > 0) return null;

      return fail(ErrorCode.too_small, resolveMessage(message ?? ctx!.messages.map.nonEmpty, { min: 1 }), { min: 1 });
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      key: this.keySchema.definition(),
      kind: 'map',
      value: this.valueSchema.definition(),
    };
  }
}
