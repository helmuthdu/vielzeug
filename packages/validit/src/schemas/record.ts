import type { Issue } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';

export class RecordSchema<K extends string, V> extends Schema<Record<K, V>> {
  private readonly keySchema: Schema<K>;
  private readonly valueSchema: Schema<V>;

  constructor(keySchema: Schema<K>, valueSchema: Schema<V>) {
    super([]);
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
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
        output[key] = valResult.data;
      } else {
        issues.push(...prependIssuePath(valResult.error.issues, key));
      }
    }

    return { issues, output };
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: _messages().object_type(), path: [] }],
      };
    }

    const { issues, output } = this._parseRecordEntries(value as Record<string, unknown>);

    return { data: output, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: _messages().object_type(), path: [] }],
      };
    }

    const obj = value as Record<string, unknown>;
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

export const record = <K extends string, V>(keySchema: Schema<K>, valueSchema: Schema<V>): RecordSchema<K, V> =>
  new RecordSchema(keySchema, valueSchema);
