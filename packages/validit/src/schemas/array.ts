import type { ArrayConstraints, Issue, MessageFn } from '../core';

import { ErrorCode, Schema, prependIssuePath, resolveMessage } from '../core';
import { _messages } from '../messages';

export class ArraySchema<T> extends Schema<T[], T[], ArrayConstraints> {
  readonly itemSchema: Schema<T, any, any>;

  constructor(itemSchema: Schema<T, any, any>) {
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

    return { data: items, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    if (!Array.isArray(value)) {
      return this._invalidArray(value);
    }

    const { data: items, issues } = await this._parseItemsAsync(value);

    return { data: items, issues };
  }

  min(
    length: number,
    message: MessageFn<{ min: number; value: unknown[] }> = (ctx) => _messages().array.min(ctx),
  ): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as unknown[];

        if (typed.length >= length) return null;

        return [{ code: ErrorCode.too_small, message: resolveMessage(message, { min: length, value: typed }), params: { min: length }, path: [] }];
      },
      { minItems: length },
    );
  }

  max(
    length: number,
    message: MessageFn<{ max: number; value: unknown[] }> = (ctx) => _messages().array.max(ctx),
  ): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as unknown[];

        if (typed.length <= length) return null;

        return [{ code: ErrorCode.too_big, message: resolveMessage(message, { max: length, value: typed }), params: { max: length }, path: [] }];
      },
      { maxItems: length },
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: unknown[] }> = (ctx) => _messages().array.length(ctx),
  ): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as unknown[];

        if (typed.length === exact) return null;

        return [{ code: ErrorCode.invalid_length, message: resolveMessage(message, { exact, value: typed }), params: { exact }, path: [] }];
      },
      { maxItems: exact, minItems: exact },
    );
  }

  nonEmpty(message: MessageFn<{ min: number; value: unknown[] }> = () => _messages().array.nonEmpty()): this {
    return this.min(1, message);
  }

  unique(message: MessageFn<{ value: unknown[] }> = () => _messages().array.unique()): this {
    return this._addValidator((value) => {
      const typed = value as unknown[];

      if (new Set(typed).size === typed.length) return null;

      return [{ code: ErrorCode.invalid_unique, message: resolveMessage(message, { value: typed }), params: { unique: true }, path: [] }];
    });
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    const base: Record<string, unknown> = { items: this.itemSchema.schema(), type: 'array' };
    const constraints = this.state.meta?.constraints;

    if (constraints) {
      if (constraints.minItems !== undefined) base['minItems'] = constraints.minItems;
      if (constraints.maxItems !== undefined) base['maxItems'] = constraints.maxItems;
    }

    return base;
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    const item = this.itemSchema.walk(visitor);

    if (visitor.array) return visitor.array(this, item);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof ArraySchema)) return false;

    return this.itemSchema.equals(other.itemSchema as import('../core').AnySchema) && super._equalsImpl(other);
  }

  protected override _construct(state: import('../core').SchemaState<any, any>): this {
    const next = new ArraySchema(this.itemSchema) as this;

    next.state = state as any;

    return next;
  }
}
