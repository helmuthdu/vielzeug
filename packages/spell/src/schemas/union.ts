import { chain, invalid, issue, type MaybePromise, ok, type ParseValue, type RunContext } from '../_parse';
import { Schema } from '../schema';
import {
  type AnySchema,
  ErrorCode,
  type InferInput,
  type InferOutput,
  type Issue,
  type SchemaDescriptor,
  type SchemaKind,
} from '../types';

export type UnionMembers = readonly [AnySchema, AnySchema, ...AnySchema[]];

/** The first branch that parses wins; when none does, one `invalid_union` issue carries every branch's issues. */
export class UnionSchema<T extends UnionMembers> extends Schema<InferOutput<T[number]>, InferInput<T[number]>> {
  readonly schemas: T;

  constructor(schemas: T) {
    super();
    this.schemas = Object.freeze([...schemas]) as unknown as T;
  }

  override get kind(): SchemaKind {
    return 'union';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    const attempt = (index: number, errors: Issue[][]): MaybePromise<ParseValue> => {
      if (index === this.schemas.length) {
        return invalid(value, issue(ErrorCode.invalid_union, ctx.messages.union.invalid(), { errors }));
      }

      return chain(this.schemas[index]!._run(value, ctx), (result) =>
        result.issues.length === 0 ? ok(result.value) : attempt(index + 1, [...errors, result.issues]),
      );
    };

    return attempt(0, []);
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), branches: this.schemas.map((schema) => schema.definition()), kind: 'union' };
  }
}
