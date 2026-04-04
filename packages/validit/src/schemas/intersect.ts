import type { InferOutput, Issue } from '../core';

import { Schema } from '../core';
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

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const branchIssues: Issue[] = [];
    let output: unknown = value;

    for (let i = 0; i < this.schemas.length; i++) {
      const result = this.schemas[i].safeParse(value);

      if (!result.success) {
        branchIssues.push(...result.error.issues);
      } else if (i === 0) {
        output = result.data;
      }
    }

    return { data: output, issues: branchIssues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const branchIssues: Issue[] = [];
    let output: unknown = value;

    for (let i = 0; i < this.schemas.length; i++) {
      const result = await this.schemas[i].safeParseAsync(value);

      if (!result.success) {
        branchIssues.push(...result.error.issues);
      } else if (i === 0) {
        output = result.data;
      }
    }

    return { data: output, issues: branchIssues };
  }
}

export const intersect = <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(
  ...items: T
): IntersectSchema<NormalizeItems<T>> => new IntersectSchema(normalizeToSchemas(items));
