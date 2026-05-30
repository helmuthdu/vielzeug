import type { Issue, ParseResult, SchemaDescriptor } from '../core';
import type { ParseValue } from '../core';

import { ErrorCode, Schema, prependIssuePath } from '../core';
import { _messages } from '../messages';

export class MapSchema<K, V> extends Schema<Map<K, V>> {
  readonly keySchema: Schema<K, any>;
  readonly valueSchema: Schema<V, any>;

  constructor(keySchema: Schema<K, any>, valueSchema: Schema<V, any>) {
    super();
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  private _invalidMap(value: unknown): ParseValue {
    return {
      data: value,
      issues: [{ code: ErrorCode.invalid_type, message: _messages().map.type(), path: [] }],
      typeOk: false,
    };
  }

  private _applyEntryResult(
    out: Map<K, V>,
    issues: Issue[],
    index: number,
    keyResult: ParseResult<K>,
    valueResult: ParseResult<V>,
  ): void {
    if (!keyResult.success) issues.push(...prependIssuePath(keyResult.error.issues, index));

    if (!valueResult.success) issues.push(...prependIssuePath(valueResult.error.issues, index));

    if (keyResult.success && valueResult.success) out.set(keyResult.data, valueResult.data);
  }

  protected override _parseValueSync(value: unknown): ParseValue {
    if (!(value instanceof Map)) {
      return this._invalidMap(value);
    }

    const out = new Map<K, V>();
    const issues: Issue[] = [];
    let i = 0;

    for (const [key, val] of value) {
      const keyResult = this.keySchema.safeParse(key);
      const valResult = this.valueSchema.safeParse(val);

      this._applyEntryResult(out, issues, i, keyResult, valResult);

      i += 1;
    }

    return { data: out, issues, typeOk: true };
  }

  protected override async _parseValueAsync(value: unknown): Promise<ParseValue> {
    if (!(value instanceof Map)) {
      return this._invalidMap(value);
    }

    const entries = [...value.entries()];
    const out = new Map<K, V>();
    const issues: Issue[] = [];

    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i];
      const keyResult = await this.keySchema.safeParseAsync(key);
      const valResult = await this.valueSchema.safeParseAsync(val);

      this._applyEntryResult(out, issues, i, keyResult, valResult);
    }

    return { data: out, issues, typeOk: true };
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    return { $comment: 'Map<K,V> — no JSON Schema equivalent' };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      key: this.keySchema.toDescriptor(),
      kind: 'map',
      value: this.valueSchema.toDescriptor(),
    };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
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
