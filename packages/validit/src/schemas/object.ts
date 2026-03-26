import type { InferOutput, Issue, MessageFn } from '../core';

import { ErrorCode, prependIssuePath, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

export type ObjectMode = 'strip' | 'passthrough' | 'strict';
export type ObjectShape = Record<string, Schema<any>>;
export type InferObject<T extends ObjectShape> = { [K in keyof T]: InferOutput<T[K]> };

export class ObjectSchema<T extends ObjectShape> extends Schema<InferObject<T>> {
  readonly shape: T;
  private readonly _mode: ObjectMode;
  private readonly _knownKeys: Set<string> | null;

  constructor(shape: T, mode: ObjectMode = 'strip') {
    super([]);
    this.shape = shape;
    this._mode = mode;
    this._knownKeys = mode === 'strict' ? new Set(Object.keys(shape)) : null;
  }

  private _strictKeyIssues(obj: Record<string, unknown>): Issue[] {
    if (!this._knownKeys) return [];

    const unknownKeys = Object.keys(obj).filter((k) => !this._knownKeys!.has(k));

    if (!unknownKeys.length) return [];

    return [
      {
        code: ErrorCode.unrecognized_keys,
        message: _messages().object_unrecognized_keys({ keys: unknownKeys }),
        path: [],
      },
    ];
  }

  private _parseObjectFields(obj: Record<string, unknown>): { issues: Issue[]; output: Record<string, unknown> } {
    const issues: Issue[] = [];
    const output: Record<string, unknown> = this._mode === 'passthrough' ? { ...obj } : {};

    for (const key of Object.keys(this.shape)) {
      const result = this.shape[key].safeParse(obj[key]);

      if (result.success) {
        output[key] = result.data;
      } else {
        issues.push(...prependIssuePath(result.error.issues, key));
      }
    }

    return { issues, output };
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: _messages().object_type(), path: [] }],
      };
    }

    const obj = value as Record<string, unknown>;
    const strictIssues = this._strictKeyIssues(obj);

    if (strictIssues.length) return { data: value, issues: strictIssues };

    const { issues, output } = this._parseObjectFields(obj);

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
    const strictIssues = this._strictKeyIssues(obj);

    if (strictIssues.length) return { data: value, issues: strictIssues };

    const keyResults = await Promise.all(
      Object.keys(this.shape).map((key) =>
        this.shape[key].safeParseAsync(obj[key]).then((result) => ({
          data: result.success ? result.data : obj[key],
          issues: result.success ? [] : prependIssuePath(result.error.issues, key),
          key,
        })),
      ),
    );

    const output: Record<string, unknown> = this._mode === 'passthrough' ? { ...obj } : {};

    for (const r of keyResults) {
      if (r.issues.length === 0) output[r.key] = r.data;
    }

    return { data: output, issues: keyResults.flatMap((r) => r.issues) };
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
        this._mode,
      ),
    );
  }

  required(): ObjectSchema<{ [K in keyof T]: Schema<Exclude<InferOutput<T[K]>, undefined>> }> {
    return this._copyStateTo(
      new ObjectSchema(
        Object.fromEntries(Object.entries(this.shape).map(([k, s]) => [k, s.required()])) as any,
        this._mode,
      ),
    );
  }

  extend<U extends ObjectShape>(extra: U): ObjectSchema<Omit<T, keyof U> & U> {
    return this._copyStateTo(new ObjectSchema({ ...this.shape, ...extra } as any, this._mode));
  }

  pick<K extends keyof T>(...keys: K[]): ObjectSchema<Pick<T, K>> {
    const keySet = new Set(keys as string[]);

    return this._copyStateTo(
      new ObjectSchema(
        Object.fromEntries(Object.entries(this.shape).filter(([k]) => keySet.has(k))) as any,
        this._mode,
      ),
    );
  }

  omit<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K>> {
    const keySet = new Set(keys as string[]);

    return this._copyStateTo(
      new ObjectSchema(
        Object.fromEntries(Object.entries(this.shape).filter(([k]) => !keySet.has(k))) as any,
        this._mode,
      ),
    );
  }

  strip(): ObjectSchema<T> {
    return this._copyStateTo(new ObjectSchema(this.shape, 'strip'));
  }

  passthrough(): Schema<InferObject<T> & Record<string, unknown>> {
    return this._copyStateTo(new ObjectSchema(this.shape, 'passthrough')) as unknown as Schema<
      InferObject<T> & Record<string, unknown>
    >;
  }

  strict(): ObjectSchema<T> {
    return this._copyStateTo(new ObjectSchema(this.shape, 'strict'));
  }
}

// Suppress unused-import warning — MessageFn and resolveMessage are used in subclass method signatures
// that TypeScript may not detect if tree-shaken. They're re-exported for convenience.
export type { MessageFn, resolveMessage };

export const object = <T extends ObjectShape>(shape: T): ObjectSchema<T> => new ObjectSchema(shape);
