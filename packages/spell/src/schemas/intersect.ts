import { isPlainObject } from '@vielzeug/arsenal';

import { defineOwnProperty, objectFromEntries } from '../_object';
import { all, chain, invalid, type MaybePromise, ok, type ParseValue, type RunContext } from '../_parse';
import { Schema } from '../schema';
import type { InferInput, InferOutput, SchemaDescriptor, SchemaKind } from '../types';
import type { UnionMembers } from './union';

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/** Plain objects merge key by key; any other value is replaced by `source`. */
function deepMerge(target: unknown, source: unknown): unknown {
  if (!isPlainObject(target) || !isPlainObject(source)) return source;

  const merged = objectFromEntries(Object.entries(target));

  for (const [key, entry] of Object.entries(source)) defineOwnProperty(merged, key, deepMerge(target[key], entry));

  return merged;
}

/** Every branch must parse; plain-object outputs are deep-merged. */
export class IntersectSchema<T extends UnionMembers> extends Schema<
  UnionToIntersection<InferOutput<T[number]>>,
  UnionToIntersection<InferInput<T[number]>>
> {
  readonly schemas: T;

  constructor(schemas: T) {
    super();
    this.schemas = Object.freeze([...schemas]) as unknown as T;
  }

  override get kind(): SchemaKind {
    return 'intersect';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return chain(all(this.schemas.map((schema) => schema._run(value, ctx))), (results) => {
      const issues = results.flatMap((result) => result.issues);

      if (issues.length > 0) return invalid(value, ...issues);

      return ok(results.map((result) => result.value).reduce(deepMerge));
    });
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), branches: this.schemas.map((schema) => schema.definition()), kind: 'intersect' };
  }
}
