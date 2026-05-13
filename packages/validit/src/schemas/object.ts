import type { InferOutput, Issue } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';

export type ObjectShape = Record<string, Schema<any>>;
export type InferObject<T extends ObjectShape> = { [K in keyof T]: InferOutput<T[K]> };

export class ObjectSchema<T extends ObjectShape> extends Schema<InferObject<T>> {
  readonly shape: T;
  private readonly _unknownKeyMode: 'passthrough' | 'strict' | 'strip';

  constructor(shape: T, unknownKeyMode: 'passthrough' | 'strict' | 'strip' = 'strict') {
    super([]);
    this.shape = shape;
    this._unknownKeyMode = unknownKeyMode;
  }

  private _unknownKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj).filter((k) => !Object.prototype.hasOwnProperty.call(this.shape, k));
  }

  private _strictUnknownKeyIssues(obj: Record<string, unknown>): Issue[] {
    if (this._unknownKeyMode !== 'strict') return [];

    const unknownKeys = this._unknownKeys(obj);

    if (unknownKeys.length === 0) return [];

    return [
      {
        code: ErrorCode.invalid_keys,
        message: _messages().object.invalidKeys({ keys: unknownKeys }),
        path: [],
      },
    ];
  }

  private _copyRelaxedUnknownKeys(obj: Record<string, unknown>, output: Record<string, unknown>): void {
    if (this._unknownKeyMode !== 'passthrough') return;

    for (const key of this._unknownKeys(obj)) {
      output[key] = obj[key];
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

  private _rebuildWith<U extends ObjectShape>(shape: U, unknownKeyMode = this._unknownKeyMode): ObjectSchema<U> {
    return this._copyStateTo(new ObjectSchema(shape, unknownKeyMode));
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    const guarded = this._guardObjectInput(value);

    if (!guarded.ok) return { data: value, issues: guarded.issues };

    const { obj } = guarded;
    const { issues, output } = this._createObjectParseContext(obj);

    for (const key of Object.keys(this.shape)) {
      const result = this.shape[key].safeParse(obj[key]);

      if (result.success) {
        output[key] = result.data;
      } else {
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
      if (r.issues.length === 0) output[r.key] = r.data;

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
    );
  }

  required(): ObjectSchema<{ [K in keyof T]: Schema<Exclude<InferOutput<T[K]>, undefined>> }> {
    return this._rebuildWith(Object.fromEntries(Object.entries(this.shape).map(([k, s]) => [k, s.required()])) as any);
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
    return this._rebuildWith(this.shape, 'passthrough') as unknown as Schema<InferObject<T> & Record<string, unknown>>;
  }

  /** Ignore unknown keys (strip mode). */
  strip(): ObjectSchema<T> {
    return this._rebuildWith(this.shape, 'strip');
  }
}
