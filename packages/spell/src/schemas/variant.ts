import type { AnySchema, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, SpellValidationError, _makeCtx } from '../core';
import { SpellError } from '../errors';
import { defineOwnProperty, objectFromEntries } from '../safe-object';
import { LiteralSchema } from './literal';
import { type InferObject, ObjectSchema, type ObjectShape } from './object';

type VariantMap = Record<string, ObjectSchema<Record<string, AnySchema>, import('../core').SchemaMode>>;
type InferVariantMap<K extends string, M extends VariantMap> = {
  [Tag in keyof M & string]: M[Tag] extends { shape: infer S extends ObjectShape }
    ? InferObject<S> & { [P in K]: Tag }
    : never;
}[keyof M & string];

export class VariantSchema<
  K extends string,
  M extends VariantMap,
  Mode extends import('../core').SchemaMode = import('../core').MergeSchemaModes<
    import('../core').InferSchemaMode<M[keyof M]>
  >,
> extends Schema<InferVariantMap<K, M>, unknown, Mode> {
  private readonly _map: Map<string, VariantMap[string]>;
  private readonly _discriminator: K;

  protected override get _kind(): string {
    return 'variant';
  }

  override checkAsync(
    fn: (
      value: InferVariantMap<K, M>,
      ctx: import('../core').CheckContext,
    ) => Promise<import('../core').ValidateResult>,
  ): VariantSchema<K, M, 'async'> {
    return this._addCheck(fn, true) as unknown as VariantSchema<K, M, 'async'>;
  }

  constructor(discriminator: K, variantMap: M) {
    const map = new Map<string, VariantMap[string]>();

    for (const [tag, schema] of Object.entries(variantMap)) {
      const discriminatorSchema = new LiteralSchema(tag);
      const existingDiscriminator = schema.shape[discriminator];

      if (
        existingDiscriminator &&
        (!(existingDiscriminator instanceof LiteralSchema) || existingDiscriminator.value !== tag)
      ) {
        throw new SpellError(
          `s.discriminatedUnion(): branch "${tag}" defines a conflicting discriminator schema for "${discriminator}".`,
        );
      }

      const discriminatorShape = {
        [discriminator]: discriminatorSchema,
      } as unknown as Record<K, AnySchema>;

      map.set(tag, existingDiscriminator ? schema : schema.extend(discriminatorShape));
    }

    super();
    this._discriminator = discriminator;
    this._map = map;
  }

  /** The discriminator field key used to select the matching variant. */
  get discriminator(): K {
    return this._discriminator;
  }

  /** Map from discriminator tag value to the extended ObjectSchema for that variant. */
  get variantMap(): ReadonlyMap<string, VariantMap[string]> {
    return new Map(this._map);
  }

  private _resolveVariant(
    value: unknown,
    ctx: ParseContext,
  ): { matched: VariantMap[string]; obj: Record<string, unknown> } | { issues: Issue[] } {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        issues: [{ code: ErrorCode.invalid_type, message: ctx.messages.variant.type(), path: [] }],
      };
    }

    const obj = value as Record<string, unknown>;
    const discValue = obj[this._discriminator] as string;
    const matched = this._map.get(discValue);

    if (!matched) {
      const expected = [...this._map.keys()];

      return {
        issues: [
          {
            code: ErrorCode.invalid_variant,
            message: ctx.messages.variant.invalidDiscriminator({
              discriminator: this._discriminator,
              expected,
            }),
            params: { discriminator: this._discriminator, expected },
            path: [],
          },
        ],
      };
    }

    return { matched, obj };
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    const resolved = this._resolveVariant(value, ctx);

    if ('issues' in resolved) return { data: value, issues: resolved.issues, typeOk: false };

    const result = resolved.matched._parseFullSync(value, ctx);

    return result.issues.length === 0
      ? { data: result.data, issues: [], typeOk: true }
      : { data: value, issues: result.issues, typeOk: true };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<InferVariantMap<K, M>> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as unknown as InferVariantMap<K, M>;

      const resolved = this._resolveVariant(prepared.value, c);

      if ('issues' in resolved) throw new SpellValidationError(resolved.issues);

      const branch = await resolved.matched.safeParseAsync(prepared.value, c);

      if (!branch.success) throw branch.error;

      const validationIssues = await this._runValidatorsAsync(branch.data, c);

      if (validationIssues.length > 0) throw new SpellValidationError(validationIssues);

      return this._runPostprocessors(branch.data) as InferVariantMap<K, M>;
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    const branches: Record<string, SchemaDescriptor> = {};

    for (const [key, schema] of this._map.entries()) {
      defineOwnProperty(branches, key, schema.definition());
    }

    return { ...this._describeBase(), branches, discriminator: this._discriminator, kind: 'variant' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const branches = objectFromEntries([...this._map.entries()].map(([k, s]) => [k, s.walk(visitor)]));

    if (visitor.variant) return visitor.variant(this, branches);

    return super._walk(visitor);
  }
}
