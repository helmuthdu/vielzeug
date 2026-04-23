import type { InferOutput, Issue } from '../core';

import { Schema } from '../core';

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

  private _applyBranchResult(
    index: number,
    result: { data: unknown; success: true } | { error: { issues: Issue[] }; success: false },
    state: { issues: Issue[]; output: unknown },
  ): void {
    if (!result.success) {
      state.issues.push(...result.error.issues);

      return;
    }

    if (index === 0) {
      state.output = result.data;
    }
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const state: { issues: Issue[]; output: unknown } = { issues: [], output: value };

    for (let i = 0; i < this.schemas.length; i++) {
      const result = this.schemas[i].safeParse(value);

      this._applyBranchResult(i, result, state);
    }

    return { data: state.output, issues: state.issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const state: { issues: Issue[]; output: unknown } = { issues: [], output: value };

    for (let i = 0; i < this.schemas.length; i++) {
      const result = await this.schemas[i].safeParseAsync(value);

      this._applyBranchResult(i, result, state);
    }

    return { data: state.output, issues: state.issues };
  }
}
