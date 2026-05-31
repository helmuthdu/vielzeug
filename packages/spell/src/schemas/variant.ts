import type { AnySchema, Issue, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';
import { LiteralSchema } from './literal';
import { type InferObject, ObjectSchema, type ObjectShape } from './object';

type VariantMap = Record<string, ObjectSchema<any>>;
type InferVariantMap<K extends string, M extends VariantMap> = {
  [Tag in keyof M & string]: M[Tag] extends ObjectSchema<infer S extends ObjectShape>
    ? InferObject<S> & { [P in K]: Tag }
    : never;
}[keyof M & string];

export class VariantSchema<K extends string, M extends VariantMap> extends Schema<InferVariantMap<K, M>> {
  private readonly _map: Map<string, ObjectSchema<any>>;
  private readonly _discriminator: K;

  constructor(discriminator: K, variantMap: M) {
    const map = new Map<string, ObjectSchema<any>>();

    for (const [tag, schema] of Object.entries(variantMap)) {
      const discriminatorShape = {
        [discriminator]: new LiteralSchema(tag),
      } as unknown as Record<K, AnySchema>;

      map.set(tag, schema.extend(discriminatorShape));
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
  get variantMap(): ReadonlyMap<string, ObjectSchema<any>> {
    return this._map;
  }

  private _resolveVariant(
    value: unknown,
  ): { matched: ObjectSchema<any>; obj: Record<string, unknown> } | { issues: Issue[] } {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        issues: [{ code: ErrorCode.invalid_type, message: _messages().variant.type(), path: [] }],
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
            message: _messages().variant.invalidDiscriminator({
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

  protected override _parseValueSync(value: unknown): ParseValue {
    const resolved = this._resolveVariant(value);

    if ('issues' in resolved) return { data: value, issues: resolved.issues, typeOk: false };

    const result = resolved.matched._parseFullSync(value);

    return result.issues.length === 0
      ? { data: result.data, issues: [], typeOk: true }
      : { data: value, issues: result.issues, typeOk: true };
  }

  protected override async _parseValueAsync(value: unknown): Promise<ParseValue> {
    const resolved = this._resolveVariant(value);

    if ('issues' in resolved) return { data: value, issues: resolved.issues, typeOk: false };

    const result = await resolved.matched.safeParseAsync(value);

    return result.success
      ? { data: result.data, issues: [], typeOk: true }
      : { data: value, issues: result.error.issues, typeOk: true };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    const branches: Record<string, SchemaDescriptor> = {};

    for (const [key, schema] of this._map.entries()) {
      branches[key] = schema.toDescriptor();
    }

    return { ...this._describeBase(), branches, discriminator: this._discriminator, kind: 'variant' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    const branches = Object.fromEntries([...this._map.entries()].map(([k, s]) => [k, s.walk(visitor)]));

    if (visitor.variant) return visitor.variant(this, branches);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof VariantSchema)) return false;

    if (this._discriminator !== other._discriminator) return false;

    if (this._map.size !== other._map.size) return false;

    for (const [tag, schema] of this._map) {
      const otherSchema = other._map.get(tag);

      if (!otherSchema || !schema.equals(otherSchema)) return false;
    }

    return true;
  }
}
