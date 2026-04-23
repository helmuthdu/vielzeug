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

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    if (!Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: _messages().array_type(), path: [] }],
      };
    }

    const issues: Issue[] = [];
    const items: T[] = [];

    for (let i = 0; i < value.length; i++) {
      const result = this.itemSchema.safeParse(value[i]);

      if (result.success) {
        items.push(result.data);
      } else {
        issues.push(...prependIssuePath(result.error.issues, i));
        items.push(value[i] as T);
      }
    }

    issues.push(...this._runCoreValidators(items, []));

    return { data: items, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    if (!Array.isArray(value)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: _messages().array_type(), path: [] }],
      };
    }

    const itemResults = await Promise.all(
      value.map((item, i) =>
        this.itemSchema.safeParseAsync(item).then((result) => ({
          data: result.success ? result.data : (item as T),
          issues: result.success ? [] : prependIssuePath(result.error.issues, i),
        })),
      ),
    );

    const items = itemResults.map((r) => r.data);
    const issues = itemResults.flatMap((r) => r.issues);

    issues.push(...this._runCoreValidators(items, []));

    return { data: items, issues };
  }

  min(
    length: number,
    message: MessageFn<{ min: number; value: unknown[] }> = (ctx) => _messages().array_min(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<unknown[], { min: number; value: unknown[] }>({
        check: (value) => value.length >= length,
        code: ErrorCode.too_small,
        context: (value) => ({ min: length, value }),
        message,
        params: () => ({ minimum: length }),
      }),
    );
  }

  max(
    length: number,
    message: MessageFn<{ max: number; value: unknown[] }> = (ctx) => _messages().array_max(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<unknown[], { max: number; value: unknown[] }>({
        check: (value) => value.length <= length,
        code: ErrorCode.too_big,
        context: (value) => ({ max: length, value }),
        message,
        params: () => ({ maximum: length }),
      }),
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: unknown[] }> = (ctx) => _messages().array_length(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<unknown[], { exact: number; value: unknown[] }>({
        check: (value) => value.length === exact,
        code: ErrorCode.invalid_length,
        context: (value) => ({ exact, value }),
        message,
        params: () => ({ exact }),
      }),
    );
  }

  nonEmpty(message: MessageFn<{ min: number; value: unknown[] }> = () => _messages().array_nonempty()): this {
    return this.min(1, message);
  }
}
