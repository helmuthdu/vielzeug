import type { Issue } from '../core';

import { ErrorCode, Schema, ValidationError } from '../core';
import { _messages } from '../messages';

export type TupleSchemas = readonly [Schema<any>, ...Schema<any>[]];
export type InferTuple<T extends TupleSchemas> = { readonly [K in keyof T]: T[K] extends Schema<infer O> ? O : never };

export class TupleSchema<T extends TupleSchemas> extends Schema<InferTuple<T>> {
  readonly items: T;

  constructor(items: T) {
    super([]);
    this.items = items;
  }

  override parse(value: unknown): InferTuple<T> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (this._isOptional && processed === undefined) return undefined as unknown as InferTuple<T>;

      if (this._isNullable && processed === null) return null as unknown as InferTuple<T>;

      if (!Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: _messages().tuple_type(), path: [] }]);
      }

      if (processed.length !== this.items.length) {
        throw new ValidationError([
          {
            code: ErrorCode.invalid_length,
            message: _messages().tuple_length({ exact: this.items.length }),
            params: { exact: this.items.length },
            path: [],
          },
        ]);
      }

      const issues: Issue[] = [];
      const output: unknown[] = [];

      for (let i = 0; i < this.items.length; i++) {
        const result = this.items[i].safeParse(processed[i]);

        if (result.success) {
          output.push(result.data);
        } else {
          issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })));
          output.push(processed[i]);
        }
      }
      for (const validate of this._validators) {
        const extra = validate(output, []);

        if (extra) issues.push(...extra);
      }

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), output) as InferTuple<T>;
    });
  }

  override async parseAsync(value: unknown): Promise<InferTuple<T>> {
    return this._withCatchAsync(async () => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (this._isOptional && processed === undefined) return undefined as unknown as InferTuple<T>;

      if (this._isNullable && processed === null) return null as unknown as InferTuple<T>;

      if (!Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: _messages().tuple_type(), path: [] }]);
      }

      if (processed.length !== this.items.length) {
        throw new ValidationError([
          {
            code: ErrorCode.invalid_length,
            message: _messages().tuple_length({ exact: this.items.length }),
            params: { exact: this.items.length },
            path: [],
          },
        ]);
      }

      const itemResults = await Promise.all(
        this.items.map((schema, i) =>
          schema.safeParseAsync(processed[i]).then((result) => ({
            data: result.success ? result.data : processed[i],
            issues: result.success ? [] : result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })),
          })),
        ),
      );
      const output = itemResults.map((r) => r.data);
      const syncIssues: Issue[] = [];

      for (const validate of this._validators) {
        const extra = validate(output, []);

        if (extra) syncIssues.push(...extra);
      }

      const issues = [...itemResults.flatMap((r) => r.issues), ...syncIssues, ...(await this._runAsync(output, []))];

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), output) as InferTuple<T>;
    });
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).items = this.items;

    return cloned;
  }
}

export const tuple = <const T extends TupleSchemas>(items: T): TupleSchema<T> => new TupleSchema(items);
