import { isPlainObject } from '@vielzeug/arsenal';

import type { AnySchema, InferOutput, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { Schema, ValidationError, _makeCtx } from '../core';
import { cloneRecord, defineOwnProperty } from '../safe-object';

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Recursively merges `source` into `target`.
 * Plain objects are merged key-by-key; all other values take the `source` value.
 */
function deepMerge(target: unknown, source: unknown): unknown {
  if (isPlainObject(target) && isPlainObject(source)) {
    const result = cloneRecord(target);

    for (const [key, val] of Object.entries(source)) {
      defineOwnProperty(result, key, deepMerge(target[key], val));
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

  protected override get _kind(): string {
    return 'intersect';
  }

  constructor(schemas: T) {
    super();
    this.schemas = schemas;
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    const state: { hasOutput: boolean; issues: Issue[]; output: unknown } = {
      hasOutput: false,
      issues: [],
      output: value,
    };

    for (let i = 0; i < this.schemas.length; i++) {
      const result = this.schemas[i]._parseFullSync(value, ctx);

      if (result.issues.length > 0) {
        state.issues.push(...result.issues);
      } else if (!state.hasOutput) {
        state.hasOutput = true;
        state.output = result.data;
      } else {
        state.output = deepMerge(state.output, result.data);
      }
    }

    return { data: state.output, issues: state.issues, typeOk: state.issues.length === 0 };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<UnionToIntersection<InferOutput<T[number]>>> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as UnionToIntersection<InferOutput<T[number]>>;

      const state: { hasOutput: boolean; issues: Issue[]; output: unknown } = {
        hasOutput: false,
        issues: [],
        output: prepared.value,
      };

      for (let i = 0; i < this.schemas.length; i++) {
        const result = await this.schemas[i]._parseFullAsync(prepared.value, c);

        if (result.issues.length > 0) {
          state.issues.push(...result.issues);
        } else if (!state.hasOutput) {
          state.hasOutput = true;
          state.output = result.data;
        } else {
          state.output = deepMerge(state.output, result.data);
        }
      }

      if (state.issues.length > 0) throw new ValidationError(state.issues);

      const validationIssues = await this._runValidatorsAsync(state.output, c);

      if (validationIssues.length) throw new ValidationError(validationIssues);

      return this._runPostprocessors(state.output) as UnionToIntersection<InferOutput<T[number]>>;
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), branches: this.schemas.map((s) => s.toDescriptor()), kind: 'intersect' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
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
