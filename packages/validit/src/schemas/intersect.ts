import type { InferOutput, Issue } from '../core';

import { Schema, ValidationError } from '../core';
import { type NormalizeItems, type RawOrSchema, normalizeToSchemas } from './literal';

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/** All schemas must pass — intersection semantics. */
export class IntersectSchema<T extends readonly Schema<any>[]> extends Schema<
  UnionToIntersection<InferOutput<T[number]>>
> {
  readonly schemas: T;

  constructor(schemas: T) {
    super([]);
    this.schemas = schemas;
  }

  override parse(value: unknown): UnionToIntersection<InferOutput<T[number]>> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value as unknown);

      if (this._isOptional && processed === undefined)
        return undefined as unknown as UnionToIntersection<InferOutput<T[number]>>;

      if (this._isNullable && processed === null) return null as unknown as UnionToIntersection<InferOutput<T[number]>>;

      const branchIssues: Issue[] = [];

      for (const schema of this.schemas) {
        const result = schema.safeParse(processed);

        if (!result.success) branchIssues.push(...result.error.issues);
      }

      if (branchIssues.length) throw new ValidationError(branchIssues);

      const userIssues = this._runSync(processed, []);

      if (userIssues.length) throw new ValidationError(userIssues);

      return this._postprocessors.reduce((v, fn) => fn(v), processed) as UnionToIntersection<InferOutput<T[number]>>;
    });
  }

  override async parseAsync(value: unknown): Promise<UnionToIntersection<InferOutput<T[number]>>> {
    return this._withCatchAsync(async () => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value as unknown);

      if (this._isOptional && processed === undefined)
        return undefined as unknown as UnionToIntersection<InferOutput<T[number]>>;

      if (this._isNullable && processed === null) return null as unknown as UnionToIntersection<InferOutput<T[number]>>;

      const branchResults = await Promise.all(this.schemas.map((s) => s.safeParseAsync(processed)));
      const branchIssues: Issue[] = branchResults.flatMap((r) => (!r.success ? r.error.issues : []));

      if (branchIssues.length) throw new ValidationError(branchIssues);

      const syncIssues = this._runSync(processed, []);

      if (syncIssues.length) throw new ValidationError(syncIssues);

      const asyncIssues = await this._runAsync(processed, []);

      if (asyncIssues.length) throw new ValidationError(asyncIssues);

      return this._postprocessors.reduce((v, fn) => fn(v), processed) as UnionToIntersection<InferOutput<T[number]>>;
    });
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).schemas = this.schemas;

    return cloned;
  }
}

export const intersect = <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(
  ...items: T
): IntersectSchema<NormalizeItems<T>> => new IntersectSchema(normalizeToSchemas(items));
