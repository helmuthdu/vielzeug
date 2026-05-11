import type { Issue, ParseResult, Schema as BaseSchema } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';

export class MapSchema<K, V> extends Schema<Map<K, V>> {
  private readonly keySchema: BaseSchema<K>;
  private readonly valueSchema: BaseSchema<V>;

  constructor(keySchema: BaseSchema<K>, valueSchema: BaseSchema<V>) {
    super([]);
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  private _invalidMap(value: unknown): { data: unknown; issues: Issue[] } {
    return {
      data: value,
      issues: [{ code: ErrorCode.invalid_type, message: 'Expected map', path: [] }],
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
}
