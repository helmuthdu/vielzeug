import type { AnySchema, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { SpellError } from '../errors';
import { defineOwnProperty } from '../safe-object';
import { LiteralSchema } from './literal';
import type { InferObject, InferObjectInput, ObjectSchema, ObjectShape } from './object';

type VariantMap = Record<string, ObjectSchema<any>>;
type Simplify<T> = { [P in keyof T]: T[P] };
type InferVariantMap<K extends string, M extends VariantMap> = {
  [Tag in keyof M & string]: M[Tag] extends { shape: infer S extends ObjectShape }
    ? InferObject<S> & { [P in K]: Tag }
    : never;
}[keyof M & string];
type InferVariantInputMap<K extends string, M extends VariantMap> = {
  [Tag in keyof M & string]: M[Tag] extends { shape: infer S extends ObjectShape }
    ? Simplify<InferObjectInput<S> & { [P in K]: Tag }>
    : never;
}[keyof M & string];

export class VariantSchema<K extends string, M extends VariantMap> extends Schema<
  InferVariantMap<K, M>,
  InferVariantInputMap<K, M>
> {
  private readonly _map: Map<string, VariantMap[string]>;
  private readonly _discriminator: K;

  protected override get _kind(): string {
    return 'variant';
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

  protected override async _parseAsync(value: unknown, ctx: ParseContext): Promise<ParseValue> {
    const resolved = this._resolveVariant(value, ctx);

    if ('issues' in resolved) return { data: value, issues: resolved.issues, typeOk: false };

    const result = await resolved.matched._parseFullAsync(value, ctx);

    return result.issues.length === 0
      ? { data: result.data, issues: [], typeOk: true }
      : { data: value, issues: result.issues, typeOk: true };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    const branches: Record<string, SchemaDescriptor> = {};

    for (const [key, schema] of this._map.entries()) {
      defineOwnProperty(branches, key, schema.definition());
    }

    return { ...this._describeBase(), branches, discriminator: this._discriminator, kind: 'variant' };
  }
}
