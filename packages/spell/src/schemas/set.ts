import type { Issue, MessageFn, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, fail, prependIssuePath, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

export class SetSchema<T> extends Schema<Set<T>> {
  readonly itemSchema: Schema<T, any>;

  constructor(itemSchema: Schema<T, any>) {
    super();
    this.itemSchema = itemSchema;
  }

  private _invalidSet(value: unknown): ParseValue {
    return {
      data: value,
      issues: [{ code: ErrorCode.invalid_type, message: _messages().set.type(), path: [] }],
      typeOk: false,
    };
  }

  protected override _parseValueSync(value: unknown): ParseValue {
    if (!(value instanceof Set)) {
      return this._invalidSet(value);
    }

    const issues: Issue[] = [];
    const parsed = new Set<T>();
    let i = 0;

    for (const item of value) {
      const result = this.itemSchema._parseFullSync(item);

      if (result.issues.length === 0) {
        parsed.add(result.data as T);
      } else {
        issues.push(...prependIssuePath(result.issues, i));
      }

      i += 1;
    }

    return { data: parsed, issues, typeOk: true };
  }

  protected override async _parseValueAsync(value: unknown): Promise<ParseValue> {
    if (!(value instanceof Set)) {
      return this._invalidSet(value);
    }

    const parsed = new Set<T>();
    const issues: Issue[] = [];
    let i = 0;

    for (const item of value) {
      const result = await this.itemSchema._parseFullAsync(item);

      if (result.issues.length === 0) {
        parsed.add(result.data as T);
      } else {
        issues.push(...prependIssuePath(result.issues, i));
      }

      i += 1;
    }

    return { data: parsed, issues, typeOk: true };
  }

  min(
    size: number,
    message: MessageFn<{ min: number; value: Set<unknown> }> = (ctx) => _messages().set.min(ctx),
  ): this {
    return this._addConstraint((value) => {
      const typed = value as Set<unknown>;

      if (typed.size >= size) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: size, value: typed }), { min: size });
    });
  }

  max(
    size: number,
    message: MessageFn<{ max: number; value: Set<unknown> }> = (ctx) => _messages().set.max(ctx),
  ): this {
    return this._addConstraint((value) => {
      const typed = value as Set<unknown>;

      if (typed.size <= size) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { max: size, value: typed }), { max: size });
    });
  }

  size(
    exact: number,
    message: MessageFn<{ exact: number; value: Set<unknown> }> = (ctx) => _messages().set.size(ctx),
  ): this {
    return this._addConstraint((value) => {
      const typed = value as Set<unknown>;

      if (typed.size === exact) return null;

      return fail(ErrorCode.invalid_length, resolveMessage(message, { exact, value: typed }), { exact });
    });
  }

  nonEmpty(message: MessageFn<{ min: number }> = () => _messages().set.nonEmpty()): this {
    return this._addConstraint((value) => {
      const typed = value as Set<unknown>;

      if (typed.size > 0) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: 1 }), { min: 1 });
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), items: this.itemSchema.toDescriptor(), kind: 'set' };
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
}
