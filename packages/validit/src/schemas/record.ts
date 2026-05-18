import type { Issue } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';

export class RecordSchema<K extends string, V> extends Schema<Record<K, V>> {
  readonly keySchema: Schema<K, any, any, any>;
  readonly valueSchema: Schema<V, any, any, any>;

  constructor(keySchema: Schema<K, any, any, any>, valueSchema: Schema<V, any, any, any>) {
    super([]);
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  private _guardRecordInput(
    value: unknown,
  ): { ok: true; value: Record<string, unknown> } | { issues: Issue[]; ok: false } {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        issues: [{ code: ErrorCode.invalid_type, message: _messages().object.type(), path: [] }],
        ok: false,
      };
    }

    return { ok: true, value: value as Record<string, unknown> };
  }

  private _parseRecordEntries(obj: Record<string, unknown>): { issues: Issue[]; output: Record<string, unknown> } {
    const issues: Issue[] = [];
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      const keyResult = this.keySchema.safeParse(key);

      if (!keyResult.success) {
        issues.push(...prependIssuePath(keyResult.error.issues, key));
        continue;
      }

      const valResult = this.valueSchema.safeParse(obj[key]);

      if (valResult.success) {
        output[keyResult.data] = valResult.data;
      } else {
        issues.push(...prependIssuePath(valResult.error.issues, key));
      }
    }

    return { issues, output };
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const guarded = this._guardRecordInput(value);

    if (!guarded.ok) return { data: value, issues: guarded.issues };

    const { issues, output } = this._parseRecordEntries(guarded.value);

    return { data: output, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const guarded = this._guardRecordInput(value);

    if (!guarded.ok) return { data: value, issues: guarded.issues };

    const obj = guarded.value;
    const keys = Object.keys(obj);
    const entryResults = await Promise.all(
      keys.map((key) =>
        Promise.all([this.keySchema.safeParseAsync(key), this.valueSchema.safeParseAsync(obj[key])]).then(
          ([keyResult, valResult]) => ({
            key,
            keyIssues: keyResult.success ? [] : prependIssuePath(keyResult.error.issues, key),
            parsedKey: keyResult.success ? keyResult.data : key,
            parsedVal: valResult.success ? valResult.data : obj[key],
            valIssues: valResult.success ? [] : prependIssuePath(valResult.error.issues, key),
          }),
        ),
      ),
    );
    const output: Record<string, unknown> = {};
    const issues: Issue[] = [];

    for (const r of entryResults) {
      issues.push(...r.keyIssues, ...r.valIssues);

      if (r.keyIssues.length === 0 && r.valIssues.length === 0) output[r.parsedKey as string] = r.parsedVal;
    }

    return { data: output, issues };
  }
}
