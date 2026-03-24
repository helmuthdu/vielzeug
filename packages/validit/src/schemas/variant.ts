import { ErrorCode, Schema, ValidationError } from '../core';
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
      map.set(tag, schema.extend({ [discriminator]: new LiteralSchema(tag) }));
    }

    super([]);
    this._discriminator = discriminator;
    this._map = map;
  }

  override parse(value: unknown): InferVariantMap<K, M> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value as unknown);

      if (this._isOptional && processed === undefined) return undefined as unknown as InferVariantMap<K, M>;

      if (this._isNullable && processed === null) return null as unknown as InferVariantMap<K, M>;

      if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected object', path: [] }]);
      }

      const obj = processed as Record<string, unknown>;
      const discValue = obj[this._discriminator] as string;
      const matched = this._map.get(discValue);

      if (!matched) {
        const expected = [...this._map.keys()].map((k) => JSON.stringify(k)).join(' | ');

        throw new ValidationError([
          {
            code: ErrorCode.invalid_variant,
            message: `Invalid discriminator value at "${this._discriminator}": expected ${expected}`,
            path: [],
          },
        ]);
      }

      const result = matched.safeParse(processed);

      if (!result.success) throw new ValidationError(result.error.issues);

      const data = (result as unknown as { data: InferVariantMap<K, M> }).data;
      const issues = this._runSync(data, []);

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), data) as InferVariantMap<K, M>;
    });
  }

  override async parseAsync(value: unknown): Promise<InferVariantMap<K, M>> {
    return this._withCatchAsync(async () => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value as unknown);

      if (this._isOptional && processed === undefined) return undefined as unknown as InferVariantMap<K, M>;

      if (this._isNullable && processed === null) return null as unknown as InferVariantMap<K, M>;

      if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: 'Expected object', path: [] }]);
      }

      const obj = processed as Record<string, unknown>;
      const discValue = obj[this._discriminator] as string;
      const matched = this._map.get(discValue);

      if (!matched) {
        const expected = [...this._map.keys()].map((k) => JSON.stringify(k)).join(' | ');

        throw new ValidationError([
          {
            code: ErrorCode.invalid_variant,
            message: `Invalid discriminator value at "${this._discriminator}": expected ${expected}`,
            path: [],
          },
        ]);
      }

      const result = await matched.safeParseAsync(processed);

      if (!result.success) throw new ValidationError(result.error.issues);

      const data = (result as unknown as { data: InferVariantMap<K, M> }).data;
      const syncIssues = this._runSync(data, []);

      if (syncIssues.length) throw new ValidationError(syncIssues);

      const asyncIssues = await this._runAsync(data, []);

      if (asyncIssues.length) throw new ValidationError(asyncIssues);

      return this._postprocessors.reduce((v, fn) => fn(v), data) as InferVariantMap<K, M>;
    });
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any)._discriminator = this._discriminator;
    (cloned as any)._map = this._map;

    return cloned;
  }
}

export const variant = <K extends string, M extends Record<string, ObjectSchema<any>>>(
  discriminator: K,
  map: M,
): VariantSchema<K, M> => new VariantSchema(discriminator, map);
