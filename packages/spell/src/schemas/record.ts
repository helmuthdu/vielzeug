import type { AnySchema, InferInput, InferOutput, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { defineOwnProperty, isUnsafeObjectKey } from '../safe-object';

export class RecordSchema<K extends AnySchema, V extends AnySchema> extends Schema<
  Record<InferOutput<K> & string, InferOutput<V>>,
  Record<InferInput<K> & string, InferInput<V>>
> {
  readonly keySchema: K;
  readonly valueSchema: V;

  protected override get _kind(): string {
    return 'record';
  }

  constructor(keySchema: K, valueSchema: V) {
    super();
    this.keySchema = keySchema;
    this.valueSchema = valueSchema;
  }

  private _guardRecordInput(
    value: unknown,
    ctx: ParseContext,
  ): { ok: true; value: Record<string, unknown> } | { issues: Issue[]; ok: false } {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        issues: [{ code: ErrorCode.invalid_type, message: ctx.messages.object.type(), path: [] }],
        ok: false,
      };
    }

    return { ok: true, value: value as Record<string, unknown> };
  }

  private _parseRecordEntries(
    obj: Record<string, unknown>,
    ctx: ParseContext,
  ): { issues: Issue[]; output: Record<string, unknown> } {
    const issues: Issue[] = [];
    const output: Record<string, unknown> = {};

    for (const key of Object.keys(obj)) {
      const keyResult = this.keySchema._parseFullSync(key, ctx);

      if (keyResult.issues.length > 0) {
        issues.push(...prependIssuePath(keyResult.issues, key));
        continue;
      }

      const parsedKey = keyResult.data as string;

      // Skip keys that trigger inherited setters (e.g. __proto__) to prevent
      // prototype mutation on the output object.
      if (isUnsafeObjectKey(parsedKey)) continue;

      const valResult = this.valueSchema._parseFullSync(obj[key], ctx);

      if (valResult.issues.length === 0) {
        defineOwnProperty(output, parsedKey, valResult.data);
      } else {
        issues.push(...prependIssuePath(valResult.issues, key));
      }
    }

    return { issues, output };
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    const guarded = this._guardRecordInput(value, ctx);

    if (!guarded.ok) return { data: value, issues: guarded.issues, typeOk: false };

    const { issues, output } = this._parseRecordEntries(guarded.value, ctx);

    return { data: output, issues, typeOk: true };
  }

  protected override async _parseAsync(value: unknown, ctx: ParseContext): Promise<ParseValue> {
    const guarded = this._guardRecordInput(value, ctx);

    if (!guarded.ok) return { data: value, issues: guarded.issues, typeOk: false };

    const obj = guarded.value;
    const keys = Object.keys(obj);
    const settled = await Promise.all(
      keys.map((key) =>
        Promise.all([this.keySchema._parseFullAsync(key, ctx), this.valueSchema._parseFullAsync(obj[key], ctx)]),
      ),
    );

    const issues: Issue[] = [];
    const output: Record<string, unknown> = {};

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const [keyResult, valResult] = settled[i];

      if (keyResult.issues.length > 0) {
        issues.push(...prependIssuePath(keyResult.issues, key));
        continue;
      }

      const parsedKey = keyResult.data as string;

      // Skip keys that trigger inherited setters (e.g. __proto__) to prevent
      // prototype mutation on the output object.
      if (isUnsafeObjectKey(parsedKey)) continue;

      if (valResult.issues.length === 0) {
        defineOwnProperty(output, parsedKey, valResult.data);
      } else {
        issues.push(...prependIssuePath(valResult.issues, key));
      }
    }

    return { data: output, issues, typeOk: true };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      key: this.keySchema.definition(),
      kind: 'record',
      value: this.valueSchema.definition(),
    };
  }
}
