import type { Issue, MessageFn } from '../core';

import { ErrorCode, resolveMessage, Schema, ValidationError } from '../core';
import { _messages } from '../messages';

export class ArraySchema<T> extends Schema<T[]> {
  private readonly itemSchema: Schema<T>;

  constructor(itemSchema: Schema<T>) {
    super([]);
    this.itemSchema = itemSchema;
  }

  override parse(value: unknown): T[] {
    if (this._asyncValidators.length > 0) {
      throw new Error('Schema contains async validators. Use parseAsync() or safeParseAsync() instead of parse().');
    }

    return this._withCatch(() => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (this._isOptional && processed === undefined) return undefined as unknown as T[];

      if (this._isNullable && processed === null) return null as unknown as T[];

      if (!Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: _messages().array_type(), path: [] }]);
      }

      const issues: Issue[] = [];
      const items: T[] = [];

      for (let i = 0; i < processed.length; i++) {
        const result = this.itemSchema.safeParse(processed[i]);

        if (result.success) {
          items.push(result.data);
        } else {
          issues.push(...result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })));
          items.push(processed[i] as T);
        }
      }
      for (const validate of this._validators) {
        const extra = validate(items, []);

        if (extra) issues.push(...extra);
      }

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), items) as T[];
    });
  }

  override async parseAsync(value: unknown): Promise<T[]> {
    return this._withCatchAsync(async () => {
      const processed = this._preprocessors.reduce((v, fn) => fn(v), value);

      if (this._isOptional && processed === undefined) return undefined as unknown as T[];

      if (this._isNullable && processed === null) return null as unknown as T[];

      if (!Array.isArray(processed)) {
        throw new ValidationError([{ code: ErrorCode.invalid_type, message: _messages().array_type(), path: [] }]);
      }

      const itemResults = await Promise.all(
        processed.map((item, i) =>
          this.itemSchema.safeParseAsync(item).then((result) => ({
            data: result.success ? result.data : (item as T),
            issues: result.success ? [] : result.error.issues.map((issue) => ({ ...issue, path: [i, ...issue.path] })),
          })),
        ),
      );
      const items = itemResults.map((r) => r.data);
      const arrayIssues: Issue[] = [];

      for (const validate of this._validators) {
        const extra = validate(items, []);

        if (extra) arrayIssues.push(...extra);
      }

      const issues = [...itemResults.flatMap((r) => r.issues), ...arrayIssues, ...(await this._runAsync(items, []))];

      if (issues.length) throw new ValidationError(issues);

      return this._postprocessors.reduce((v, fn) => fn(v), items) as T[];
    });
  }

  min(length: number, message: MessageFn<{ min: number }> = (ctx) => _messages().array_min(ctx)): this {
    return this._addValidator((value, path) =>
      (value as unknown[]).length >= length
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { min: length }),
              params: { minimum: length },
              path,
            },
          ],
    );
  }

  max(length: number, message: MessageFn<{ max: number }> = (ctx) => _messages().array_max(ctx)): this {
    return this._addValidator((value, path) =>
      (value as unknown[]).length <= length
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { max: length }),
              params: { maximum: length },
              path,
            },
          ],
    );
  }

  length(exact: number, message: MessageFn<{ exact: number }> = (ctx) => _messages().array_length(ctx)): this {
    return this._addValidator((value, path) =>
      (value as unknown[]).length === exact
        ? null
        : [{ code: ErrorCode.invalid_length, message: resolveMessage(message, { exact }), params: { exact }, path }],
    );
  }

  nonempty(message: MessageFn<{ min: number }> = () => _messages().array_nonempty()): this {
    return this.min(1, message);
  }

  protected override _clone(validators = this._validators): this {
    const cloned = super._clone(validators);

    (cloned as any).itemSchema = this.itemSchema;

    return cloned;
  }
}

export const array = <T>(schema: Schema<T>): ArraySchema<T> => new ArraySchema(schema);
