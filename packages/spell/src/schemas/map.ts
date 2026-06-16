import type { Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
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
