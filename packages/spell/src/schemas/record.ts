import type { Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';
import { isUnsafeObjectKey } from '../safe-object';

export class RecordSchema<K extends string, V> extends Schema<Record<K, V>> {
  readonly keySchema: Schema<K, any>;
  readonly valueSchema: Schema<V, any>;

  protected override get _kind(): string {
    return 'record';
  }

  constructor(keySchema: Schema<K, any>, valueSchema: Schema<V, any>) {
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
        Object.defineProperty(output, parsedKey, {
          configurable: true,
          enumerable: true,
          value: valResult.data,
          writable: true,
        });
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

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      key: this.keySchema.toDescriptor(),
      kind: 'record',
      value: this.valueSchema.toDescriptor(),
    };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const key = this.keySchema.walk(visitor);
    const value = this.valueSchema.walk(visitor);

    if (visitor.record) return visitor.record(this, key, value);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof RecordSchema)) return false;

    return this.keySchema.equals(other.keySchema) && this.valueSchema.equals(other.valueSchema);
  }
}
