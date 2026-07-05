import type { Issue, MessageFn, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, fail, prependIssuePath, resolveMessage, Schema, SpellValidationError, _makeCtx } from '../core';
import { _messages } from '../messages';

export class MapSchema<K, V> extends Schema<Map<K, V>> {
  readonly keySchema: Schema<K, any>;
  readonly valueSchema: Schema<V, any>;

  protected override get _kind(): string {
    return 'map';
  }

  constructor(keySchema: Schema<K, any>, valueSchema: Schema<V, any>) {
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

    const out = new Map<K, V>();
    const issues: Issue[] = [];
    let i = 0;

    for (const [key, val] of value) {
      const keyResult = this.keySchema._parseFullSync(key, ctx);
      const valResult = this.valueSchema._parseFullSync(val, ctx);

      if (keyResult.issues.length > 0) issues.push(...prependIssuePath(keyResult.issues, i));

      if (valResult.issues.length > 0) issues.push(...prependIssuePath(valResult.issues, i));

      if (keyResult.issues.length === 0 && valResult.issues.length === 0)
        out.set(keyResult.data as K, valResult.data as V);

      i += 1;
    }

    return { data: out, issues, typeOk: true };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<Map<K, V>> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as unknown as Map<K, V>;

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
      const out = new Map<K, V>();

      for (let i = 0; i < settled.length; i++) {
        const [keyResult, valResult] = settled[i];

        if (keyResult.issues.length > 0) issues.push(...prependIssuePath(keyResult.issues, i));

        if (valResult.issues.length > 0) issues.push(...prependIssuePath(valResult.issues, i));

        if (keyResult.issues.length === 0 && valResult.issues.length === 0)
          out.set(keyResult.data as K, valResult.data as V);
      }

      const validationIssues = await this._runValidatorsAsync(out, c);
      const allIssues = [...issues, ...validationIssues];

      if (allIssues.length > 0) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(out) as Map<K, V>;
    });
  }

  min(
    size: number,
    message: MessageFn<{ min: number; value: Map<unknown, unknown> }> = (ctx) => _messages().map.min(ctx),
  ): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Map<unknown, unknown>;

      if (typed.size >= size) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: size, value: typed }), { min: size });
    });
  }

  max(
    size: number,
    message: MessageFn<{ max: number; value: Map<unknown, unknown> }> = (ctx) => _messages().map.max(ctx),
  ): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Map<unknown, unknown>;

      if (typed.size <= size) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { max: size, value: typed }), { max: size });
    });
  }

  size(
    exact: number,
    message: MessageFn<{ exact: number; value: Map<unknown, unknown> }> = (ctx) => _messages().map.size(ctx),
  ): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Map<unknown, unknown>;

      if (typed.size === exact) return null;

      return fail(ErrorCode.invalid_length, resolveMessage(message, { exact, value: typed }), { exact });
    });
  }

  nonEmpty(message: MessageFn<{ min: number }> = () => _messages().map.nonEmpty()): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Map<unknown, unknown>;

      if (typed.size > 0) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: 1 }), { min: 1 });
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      key: this.keySchema.toDescriptor(),
      kind: 'map',
      value: this.valueSchema.toDescriptor(),
    };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const key = this.keySchema.walk(visitor);
    const value = this.valueSchema.walk(visitor);

    if (visitor.map) return visitor.map(this, key, value);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof MapSchema)) return false;

    return this.keySchema.equals(other.keySchema) && this.valueSchema.equals(other.valueSchema);
  }
}
