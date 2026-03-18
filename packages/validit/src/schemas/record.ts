import type { Issue } from '../core';

import { ErrorCode, Schema, ValidationError } from '../core';
import { _messages } from '../messages';

export class RecordSchema<K extends string, V> extends Schema<Record<K, V>> {
  private readonly keySchema: Schema<K>;
  private readonly valueSchema: Schema<V>;

  constructor(keySchema: Schema<K>, valueSchema: Schema<V>) {
    super([]);
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  override parse(value: unknown): Record<K, V> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (this._isOptional && processed === undefined) return undefined as unknown as Record<K, V>;

      if (this._isNullable && processed === null) return null as unknown as Record<K, V>;

      if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: _messages().object_type(), path: [] }]);
      }

      const { issues, output } = this._parseRecordEntries(processed as Record<string, unknown>);

      for (const validate of this._validators) {
        const extra = validate(output, []);

        if (extra) issues.push(...extra);
      }

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), output) as Record<K, V>;
    });
  }

  private _parseRecordEntries(obj: Record<string, unknown>): { issues: Issue[]; output: Record<string, unknown> } {
    const issues: Issue[] = [];
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      const keyResult = this.keySchema.safeParse(key);

      if (!keyResult.success) {
        issues.push(...keyResult.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })));
        continue;
      }

      const valResult = this.valueSchema.safeParse(obj[key]);

      if (valResult.success) {
        output[key] = valResult.data;
      } else {
        issues.push(...valResult.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })));
      }
    }

    return { issues, output };
  }

  override async parseAsync(value: unknown): Promise<Record<K, V>> {
    return this._withCatchAsync(async () => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (this._isOptional && processed === undefined) return undefined as unknown as Record<K, V>;

      if (this._isNullable && processed === null) return null as unknown as Record<K, V>;

      if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: _messages().object_type(), path: [] }]);
      }

      const obj = processed as Record<string, unknown>;
      const keys = Object.keys(obj);
      const entryResults = await Promise.all(
        keys.map((key) =>
          Promise.all([this.keySchema.safeParseAsync(key), this.valueSchema.safeParseAsync(obj[key])]).then(
            ([keyResult, valResult]) => ({
              key,
              keyIssues: keyResult.success ? [] : keyResult.error.issues.map((i) => ({ ...i, path: [key, ...i.path] })),
              parsedKey: keyResult.success ? keyResult.data : key,
              parsedVal: valResult.success ? valResult.data : obj[key],
              valIssues: valResult.success ? [] : valResult.error.issues.map((i) => ({ ...i, path: [key, ...i.path] })),
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

      const syncIssues: Issue[] = [];

      for (const validate of this._validators) {
        const extra = validate(output, []);

        if (extra) syncIssues.push(...extra);
      }
      issues.push(...syncIssues, ...(await this._runAsync(output, [])));

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), output) as Record<K, V>;
    });
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).keySchema = this.keySchema;
    (cloned as any).valueSchema = this.valueSchema;

    return cloned;
  }
}

export const record = <K extends string, V>(keySchema: Schema<K>, valueSchema: Schema<V>): RecordSchema<K, V> =>
  new RecordSchema(keySchema, valueSchema);
