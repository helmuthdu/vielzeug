import type { Issue, MessageFn } from '../core';

import { ErrorCode, prependIssuePath, Schema } from '../core';
import { _messages } from '../messages';
import { createConstraintValidator } from './constraint-factories';

export class ArraySchema<T> extends Schema<T[]> {
  private readonly itemSchema: Schema<T>;

  constructor(itemSchema: Schema<T>) {
    super([]);
    this.itemSchema = itemSchema;
  }

  private _invalidArray(value: unknown): { data: unknown; issues: Issue[] } {
    return {
      data: value,
      issues: [{ code: ErrorCode.invalid_type, message: _messages().array.type(), path: [] }],
    };
  }

  private _parseItemsSync(items: unknown[]): { data: T[]; issues: Issue[] } {
    const issues: Issue[] = [];
    const parsed: T[] = [];

    for (let i = 0; i < items.length; i++) {
      const result = this.itemSchema.safeParse(items[i]);

      if (result.success) {
        parsed.push(result.data);
      } else {
        issues.push(...prependIssuePath(result.error.issues, i));
        parsed.push(items[i] as T);
      }
    }

    return { data: parsed, issues };
  }

  private async _parseItemsAsync(items: unknown[]): Promise<{ data: T[]; issues: Issue[] }> {
    const itemResults = await Promise.all(
      items.map((item, i) =>
        this.itemSchema.safeParseAsync(item).then((result) => ({
          data: result.success ? result.data : (item as T),
          issues: result.success ? [] : prependIssuePath(result.error.issues, i),
        })),
      ),
    );

    return {
      data: itemResults.map((r) => r.data),
      issues: itemResults.flatMap((r) => r.issues),
    };
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    if (!Array.isArray(value)) {
      return this._invalidArray(value);
    }

    const { data: items, issues } = this._parseItemsSync(value);

    issues.push(...this._runCoreValidators(items));

    return { data: items, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    if (!Array.isArray(value)) {
      return this._invalidArray(value);
    }

    const { data: items, issues } = await this._parseItemsAsync(value);

    issues.push(...this._runCoreValidators(items));

    return { data: items, issues };
  }

  min(
    length: number,
    message: MessageFn<{ min: number; value: unknown[] }> = (ctx) => _messages().array.min(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<unknown[], { min: number; value: unknown[] }>({
        check: (value) => value.length >= length,
        code: ErrorCode.too_small,
        context: { min: length },
        message,
        params: { minimum: length },
      }),
    );
  }

  max(
    length: number,
    message: MessageFn<{ max: number; value: unknown[] }> = (ctx) => _messages().array.max(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<unknown[], { max: number; value: unknown[] }>({
        check: (value) => value.length <= length,
        code: ErrorCode.too_big,
        context: { max: length },
        message,
        params: { maximum: length },
      }),
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: unknown[] }> = (ctx) => _messages().array.length(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<unknown[], { exact: number; value: unknown[] }>({
        check: (value) => value.length === exact,
        code: ErrorCode.invalid_length,
        context: { exact },
        message,
        params: { exact },
      }),
    );
  }

  nonEmpty(message: MessageFn<{ min: number; value: unknown[] }> = () => _messages().array.nonEmpty()): this {
    return this.min(1, message);
  }

  unique(message: MessageFn<{ value: unknown[] }> = () => _messages().array.unique()): this {
    return this._addCoreValidator(
      createConstraintValidator<unknown[], { value: unknown[] }>({
        check: (value) => new Set(value).size === value.length,
        code: ErrorCode.not_unique,
        message,
        params: { unique: true },
      }),
    );
  }
}
