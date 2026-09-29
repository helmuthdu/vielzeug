import type { AnySchema, InferInput, InferOutput, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';

export type TupleSchemas = readonly [AnySchema, ...AnySchema[]];
export type InferTuple<T extends TupleSchemas, R extends AnySchema | null = null> = R extends AnySchema
  ? readonly [...{ [K in keyof T]: InferOutput<T[K]> }, ...InferOutput<R>[]]
  : { readonly [K in keyof T]: InferOutput<T[K]> };
type InferTupleInput<T extends TupleSchemas, R extends AnySchema | null = null> = R extends AnySchema
  ? readonly [...{ [K in keyof T]: InferInput<T[K]> }, ...InferInput<R>[]]
  : { readonly [K in keyof T]: InferInput<T[K]> };

export class TupleSchema<T extends TupleSchemas, R extends AnySchema | null = null> extends Schema<
  InferTuple<T, R>,
  InferTupleInput<T, R>
> {
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

  rest<U extends AnySchema>(schema: U): TupleSchema<T, U> {
    return this._copyStateTo(new TupleSchema(this.items, schema)) as unknown as TupleSchema<T, U>;
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

  protected override async _parseAsync(value: unknown, ctx: ParseContext): Promise<ParseValue> {
    if (!Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: ctx.messages.tuple.type(), path: [] }],
        typeOk: false,
      };
    }

    const guarded = this._guardTupleInput(value, ctx);

    if (!guarded.ok) return { data: value, issues: guarded.issues, typeOk: false };

    const tupleValue = guarded.value;
    const issues: Issue[] = [];
    const output: unknown[] = [];

    const fixedResults = await Promise.all(this.items.map((schema, i) => schema._parseFullAsync(tupleValue[i], ctx)));

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
      const restResults = await Promise.all(restItems.map((item) => rest._parseFullAsync(item, ctx)));

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

    return { data: output, issues, typeOk: true };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return {
      ...this._describeBase(),
      items: this.items.map((s) => s.definition()),
      kind: 'tuple',
      rest: this.restSchema !== null ? this.restSchema.definition() : null,
    };
  }
}
