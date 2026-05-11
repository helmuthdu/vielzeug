import type { Issue, ParseResult } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';

export type TupleSchemas = readonly [Schema<any>, ...Schema<any>[]];
export type InferTuple<T extends TupleSchemas, R extends Schema<any> | null = null> =
  R extends Schema<infer O>
    ? readonly [...{ [K in keyof T]: T[K] extends Schema<infer V> ? V : never }, ...O[]]
    : { readonly [K in keyof T]: T[K] extends Schema<infer V> ? V : never };

export class TupleSchema<T extends TupleSchemas, R extends Schema<any> | null = null> extends Schema<InferTuple<T, R>> {
  readonly items: T;
  private readonly restSchema: R;

  constructor(items: T, restSchema: R = null as R) {
    super([]);
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
            code: ErrorCode.invalid_length,
            message: _messages().tuple.length({ exact: this.items.length }),
            params: { minimum: this.items.length },
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
}
