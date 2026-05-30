import type { AnySchema, Issue, ParseResult, SchemaDescriptor } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';

export type TupleSchemas = readonly [AnySchema, ...AnySchema[]];
export type InferTuple<T extends TupleSchemas, R extends AnySchema | null = null> =
  R extends Schema<infer O>
    ? readonly [...{ [K in keyof T]: T[K] extends Schema<infer V> ? V : never }, ...O[]]
    : { readonly [K in keyof T]: T[K] extends Schema<infer V> ? V : never };

export class TupleSchema<T extends TupleSchemas, R extends AnySchema | null = null> extends Schema<InferTuple<T, R>> {
  readonly items: T;
  readonly restSchema: R;

  constructor(items: T, restSchema: R = null as R) {
    super();
    this.items = items;
    this.restSchema = restSchema;
  }

  private _pushTupleItemResult(
    output: unknown[],
    issues: Issue[],
    index: number,
    source: unknown,
    result: ParseResult<unknown>,
  ): void {
    if (result.success) {
      output.push(result.data);
    } else {
      issues.push(...prependIssuePath(result.error.issues, index));
      output.push(source);
    }
  }

  rest<U>(schema: Schema<U>): TupleSchema<T, Schema<U>> {
    return this._copyStateTo(new TupleSchema(this.items, schema));
  }

  private _guardTupleInput(value: unknown): { ok: true; value: unknown[] } | { issues: Issue[]; ok: false } {
    if (!Array.isArray(value)) {
      return {
        issues: [{ code: ErrorCode.invalid_type, message: _messages().tuple.type(), path: [] }],
        ok: false,
      };
    }

    if (this.restSchema === null && value.length !== this.items.length) {
      return {
        issues: [
          {
            code: ErrorCode.invalid_length,
            message: _messages().tuple.length({ exact: this.items.length }),
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
            message: _messages().tuple.min({ min: this.items.length }),
            params: { min: this.items.length },
            path: [],
          },
        ],
        ok: false,
      };
    }

    return { ok: true, value };
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const guarded = this._guardTupleInput(value);

    if (!guarded.ok) return { data: value, issues: guarded.issues };

    const issues: Issue[] = [];
    const output: unknown[] = [];
    const tupleValue = guarded.value;

    for (let i = 0; i < this.items.length; i++) {
      const result = this.items[i].safeParse(tupleValue[i]);

      this._pushTupleItemResult(output, issues, i, tupleValue[i], result);
    }

    if (this.restSchema !== null) {
      for (let i = this.items.length; i < tupleValue.length; i++) {
        const result = this.restSchema.safeParse(tupleValue[i]);

        this._pushTupleItemResult(output, issues, i, tupleValue[i], result);
      }
    }

    return { data: output, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const guarded = this._guardTupleInput(value);

    if (!guarded.ok) return { data: value, issues: guarded.issues };

    const tupleValue = guarded.value;

    const itemResults = await Promise.all(
      this.items.map((schema, i) =>
        schema.safeParseAsync(tupleValue[i]).then((result) => ({
          index: i,
          result,
          source: tupleValue[i],
        })),
      ),
    );

    const output: unknown[] = [];
    const issues: Issue[] = [];

    for (const itemResult of itemResults) {
      this._pushTupleItemResult(output, issues, itemResult.index, itemResult.source, itemResult.result);
    }

    if (this.restSchema !== null) {
      for (let i = this.items.length; i < tupleValue.length; i++) {
        const result = await this.restSchema.safeParseAsync(tupleValue[i]);

        this._pushTupleItemResult(output, issues, i, tupleValue[i], result);
      }
    }

    return { data: output, issues };
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    const prefixItems = this.items.map((s) => s.toJsonSchema());
    const base: Record<string, unknown> = { prefixItems, type: 'array' };

    if (this.restSchema !== null) base['items'] = this.restSchema.toJsonSchema();
    else base['items'] = false;

    return base;
  }

  protected override _describeImpl(): SchemaDescriptor {
    return {
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
      items: this.items.map((s) => s.describe()),
      kind: 'tuple',
      rest: this.restSchema !== null ? this.restSchema.describe() : null,
    };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
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
