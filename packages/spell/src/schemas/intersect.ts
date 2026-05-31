import type { AnySchema, InferOutput, Issue, ParseValue, SchemaDescriptor } from '../core';

import { isPlainObject, Schema } from '../core';

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

  protected override _parseValueSync(value: unknown): ParseValue {
    const state: { issues: Issue[]; output: unknown } = { issues: [], output: value };

    for (let i = 0; i < this.schemas.length; i++) {
      const result = this.schemas[i]._parseFullSync(value);

      if (result.issues.length > 0) {
        state.issues.push(...result.issues);
      } else {
        state.output = i === 0 ? result.data : deepMerge(state.output, result.data);
      }
    }

    return { data: state.output, issues: state.issues, typeOk: state.issues.length === 0 };
  }

  protected override async _parseValueAsync(value: unknown): Promise<ParseValue> {
    const state: { issues: Issue[]; output: unknown } = { issues: [], output: value };

    for (let i = 0; i < this.schemas.length; i++) {
      const result = await this.schemas[i]._parseFullAsync(value);

      if (result.issues.length > 0) {
        state.issues.push(...result.issues);
      } else {
        state.output = i === 0 ? result.data : deepMerge(state.output, result.data);
      }
    }

    return { data: state.output, issues: state.issues, typeOk: state.issues.length === 0 };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), branches: this.schemas.map((s) => s.toDescriptor()), kind: 'intersect' };
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
