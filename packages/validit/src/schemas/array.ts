import type { Issue, MessageFn } from '../core';

import { ErrorCode, prependIssuePath, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

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

    return { data: itemResults.map((r) => r.data), issues: itemResults.flatMap((r) => r.issues) };
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
}

export const array = <T>(schema: Schema<T>): ArraySchema<T> => new ArraySchema(schema);
