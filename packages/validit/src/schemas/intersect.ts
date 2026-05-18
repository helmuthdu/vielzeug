import type { AnySchema, InferOutput, Issue } from '../core';

import { Schema, isPlainObject } from '../core';

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Recursively merges `source` into `target`.
 * Plain objects are merged key-by-key; all other values take the `source` value.
 */
function deepMerge(target: unknown, source: unknown): unknown {
  if (isPlainObject(target) && isPlainObject(source)) {
    const result: Record<string, unknown> = { ...target };

    for (const [key, val] of Object.entries(source)) {
      result[key] = deepMerge(target[key], val);
    }

    return result;
  }

  return source;
}

/** All schemas must pass — intersection semantics. */
export class IntersectSchema<T extends readonly AnySchema[]> extends Schema<
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

    state.output = index === 0 ? result.data : deepMerge(state.output, result.data);
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
    const results = await Promise.all(this.schemas.map((s) => s.safeParseAsync(value)));
    const state: { issues: Issue[]; output: unknown } = { issues: [], output: value };

    results.forEach((result, i) => this._applyBranchResult(i, result, state));

    return { data: state.output, issues: state.issues };
  }
}
