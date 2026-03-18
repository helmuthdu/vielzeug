import type { InferOutput, Issue, MessageFn } from '../core';

import { ErrorCode, resolveMessage, Schema, ValidationError } from '../core';
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

  override parse(value: unknown): InferObject<T> {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (this._isOptional && processed === undefined) return undefined as unknown as InferObject<T>;

      if (this._isNullable && processed === null) return null as unknown as InferObject<T>;

      if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: _messages().object_type(), path: [] }]);
      }

      const obj = processed as Record<string, unknown>;
      const strictIssues = this._strictKeyIssues(obj);

      if (strictIssues.length) throw new ValidationError(strictIssues);

      const { issues, output } = this._parseObjectFields(obj);

      for (const validate of this._validators) {
        const extra = validate(output, []);

        if (extra) issues.push(...extra);
      }

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), output) as InferObject<T>;
    });
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
        issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })));
      }
    }

    return { issues, output };
  }

  override async parseAsync(value: unknown): Promise<InferObject<T>> {
    return this._withCatchAsync(async () => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (this._isOptional && processed === undefined) return undefined as unknown as InferObject<T>;

      if (this._isNullable && processed === null) return null as unknown as InferObject<T>;

      if (processed == null || typeof processed !== 'object' || Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: _messages().object_type(), path: [] }]);
      }

      const obj = processed as Record<string, unknown>;
      const strictIssues = this._strictKeyIssues(obj);

      if (strictIssues.length) throw new ValidationError(strictIssues);

      const keyResults = await Promise.all(
        Object.keys(this.shape).map((key) =>
          this.shape[key].safeParseAsync(obj[key]).then((result) => ({
            data: result.success ? result.data : obj[key],
            issues: result.success
              ? []
              : result.error.issues.map((issue) => ({ ...issue, path: [key, ...issue.path] })),
            key,
          })),
        ),
      );

      const output: Record<string, unknown> = this._mode === 'passthrough' ? { ...obj } : {};

      for (const r of keyResults) {
        if (r.issues.length === 0) output[r.key] = r.data;
      }

      const syncIssues: Issue[] = [];

      for (const validate of this._validators) {
        const extra = validate(output, []);

        if (extra) syncIssues.push(...extra);
      }

      const issues = [...keyResults.flatMap((r) => r.issues), ...syncIssues, ...(await this._runAsync(output, []))];

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), output) as InferObject<T>;
    });
  }

  partial(): ObjectSchema<{ [K in keyof T]: Schema<InferOutput<T[K]> | undefined> }>;
  partial<K extends keyof T>(
    ...keys: K[]
  ): ObjectSchema<Omit<T, K> & { [P in K]: Schema<InferOutput<T[P]> | undefined> }>;
  partial<K extends keyof T>(...keys: K[]): ObjectSchema<any> {
    const targetKeys = keys.length > 0 ? new Set(keys as string[]) : null;

    return new ObjectSchema(
      Object.fromEntries(
        Object.entries(this.shape).map(([k, s]) => [k, targetKeys === null || targetKeys.has(k) ? s.optional() : s]),
      ) as any,
      this._mode,
    )._copyRefinements(this);
  }

  required(): ObjectSchema<{ [K in keyof T]: Schema<Exclude<InferOutput<T[K]>, undefined>> }> {
    return new ObjectSchema(
      Object.fromEntries(Object.entries(this.shape).map(([k, s]) => [k, s.required()])) as any,
      this._mode,
    )._copyRefinements(this);
  }

  extend<U extends ObjectShape>(extra: U): ObjectSchema<Omit<T, keyof U> & U> {
    return new ObjectSchema({ ...this.shape, ...extra } as any, this._mode)._copyRefinements(this);
  }

  pick<K extends keyof T>(...keys: K[]): ObjectSchema<Pick<T, K>> {
    const keySet = new Set(keys as string[]);

    return new ObjectSchema(
      Object.fromEntries(Object.entries(this.shape).filter(([k]) => keySet.has(k))) as any,
      this._mode,
    )._copyRefinements(this);
  }

  omit<K extends keyof T>(...keys: K[]): ObjectSchema<Omit<T, K>> {
    const keySet = new Set(keys as string[]);

    return new ObjectSchema(
      Object.fromEntries(Object.entries(this.shape).filter(([k]) => !keySet.has(k))) as any,
      this._mode,
    )._copyRefinements(this);
  }

  strip(): ObjectSchema<T> {
    return new ObjectSchema(this.shape, 'strip')._copyRefinements(this);
  }

  passthrough(): Schema<InferObject<T> & Record<string, unknown>> {
    return new ObjectSchema(this.shape, 'passthrough')._copyRefinements(this) as unknown as Schema<
      InferObject<T> & Record<string, unknown>
    >;
  }

  strict(): ObjectSchema<T> {
    return new ObjectSchema(this.shape, 'strict')._copyRefinements(this);
  }

  protected _copyRefinements(source: ObjectSchema<any>): this {
    this._validators = [...source._validators];
    this._asyncValidators = [...source._asyncValidators];
    this._preprocessors = [...source._preprocessors];
    this._postprocessors = [...source._postprocessors];
    this._isOptional = source._isOptional;
    this._isNullable = source._isNullable;
    this._hasCatch = source._hasCatch;
    this._catchFactory = source._catchFactory;
    this._description = source._description;

    return this;
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).shape = this.shape;
    (cloned as any)._mode = this._mode;
    (cloned as any)._knownKeys = this._knownKeys;

    return cloned;
  }
}

// Suppress unused-import warning — MessageFn and resolveMessage are used in subclass method signatures
// that TypeScript may not detect if tree-shaken. They're re-exported for convenience.
export type { MessageFn, resolveMessage };

export const object = <T extends ObjectShape>(shape: T): ObjectSchema<T> => new ObjectSchema(shape);
