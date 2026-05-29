import type { Issue, MessageFn } from '../core';

import { ErrorCode, Schema, fail, prependIssuePath, resolveMessage } from '../core';
import { _messages } from '../messages';

export class ArraySchema<T> extends Schema<T[]> {
  readonly itemSchema: Schema<T, any>;
  /** @internal JSON Schema annotation — populated by min()/length()/nonEmpty() */
  _minItems?: number;
  /** @internal JSON Schema annotation — populated by max()/length() */
  _maxItems?: number;

  constructor(itemSchema: Schema<T, any>) {
    super();
    this.itemSchema = itemSchema;
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
      return { data: value, issues: fail(ErrorCode.invalid_type, _messages().array.type()) };
    }

    const { data: items, issues } = this._parseItemsSync(value);

    return { data: items, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    if (!Array.isArray(value)) {
      return { data: value, issues: fail(ErrorCode.invalid_type, _messages().array.type()) };
    }

    const { data: items, issues } = await this._parseItemsAsync(value);

    return { data: items, issues };
  }

  min(
    length: number,
    message: MessageFn<{ min: number; value: unknown[] }> = (ctx) => _messages().array.min(ctx),
  ): this {
    const next = this._addValidator((value) => {
      if ((value as unknown[]).length >= length) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: length, value: value as unknown[] }), {
        min: length,
      });
    }) as ArraySchema<any>;

    next._minItems = next._minItems === undefined ? length : Math.max(next._minItems, length);

    return next as this;
  }

  max(
    length: number,
    message: MessageFn<{ max: number; value: unknown[] }> = (ctx) => _messages().array.max(ctx),
  ): this {
    const next = this._addValidator((value) => {
      if ((value as unknown[]).length <= length) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { max: length, value: value as unknown[] }), {
        max: length,
      });
    }) as ArraySchema<any>;

    next._maxItems = next._maxItems === undefined ? length : Math.min(next._maxItems, length);

    return next as this;
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: unknown[] }> = (ctx) => _messages().array.length(ctx),
  ): this {
    const next = this._addValidator((value) => {
      if ((value as unknown[]).length === exact) return null;

      return fail(ErrorCode.invalid_length, resolveMessage(message, { exact, value: value as unknown[] }), { exact });
    }) as ArraySchema<any>;

    next._minItems = exact;
    next._maxItems = exact;

    return next as this;
  }

  nonEmpty(message: MessageFn<{ min: number; value: unknown[] }> = () => _messages().array.nonEmpty()): this {
    return this.min(1, message);
  }

  unique(message: MessageFn<{ value: unknown[] }> = () => _messages().array.unique()): this {
    return this._addValidator((value) => {
      const typed = value as unknown[];

      if (new Set(typed).size === typed.length) return null;

      return fail(ErrorCode.invalid_unique, resolveMessage(message, { value: typed }), { unique: true });
    });
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    const base: Record<string, unknown> = { items: this.itemSchema.schema(), type: 'array' };

    if (this._minItems !== undefined) base['minItems'] = this._minItems;

    if (this._maxItems !== undefined) base['maxItems'] = this._maxItems;

    return base;
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    const item = this.itemSchema.walk(visitor);

    if (visitor.array) return visitor.array(this, item);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof ArraySchema)) return false;

    const o = other as ArraySchema<any>;

    return (
      this.itemSchema.equals(o.itemSchema as import('../core').AnySchema) &&
      this._minItems === o._minItems &&
      this._maxItems === o._maxItems
    );
  }
}
