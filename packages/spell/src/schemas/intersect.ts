import type { AnySchema, InferOutput, Issue, SchemaDescriptor } from '../core';

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
    super();
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

  protected override _toSchemaBase(): Record<string, unknown> {
    return { allOf: this.schemas.map((s) => s.toJsonSchema()) };
  }

  protected override _describeImpl(): SchemaDescriptor {
    return {
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
      branches: this.schemas.map((s) => s.describe()),
      kind: 'intersect',
    };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    const branches = this.schemas.map((s) => s.walk(visitor));

    if (visitor.intersect) return visitor.intersect(this, branches);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof IntersectSchema)) return false;

    if (this.schemas.length !== other.schemas.length) return false;

    return this.schemas.every((s, i) => s.equals(other.schemas[i]));
  }
}
