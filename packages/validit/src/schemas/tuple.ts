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

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    if (!Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: _messages().tuple_type(), path: [] }],
      };
    }

    if (value.length !== this.items.length) {
      return {
        data: value,
        issues: [
          {
            code: ErrorCode.invalid_length,
            message: _messages().tuple_length({ exact: this.items.length }),
            params: { exact: this.items.length },
            path: [],
          },
        ],
      };
    }

    const issues: Issue[] = [];
    const output: unknown[] = [];

    for (let i = 0; i < this.items.length; i++) {
      const result = this.items[i].safeParse(value[i]);

      if (result.success) {
        output.push(result.data);
      } else {
        issues.push(...prependIssuePath(result.error.issues, i));
        output.push(value[i]);
      }
    }

    return { data: output, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    if (!Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: _messages().tuple_type(), path: [] }],
      };
    }

    if (value.length !== this.items.length) {
      return {
        data: value,
        issues: [
          {
            code: ErrorCode.invalid_length,
            message: _messages().tuple_length({ exact: this.items.length }),
            params: { exact: this.items.length },
            path: [],
          },
        ],
      };
    }

    const itemResults = await Promise.all(
      this.items.map((schema, i) =>
        schema.safeParseAsync(value[i]).then((result) => ({
          data: result.success ? result.data : value[i],
          issues: result.success ? [] : prependIssuePath(result.error.issues, i),
        })),
      ),
    );

    return { data: itemResults.map((r) => r.data), issues: itemResults.flatMap((r) => r.issues) };
  }
}

export const tuple = <const T extends TupleSchemas>(items: T): TupleSchema<T> => new TupleSchema(items);
