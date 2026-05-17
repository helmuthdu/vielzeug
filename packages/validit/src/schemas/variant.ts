import type { Issue } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';
import { LiteralSchema } from './literal';
import { type InferObject, type ObjectShape, ObjectSchema } from './object';

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
      } as unknown as Record<K, Schema<any>>;

      map.set(tag, schema.extend(discriminatorShape));
    }

    super([]);
    this._discriminator = discriminator;
    this._map = map;
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
            path: [],
          },
        ],
      };
    }

    return { matched, obj };
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const resolved = this._resolveVariant(value);

    if ('issues' in resolved) return { data: value, issues: resolved.issues };

    const result = resolved.matched.safeParse(value);

    return result.success ? { data: result.data, issues: [] } : { data: value, issues: result.error.issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const resolved = this._resolveVariant(value);

    if ('issues' in resolved) return { data: value, issues: resolved.issues };

    const result = await resolved.matched.safeParseAsync(value);

    return result.success ? { data: result.data, issues: [] } : { data: value, issues: result.error.issues };
  }
}
