import type { Issue } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';

export type TupleSchemas = readonly [Schema<any>, ...Schema<any>[]];
export type InferTuple<T extends TupleSchemas> = { readonly [K in keyof T]: T[K] extends Schema<infer O> ? O : never };

export class TupleSchema<T extends TupleSchemas> extends Schema<InferTuple<T>> {
  readonly items: T;

  constructor(items: T) {
    super([]);
    this.items = items;
  }

  private _guardTupleInput(value: unknown): { ok: true; value: unknown[] } | { issues: Issue[]; ok: false } {
    if (!Array.isArray(value)) {
      return {
        issues: [{ code: ErrorCode.invalid_type, message: _messages().tuple.type(), path: [] }],
        ok: false,
      };
    }

    if (value.length !== this.items.length) {
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

      if (result.success) {
        output.push(result.data);
      } else {
        issues.push(...prependIssuePath(result.error.issues, i));
        output.push(tupleValue[i]);
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
          data: result.success ? result.data : tupleValue[i],
          issues: result.success ? [] : prependIssuePath(result.error.issues, i),
        })),
      ),
    );

    return { data: itemResults.map((r) => r.data), issues: itemResults.flatMap((r) => r.issues) };
  }
}
