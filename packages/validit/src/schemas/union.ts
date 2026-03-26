import type { InferOutput, Issue } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';
import { type NormalizeItems, type RawOrSchema, normalizeToSchemas } from './literal';

export class UnionSchema<T extends readonly Schema<any>[]> extends Schema<InferOutput<T[number]>> {
  readonly schemas: T;

  constructor(schemas: T) {
    super([]);
    this.schemas = schemas;
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const branchResults = this.schemas.map((s) => s.safeParse(value));
    const success = branchResults.find((r) => r.success);

    if (success) {
      return { data: (success as { data: InferOutput<T[number]> }).data, issues: [] };
    }

    return {
      data: value,
      issues: [
        {
          code: ErrorCode.invalid_union,
          message: _messages().union_invalid(),
          params: { errors: branchResults.map((r) => (!r.success ? r.error.issues : [])) },
          path: [],
        },
      ],
    };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const branchErrors: Issue[][] = [];

    for (const schema of this.schemas) {
      const result = await schema.safeParseAsync(value);

      if (result.success) {
        return { data: result.data, issues: [] };
      }

      branchErrors.push(result.error.issues);
    }

    return {
      data: value,
      issues: [
        {
          code: ErrorCode.invalid_union,
          message: _messages().union_invalid(),
          params: { errors: branchErrors },
          path: [],
        },
      ],
    };
  }
}

export const union = <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(
  ...items: T
): UnionSchema<NormalizeItems<T>> => new UnionSchema(normalizeToSchemas(items));
