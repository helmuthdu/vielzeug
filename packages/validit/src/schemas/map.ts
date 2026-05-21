import type { Issue, ParseResult, Schema as BaseSchema } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';

export class MapSchema<K, V> extends Schema<Map<K, V>> {
  readonly keySchema: BaseSchema<K, any>;
  readonly valueSchema: BaseSchema<V, any>;

  constructor(keySchema: BaseSchema<K, any>, valueSchema: BaseSchema<V, any>) {
    super();
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  private _invalidMap(value: unknown): { data: unknown; issues: Issue[] } {
    return {
      data: value,
      issues: [{ code: ErrorCode.invalid_type, message: _messages().map.type(), path: [] }],
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

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
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

    return { data: out, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
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

    return { data: out, issues };
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
