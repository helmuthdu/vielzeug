import { isPlainObject } from '@vielzeug/arsenal';

import type { AnySchema, InferInput, InferOutput, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { Schema } from '../core';
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

/** All schemas must pass: intersection semantics. */
export class IntersectSchema<T extends readonly AnySchema[]> extends Schema<
  UnionToIntersection<InferOutput<T[number]>>,
  UnionToIntersection<InferInput<T[number]>>
> {
  readonly schemas: T;

  protected override get _kind(): string {
    return 'intersect';
  }

  constructor(schemas: T) {
    super();
    this.schemas = Object.freeze([...schemas]) as T;
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

  protected override async _parseAsync(value: unknown, ctx: ParseContext): Promise<ParseValue> {
    const state: { hasOutput: boolean; issues: Issue[]; output: unknown } = {
      hasOutput: false,
      issues: [],
      output: value,
    };

    for (let i = 0; i < this.schemas.length; i++) {
      const result = await this.schemas[i]._parseFullAsync(value, ctx);

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

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), branches: this.schemas.map((s) => s.definition()), kind: 'intersect' };
  }
}
