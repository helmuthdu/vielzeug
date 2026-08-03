import type { AnySchema, InferOutput, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, prependIssuePath, Schema, SpellValidationError, _makeCtx } from '../core';
import { isUnsafeObjectKey } from '../safe-object';

export class RecordSchema<
  K extends AnySchema,
  V extends AnySchema,
  Mode extends import('../core').SchemaMode = import('../core').MergeSchemaModes<
    import('../core').InferSchemaMode<K | V>
  >,
> extends Schema<Record<InferOutput<K> & string, InferOutput<V>>, unknown, Mode> {
  readonly keySchema: K;
  readonly valueSchema: V;

  protected override get _kind(): string {
    return 'record';
  }

  override checkAsync(
    this: RecordSchema<K, V, 'sync'>,
    fn: (
      value: Record<InferOutput<K> & string, InferOutput<V>>,
      ctx: import('../core').CheckContext,
    ) => Promise<import('../core').ValidateResult>,
  ): RecordSchema<K, V, 'async'> {
    return this._addCheck(fn, true) as unknown as RecordSchema<K, V, 'async'>;
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

  override async parseAsync(
    value: unknown,
    ctx?: ParseContext,
  ): Promise<Record<InferOutput<K> & string, InferOutput<V>>> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as unknown as Record<InferOutput<K> & string, InferOutput<V>>;

      const guarded = this._guardRecordInput(prepared.value, c);

      if (!guarded.ok) throw new SpellValidationError(guarded.issues);

      const obj = guarded.value;
      const keys = Object.keys(obj);
      const settled = await Promise.all(
        keys.map((key) =>
          Promise.all([this.keySchema._parseFullAsync(key, c), this.valueSchema._parseFullAsync(obj[key], c)]),
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

      const validationIssues = await this._runValidatorsAsync(output, c);
      const allIssues = [...issues, ...validationIssues];

      if (allIssues.length > 0) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(output) as Record<InferOutput<K> & string, InferOutput<V>>;
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      key: this.keySchema.definition(),
      kind: 'record',
      value: this.valueSchema.definition(),
    };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const key = this.keySchema.walk(visitor);
    const value = this.valueSchema.walk(visitor);

    if (visitor.record) return visitor.record(this, key, value);

    return super._walk(visitor);
  }
}
