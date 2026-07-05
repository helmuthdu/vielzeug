import type { AnySchema, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, prependIssuePath, Schema, SpellValidationError, _makeCtx } from '../core';
import { _messages } from '../messages';

export type TupleSchemas = readonly [AnySchema, ...AnySchema[]];
export type InferTuple<T extends TupleSchemas, R extends AnySchema | null = null> =
  R extends Schema<infer O>
    ? readonly [...{ [K in keyof T]: T[K] extends Schema<infer V> ? V : never }, ...O[]]
    : { readonly [K in keyof T]: T[K] extends Schema<infer V> ? V : never };

export class TupleSchema<T extends TupleSchemas, R extends AnySchema | null = null> extends Schema<InferTuple<T, R>> {
  readonly items: T;
  readonly restSchema: R;

  protected override get _kind(): string {
    return 'tuple';
  }

  constructor(items: T, restSchema: R = null as R) {
    super();
    this.items = items;
    this.restSchema = restSchema;
  }

  rest<U>(schema: Schema<U>): TupleSchema<T, Schema<U>> {
    return this._copyStateTo(new TupleSchema(this.items, schema));
  }

  private _guardTupleInput(
    value: unknown[],
    ctx: ParseContext,
  ): { ok: true; value: unknown[] } | { issues: Issue[]; ok: false } {
    if (this.restSchema === null && value.length !== this.items.length) {
      return {
        issues: [
          {
            code: ErrorCode.invalid_length,
            message: ctx.messages.tuple.length({ exact: this.items.length }),
            params: { exact: this.items.length },
            path: [],
          },
        ],
        ok: false,
      };
    }

    if (this.restSchema !== null && value.length < this.items.length) {
      return {
        issues: [
          {
            code: ErrorCode.too_small,
            message: ctx.messages.tuple.min({ min: this.items.length }),
            params: { min: this.items.length },
            path: [],
          },
        ],
        ok: false,
      };
    }

    return { ok: true, value };
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    if (!Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: ctx.messages.tuple.type(), path: [] }],
        typeOk: false,
      };
    }

    const guarded = this._guardTupleInput(value, ctx);

    if (!guarded.ok) return { data: value, issues: guarded.issues, typeOk: false };

    const issues: Issue[] = [];
    const output: unknown[] = [];
    const tupleValue = guarded.value;

    for (let i = 0; i < this.items.length; i++) {
      const result = this.items[i]._parseFullSync(tupleValue[i], ctx);

      if (result.issues.length === 0) {
        output.push(result.data);
      } else {
        issues.push(...prependIssuePath(result.issues, i));
        output.push(tupleValue[i]);
      }
    }

    if (this.restSchema !== null) {
      for (let i = this.items.length; i < tupleValue.length; i++) {
        const result = this.restSchema._parseFullSync(tupleValue[i], ctx);

        if (result.issues.length === 0) {
          output.push(result.data);
        } else {
          issues.push(...prependIssuePath(result.issues, i));
          output.push(tupleValue[i]);
        }
      }
    }

    return { data: output, issues, typeOk: true };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<InferTuple<T, R>> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as unknown as InferTuple<T, R>;

      const raw = prepared.value;

      if (!Array.isArray(raw)) {
        throw new SpellValidationError([{ code: ErrorCode.invalid_type, message: c.messages.tuple.type(), path: [] }]);
      }

      const guarded = this._guardTupleInput(raw, c);

      if (!guarded.ok) throw new SpellValidationError(guarded.issues);

      const tupleValue = guarded.value;
      const issues: Issue[] = [];
      const output: unknown[] = [];

      const fixedResults = await Promise.all(this.items.map((schema, i) => schema._parseFullAsync(tupleValue[i], c)));

      for (let i = 0; i < fixedResults.length; i++) {
        const result = fixedResults[i];

        if (result.issues.length === 0) {
          output.push(result.data);
        } else {
          issues.push(...prependIssuePath(result.issues, i));
          output.push(tupleValue[i]);
        }
      }

      const rest = this.restSchema;

      if (rest !== null) {
        const restItems = tupleValue.slice(this.items.length);
        const restResults = await Promise.all(restItems.map((item) => rest._parseFullAsync(item, c)));

        for (let i = 0; i < restResults.length; i++) {
          const result = restResults[i];
          const idx = this.items.length + i;

          if (result.issues.length === 0) {
            output.push(result.data);
          } else {
            issues.push(...prependIssuePath(result.issues, idx));
            output.push(tupleValue[idx]);
          }
        }
      }

      const validationIssues = await this._runValidatorsAsync(output, c);
      const allIssues = [...issues, ...validationIssues];

      if (allIssues.length > 0) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(output) as InferTuple<T, R>;
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      items: this.items.map((s) => s.toDescriptor()),
      kind: 'tuple',
      rest: this.restSchema !== null ? this.restSchema.toDescriptor() : null,
    };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const items = this.items.map((s) => s.walk(visitor));
    const rest = this.restSchema !== null ? this.restSchema.walk(visitor) : null;

    if (visitor.tuple) return visitor.tuple(this, items, rest);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof TupleSchema)) return false;

    if (this.items.length !== other.items.length) return false;

    for (let i = 0; i < this.items.length; i++) {
      if (!this.items[i].equals(other.items[i])) return false;
    }

    const rs = this.restSchema;
    const ors = other.restSchema;

    if ((rs === null) !== (ors === null)) return false;

    if (rs !== null && ors !== null && !rs.equals(ors)) return false;

    return true;
  }
}
