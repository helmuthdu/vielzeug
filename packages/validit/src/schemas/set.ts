import type { Issue, MessageFn, ParseResult, Schema as BaseSchema } from '../core';

import { ErrorCode, prependIssuePath, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

export class SetSchema<T> extends Schema<Set<T>> {
  readonly itemSchema: BaseSchema<T, any, any>;

  constructor(itemSchema: BaseSchema<T, any, any>) {
    super([]);
    this.itemSchema = itemSchema;
  }

  private _invalidSet(value: unknown): { data: unknown; issues: Issue[] } {
    return {
      data: value,
      issues: [{ code: ErrorCode.invalid_type, message: _messages().set.type(), path: [] }],
    };
  }

  private _mergeItemResult(parsed: Set<T>, issues: Issue[], index: number, result: ParseResult<T>): void {
    if (result.success) {
      parsed.add(result.data);
    } else {
      issues.push(...prependIssuePath(result.error.issues, index));
    }
  }

  protected override _parseValueSync(value: unknown): { data: unknown; issues: Issue[] } {
    if (!(value instanceof Set)) {
      return this._invalidSet(value);
    }

    const issues: Issue[] = [];
    const parsed = new Set<T>();
    let i = 0;

    for (const item of value) {
      const result = this.itemSchema.safeParse(item);

      this._mergeItemResult(parsed, issues, i, result);

      i += 1;
    }

    return { data: parsed, issues };
  }

  protected override async _parseValueAsync(value: unknown): Promise<{ data: unknown; issues: Issue[] }> {
    if (!(value instanceof Set)) {
      return this._invalidSet(value);
    }

    const parsed = new Set<T>();
    const items = [...value.values()];
    const itemResults = await Promise.all(items.map((item) => this.itemSchema.safeParseAsync(item)));
    const issues: Issue[] = [];

    for (let i = 0; i < itemResults.length; i++) {
      this._mergeItemResult(parsed, issues, i, itemResults[i]);
    }

    return { data: parsed, issues };
  }

  min(
    size: number,
    message: MessageFn<{ min: number; value: Set<unknown> }> = (ctx) => _messages().set.min(ctx),
  ): this {
    return this._addValidator((value) => {
      const typed = value as Set<unknown>;

      if (typed.size >= size) return null;

      return [{ code: ErrorCode.too_small, message: resolveMessage(message, { min: size, value: typed }), params: { min: size }, path: [] }];
    });
  }

  max(
    size: number,
    message: MessageFn<{ max: number; value: Set<unknown> }> = (ctx) => _messages().set.max(ctx),
  ): this {
    return this._addValidator((value) => {
      const typed = value as Set<unknown>;

      if (typed.size <= size) return null;

      return [{ code: ErrorCode.too_big, message: resolveMessage(message, { max: size, value: typed }), params: { max: size }, path: [] }];
    });
  }

  size(
    exact: number,
    message: MessageFn<{ exact: number; value: Set<unknown> }> = (ctx) => _messages().set.size(ctx),
  ): this {
    return this._addValidator((value) => {
      const typed = value as Set<unknown>;

      if (typed.size === exact) return null;

      return [{ code: ErrorCode.invalid_length, message: resolveMessage(message, { exact, value: typed }), params: { exact }, path: [] }];
    });
  }

  nonEmpty(message: MessageFn<{ min: number }> = () => _messages().set.nonEmpty()): this {
    return this._addValidator((value) => {
      const typed = value as Set<unknown>;

      if (typed.size > 0) return null;

      return [{ code: ErrorCode.too_small, message: resolveMessage(message, { min: 1 }), params: { min: 1 }, path: [] }];
    });
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    const item = this.itemSchema.walk(visitor);

    if (visitor.set) return visitor.set(this, item);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof SetSchema)) return false;

    return this.itemSchema.equals(other.itemSchema) && super._equalsImpl(other);
  }

  protected override _construct(state: import('../core').SchemaState<any, any>): this {
    const next = new SetSchema(this.itemSchema) as this;

    next.state = state as any;

    return next;
  }
}
