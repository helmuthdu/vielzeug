import type { AnySchema, InferOutput, Issue, MessageFn, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { _makeCtx, ErrorCode, fail, prependIssuePath, resolveMessage, Schema, SpellValidationError } from '../core';

export class MapSchema<
  K extends AnySchema,
  V extends AnySchema,
  Mode extends import('../core').SchemaMode = import('../core').MergeSchemaModes<
    import('../core').InferSchemaMode<K | V>
  >,
> extends Schema<Map<InferOutput<K>, InferOutput<V>>, unknown, Mode> {
  readonly keySchema: K;
  readonly valueSchema: V;

  protected override get _kind(): string {
    return 'map';
  }

  override checkAsync(
    this: MapSchema<K, V, 'sync'>,
    fn: (
      value: Map<InferOutput<K>, InferOutput<V>>,
      ctx: import('../core').CheckContext,
    ) => Promise<import('../core').ValidateResult>,
  ): MapSchema<K, V, 'async'> {
    return this._addCheck(fn, true) as unknown as MapSchema<K, V, 'async'>;
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

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<Map<InferOutput<K>, InferOutput<V>>> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as unknown as Map<InferOutput<K>, InferOutput<V>>;

      const raw = prepared.value;

      if (!(raw instanceof Map)) {
        throw new SpellValidationError([{ code: ErrorCode.invalid_type, message: c.messages.map.type(), path: [] }]);
      }

      const entries = [...raw];
      const settled = await Promise.all(
        entries.map(([key, val]) =>
          Promise.all([this.keySchema._parseFullAsync(key, c), this.valueSchema._parseFullAsync(val, c)]),
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

      const validationIssues = await this._runValidatorsAsync(out, c);
      const allIssues = [...issues, ...validationIssues];

      if (allIssues.length > 0) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(out) as Map<InferOutput<K>, InferOutput<V>>;
    });
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

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const key = this.keySchema.walk(visitor);
    const value = this.valueSchema.walk(visitor);

    if (visitor.map) return visitor.map(this, key, value);

    return super._walk(visitor);
  }
}
