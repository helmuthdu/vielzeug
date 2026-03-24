import type { InferOutput } from '../core';

import { ErrorCode, Schema, ValidationError } from '../core';
import { _messages } from '../messages';
import { type NormalizeItems, type RawOrSchema, normalizeToSchemas } from './literal';

export class UnionSchema<T extends readonly Schema<any>[]> extends Schema<InferOutput<T[number]>> {
  readonly schemas: T;

  constructor(schemas: T) {
    super([]);
    this.schemas = schemas;
  }

  override parse(value: unknown): InferOutput<T[number]> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value as unknown);

      if (this._isOptional && processed === undefined) return undefined as unknown as InferOutput<T[number]>;

      if (this._isNullable && processed === null) return null as unknown as InferOutput<T[number]>;

      const branchResults = this.schemas.map((s) => s.safeParse(processed));
      const success = branchResults.find((r) => r.success);

      if (!success) {
        throw new ValidationError([
          {
            code: ErrorCode.invalid_union,
            message: _messages().union_invalid(),
            params: { errors: branchResults.map((r) => (!r.success ? r.error.issues : [])) },
            path: [],
          },
        ]);
      }

      const data = (success as { data: InferOutput<T[number]> }).data;
      const issues = this._runSync(data, []);

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), data) as InferOutput<T[number]>;
    });
  }

  override async parseAsync(value: unknown): Promise<InferOutput<T[number]>> {
    return this._withCatchAsync(async () => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value as unknown);

      if (this._isOptional && processed === undefined) return undefined as unknown as InferOutput<T[number]>;

      if (this._isNullable && processed === null) return null as unknown as InferOutput<T[number]>;

      const branchResults = await Promise.all(this.schemas.map((s) => s.safeParseAsync(processed)));
      const success = branchResults.find((r) => r.success);

      if (!success) {
        throw new ValidationError([
          {
            code: ErrorCode.invalid_union,
            message: _messages().union_invalid(),
            params: { errors: branchResults.map((r) => (!r.success ? r.error.issues : [])) },
            path: [],
          },
        ]);
      }

      const data = (success as { data: InferOutput<T[number]> }).data;
      const syncIssues = this._runSync(data, []);

      if (syncIssues.length) throw new ValidationError(syncIssues);

      const asyncIssues = await this._runAsync(data, []);

      if (asyncIssues.length) throw new ValidationError(asyncIssues);

      return this._postprocessors.reduce((v, fn) => fn(v), data) as InferOutput<T[number]>;
    });
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).schemas = this.schemas;

    return cloned;
  }
}

export const union = <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(
  ...items: T
): UnionSchema<NormalizeItems<T>> => new UnionSchema(normalizeToSchemas(items));
