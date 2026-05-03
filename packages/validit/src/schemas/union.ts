import type { InferOutput, Issue } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class UnionSchema<T extends readonly Schema<any>[]> extends Schema<InferOutput<T[number]>> {
  readonly schemas: T;

  constructor(schemas: T) {
    super([]);
    this.schemas = schemas;
  }

  private _invalidUnionResult(value: unknown, errors: Issue[][]): { data: unknown; issues: Issue[] } {
    return {
      data: value,
      issues: [
        {
          code: ErrorCode.invalid_union,
          message: _messages().union.invalid(),
          params: { errors },
          path: [],
        },
      ],
    };
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const branchResults = this.schemas.map((s) => s.safeParse(value));
    const success = branchResults.find((r) => r.success);

    if (success) {
      return { data: (success as { data: InferOutput<T[number]> }).data, issues: [] };
    }

    return this._invalidUnionResult(
      value,
      branchResults.map((r) => (!r.success ? r.error.issues : [])),
    );
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

    return this._invalidUnionResult(value, branchErrors);
  }
}
