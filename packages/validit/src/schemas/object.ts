import type { AnySchema, InferOutput, Issue } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';

export type ObjectShape = Record<string, AnySchema>;
export type InferObject<T extends ObjectShape> = { [K in keyof T]: InferOutput<T[K]> };

export class ObjectSchema<T extends ObjectShape> extends Schema<InferObject<T>> {
  readonly shape: T;
  private readonly _isRelaxed: boolean;

  constructor(shape: T, isRelaxed = false) {
    super();
    this.shape = shape;
    this._isRelaxed = isRelaxed;
  }

  private _unknownKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj).filter((k) => !Object.prototype.hasOwnProperty.call(this.shape, k));
  }

  private _strictUnknownKeyIssues(obj: Record<string, unknown>): Issue[] {
    if (this._isRelaxed) return [];

    const unknownKeys = this._unknownKeys(obj);

    if (unknownKeys.length === 0) return [];

    return [
      {
        code: ErrorCode.invalid_keys,
        message: _messages().object.invalidKeys({ keys: unknownKeys }),
        params: { keys: unknownKeys },
        path: [],
      },
    ];
  }

  private _copyRelaxedUnknownKeys(obj: Record<string, unknown>, output: Record<string, unknown>): void {
    if (!this._isRelaxed) return;

    for (const key of this._unknownKeys(obj)) {
      // Skip keys that trigger inherited setters (e.g. __proto__) to prevent
      // prototype mutation on the output object.
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;

      Object.defineProperty(output, key, {
        configurable: true,
        enumerable: true,
        value: obj[key],
        writable: true,
      });
    }
  }

  private _guardObjectInput(
    value: unknown,
  ): { obj: Record<string, unknown>; ok: true } | { issues: Issue[]; ok: false } {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        issues: [{ code: ErrorCode.invalid_type, message: _messages().object.type(), path: [] }],
        ok: false,
      };
    }

    return { obj: value as Record<string, unknown>, ok: true };
  }

  private _createObjectParseContext(obj: Record<string, unknown>): {
    issues: Issue[];
    output: Record<string, unknown>;
  } {
    return {
      issues: [...this._strictUnknownKeyIssues(obj)],
      output: {},
    };
  }

  private _rebuildWith<U extends ObjectShape>(shape: U, isRelaxed = this._isRelaxed): ObjectSchema<U> {
    return this._copyStateTo(new ObjectSchema(shape, isRelaxed));
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const guarded = this._guardObjectInput(value);

    if (!guarded.ok) return { data: value, issues: guarded.issues };

    const { obj } = guarded;
    const { issues, output } = this._createObjectParseContext(obj);

    for (const key of Object.keys(this.shape)) {
      const fieldSchema = this.shape[key];
      const result = fieldSchema.safeParse(obj[key]);

      if (result.success) {
        output[key] = result.data;
      } else {
        // Failed field keys are intentionally omitted from parsed output so
        // object-level checks can branch on key presence.
        issues.push(...prependIssuePath(result.error.issues, key));
      }
    }

    this._copyRelaxedUnknownKeys(obj, output);

    return { data: output, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    const guarded = this._guardObjectInput(value);

    if (!guarded.ok) return { data: value, issues: guarded.issues };

    const { obj } = guarded;
    const { issues, output } = this._createObjectParseContext(obj);

    // Async field parsing
    const keyResults = await Promise.all(
      Object.keys(this.shape).map((key) =>
        this.shape[key].safeParseAsync(obj[key]).then((result) => ({
          data: result.success ? result.data : obj[key],
          issues: result.success ? [] : prependIssuePath(result.error.issues, key),
          key,
        })),
      ),
    );

    for (const r of keyResults) {
      if (r.issues.length === 0) {
        output[r.key] = r.data;
      }

      issues.push(...r.issues);
    }

    this._copyRelaxedUnknownKeys(obj, output);

    return { data: output, issues };
  }

  partial(): ObjectSchema<{ [K in keyof T]: Schema<InferOutput<T[K]> | undefined> }>;
  partial<K extends keyof T>(
    ...keys: K[]
  ): ObjectSchema<Omit<T, K> & { [P in K]: Schema<InferOutput<T[P]> | undefined> }>;
  partial<K extends keyof T>(...keys: K[]): ObjectSchema<any> {
    const targetKeys = keys.length > 0 ? new Set(keys as string[]) : null;

    return this._rebuildWith(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, s]) => [k, targetKeys === null || targetKeys.has(k) ? s.optional() : s]),
      ) as any,
      this._isRelaxed,
    );
  }

  override required(): Schema<InferObject<T>> {
    return this._rebuildWith(
      Object.fromEntries(Object.entries(this.shape).map(([k, s]) => [k, s.required()])) as any,
      this._isRelaxed,
    ) as unknown as Schema<InferObject<T>>;
  }

  extend<U extends ObjectShape>(extra: U): ObjectSchema<Omit<T, keyof U> & U> {
    return this._rebuildWith({ ...this.shape, ...extra } as any);
  }

  pick<K extends keyof T>(...keys: K[]): ObjectSchema<Pick<T, K>> {
    const keySet = new Set(keys as string[]);

    return this._rebuildWith(Object.fromEntries(Object.entries(this.shape).filter(([k]) => keySet.has(k))) as any);
  }

  omit<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K>> {
    const keySet = new Set(keys as string[]);

    return this._rebuildWith(Object.fromEntries(Object.entries(this.shape).filter(([k]) => !keySet.has(k))) as any);
  }

  /**
   * Allow additional unknown properties (relaxed mode).
   * Default is strict mode (rejects unknown keys).
   */
  relaxed(): Schema<InferObject<T> & Record<string, unknown>> {
    return this._rebuildWith(this.shape, true) as unknown as Schema<InferObject<T> & Record<string, unknown>>;
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, schema] of Object.entries(this.shape)) {
      properties[key] = schema.schema();

      if (!schema.isOptional) required.push(key);
    }

    const base: Record<string, unknown> = { properties, type: 'object' };

    if (required.length > 0) base['required'] = required;

    if (!this._isRelaxed) base['additionalProperties'] = false;

    return base;
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    const fields = Object.fromEntries(Object.entries(this.shape).map(([k, s]) => [k, s.walk(visitor)]));

    if (visitor.object) return visitor.object(this, fields);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof ObjectSchema)) return false;

    if (this._isRelaxed !== other._isRelaxed) return false;

    const keys = Object.keys(this.shape);

    if (keys.length !== Object.keys(other.shape).length) return false;

    for (const k of keys) {
      if (!this.shape[k].equals(other.shape[k])) return false;
    }

    return true;
  }
}
