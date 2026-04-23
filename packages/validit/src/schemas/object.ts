import type { InferOutput, Issue } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';

export type ObjectShape = Record<string, Schema<any>>;
export type InferObject<T extends ObjectShape> = { [K in keyof T]: InferOutput<T[K]> };

export class ObjectSchema<T extends ObjectShape> extends Schema<InferObject<T>> {
  readonly shape: T;
  private readonly _relaxed: boolean;

  constructor(shape: T, relaxed: boolean = false) {
    super([]);
    this.shape = shape;
    this._relaxed = relaxed;
  }

  private _unknownKeys(obj: Record<string, unknown>): string[] {
    return Object.keys(obj).filter((k) => !Object.prototype.hasOwnProperty.call(this.shape, k));
  }

  private _strictUnknownKeyIssues(obj: Record<string, unknown>): Issue[] {
    if (this._relaxed) return [];

    const unknownKeys = this._unknownKeys(obj);

    if (unknownKeys.length === 0) return [];

    return [
      {
        code: ErrorCode.unrecognized_keys,
        message: _messages().object_unrecognized_keys({ keys: unknownKeys }),
        path: [],
      },
    ];
  }

  private _copyRelaxedUnknownKeys(obj: Record<string, unknown>, output: Record<string, unknown>): void {
    if (!this._relaxed) return;

    for (const key of this._unknownKeys(obj)) {
      output[key] = obj[key];
    }
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: _messages().object_type(), path: [] }],
      };
    }

    const obj = value as Record<string, unknown>;
    const unknownKeyIssues = this._strictUnknownKeyIssues(obj);

    if (unknownKeyIssues.length) return { data: value, issues: unknownKeyIssues };

    // Parse known fields
    const issues: Issue[] = [];
    const output: Record<string, unknown> = {};

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
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: _messages().object_type(), path: [] }],
      };
    }

    const obj = value as Record<string, unknown>;
    const unknownKeyIssues = this._strictUnknownKeyIssues(obj);

    if (unknownKeyIssues.length) return { data: value, issues: unknownKeyIssues };

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

    const output: Record<string, unknown> = {};
    const issues: Issue[] = [];

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

    return this._copyStateTo(
      new ObjectSchema(
        Object.fromEntries(
          Object.entries(this.shape).map(([k, s]) => [k, targetKeys === null || targetKeys.has(k) ? s.optional() : s]),
        ) as any,
        this._relaxed,
      ),
    );
  }

  required(): ObjectSchema<{ [K in keyof T]: Schema<Exclude<InferOutput<T[K]>, undefined>> }> {
    return this._copyStateTo(
      new ObjectSchema(
        Object.fromEntries(Object.entries(this.shape).map(([k, s]) => [k, s.required()])) as any,
        this._relaxed,
      ),
    );
  }

  extend<U extends ObjectShape>(extra: U): ObjectSchema<Omit<T, keyof U> & U> {
    return this._copyStateTo(new ObjectSchema({ ...this.shape, ...extra } as any, this._relaxed));
  }

  pick<K extends keyof T>(...keys: K[]): ObjectSchema<Pick<T, K>> {
    const keySet = new Set(keys as string[]);

    return this._copyStateTo(
      new ObjectSchema(
        Object.fromEntries(Object.entries(this.shape).filter(([k]) => keySet.has(k))) as any,
        this._relaxed,
      ),
    );
  }

  omit<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K>> {
    const keySet = new Set(keys as string[]);

    return this._copyStateTo(
      new ObjectSchema(
        Object.fromEntries(Object.entries(this.shape).filter(([k]) => !keySet.has(k))) as any,
        this._relaxed,
      ),
    );
  }

  /**
   * Allow additional unknown properties (relaxed mode).
   * Default is strict mode (rejects unknown keys).
   */
  relaxed(): Schema<InferObject<T> & Record<string, unknown>> {
    return this._copyStateTo(new ObjectSchema(this.shape, true)) as unknown as Schema<
      InferObject<T> & Record<string, unknown>
    >;
  }
}
