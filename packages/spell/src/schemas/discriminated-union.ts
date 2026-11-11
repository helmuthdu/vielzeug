import { defineOwnProperty } from '../_object';
import { chain, invalid, issue, type MaybePromise, ok, type ParseValue, type RunContext } from '../_parse';
import { SpellDefinitionError } from '../errors';
import { Schema } from '../schema';
import { type AnySchema, ErrorCode, type SchemaDescriptor, type SchemaKind } from '../types';
import { type InferObject, type InferObjectInput, ObjectSchema, type ObjectShape } from './object';
import { LiteralSchema } from './primitives';

/** Structural so concrete `ObjectSchema<Shape>` branches are accepted; checked with `instanceof` at construction. */
export type DiscriminatedBranches = Record<string, AnySchema & { readonly shape: ObjectShape }>;

type Simplify<T> = { [P in keyof T]: T[P] };
type InferBranches<K extends string, M extends DiscriminatedBranches> = {
  [Tag in keyof M & string]: M[Tag] extends { shape: infer S extends ObjectShape }
    ? Simplify<InferObject<S> & { [P in K]: Tag }>
    : never;
}[keyof M & string];
type InferBranchesInput<K extends string, M extends DiscriminatedBranches> = {
  [Tag in keyof M & string]: M[Tag] extends { shape: infer S extends ObjectShape }
    ? Simplify<InferObjectInput<S> & { [P in K]: Tag }>
    : never;
}[keyof M & string];

/**
 * Selects the branch named by `value[discriminator]`. Branches that do not declare the
 * discriminator get it added as a literal of their tag.
 */
export class DiscriminatedUnionSchema<K extends string, M extends DiscriminatedBranches> extends Schema<
  InferBranches<K, M>,
  InferBranchesInput<K, M>
> {
  readonly discriminator: K;
  readonly branches: ReadonlyMap<string, ObjectSchema<ObjectShape>>;

  constructor(discriminator: K, branches: M) {
    super();

    const resolved = new Map<string, ObjectSchema<ObjectShape>>();

    for (const [tag, branch] of Object.entries(branches)) {
      if (!(branch instanceof ObjectSchema))
        throw new SpellDefinitionError(`Branch "${tag}" must be an object schema.`);

      const declared = branch.shape[discriminator];

      if (declared === undefined) {
        resolved.set(tag, branch._withShape({ ...branch.shape, [discriminator]: new LiteralSchema(tag) }));
      } else if (declared instanceof LiteralSchema && declared.value === tag) {
        resolved.set(tag, branch);
      } else {
        throw new SpellDefinitionError(
          `Branch "${tag}" declares a "${discriminator}" field that does not match its discriminator value.`,
        );
      }
    }

    this.discriminator = discriminator;
    this.branches = resolved;
  }

  override get kind(): SchemaKind {
    return 'discriminatedUnion';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    const { messages } = ctx;

    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return invalid(value, issue(ErrorCode.invalid_type, messages.discriminatedUnion.type()));
    }

    const tag = (value as Record<string, unknown>)[this.discriminator];
    const branch = typeof tag === 'string' ? this.branches.get(tag) : undefined;

    if (!branch) {
      const expected = [...this.branches.keys()];

      return invalid(
        value,
        issue(
          ErrorCode.invalid_discriminator,
          messages.discriminatedUnion.invalidDiscriminator({ discriminator: this.discriminator, expected }),
          { discriminator: this.discriminator, expected },
        ),
      );
    }

    return chain(branch._run(value, ctx), (result) =>
      result.issues.length === 0 ? ok(result.value) : invalid(value, ...result.issues),
    );
  }

  protected override _describe(): SchemaDescriptor {
    const branches: Record<string, SchemaDescriptor> = {};

    for (const [tag, branch] of this.branches) defineOwnProperty(branches, tag, branch.definition());

    return { ...this._describeBase(), branches, discriminator: this.discriminator, kind: 'discriminatedUnion' };
  }
}
