import type { Issue, MessageFn, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, fail, prependIssuePath, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

/* -------------------- Typed annotations -------------------- */

interface ArrayAnnotations extends Record<string, unknown> {
  maxItems?: number;
  minItems?: number;
}

export class ArraySchema<T> extends Schema<T[]> {
  readonly itemSchema: Schema<T, any>;

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

  protected override _parseValueSync(value: unknown): ParseValue {
    if (!Array.isArray(value)) {
      return { data: value, issues: fail(ErrorCode.invalid_type, _messages().array.type()), typeOk: false };
    }

    const { data: items, issues } = this._parseItemsSync(value);

    return { data: items, issues, typeOk: true };
  }

  protected override async _parseValueAsync(value: unknown): Promise<ParseValue> {
    if (!Array.isArray(value)) {
      return { data: value, issues: fail(ErrorCode.invalid_type, _messages().array.type()), typeOk: false };
    }

    const { data: items, issues } = await this._parseItemsAsync(value);

    return { data: items, issues, typeOk: true };
  }

  min(
    length: number,
    message: MessageFn<{ min: number; value: unknown[] }> = (ctx) => _messages().array.min(ctx),
  ): this {
    return this._addConstraint(
      (value) => {
        if ((value as unknown[]).length >= length) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { min: length, value: value as unknown[] }), {
          min: length,
        });
      },
      (ann) => ({
        ...ann,
        minItems: ann.minItems === undefined ? length : Math.max(ann.minItems, length),
      }),
    );
  }

  max(
    length: number,
    message: MessageFn<{ max: number; value: unknown[] }> = (ctx) => _messages().array.max(ctx),
  ): this {
    return this._addConstraint(
      (value) => {
        if ((value as unknown[]).length <= length) return null;

        return fail(ErrorCode.too_big, resolveMessage(message, { max: length, value: value as unknown[] }), {
          max: length,
        });
      },
      (ann) => ({
        ...ann,
        maxItems: ann.maxItems === undefined ? length : Math.min(ann.maxItems, length),
      }),
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: unknown[] }> = (ctx) => _messages().array.length(ctx),
  ): this {
    return this._addConstraint(
      (value) => {
        if ((value as unknown[]).length === exact) return null;

        return fail(ErrorCode.invalid_length, resolveMessage(message, { exact, value: value as unknown[] }), { exact });
      },
      (ann) => ({ ...ann, maxItems: exact, minItems: exact }),
    );
  }

  nonEmpty(message: MessageFn<{ min: number; value: unknown[] }> = () => _messages().array.nonEmpty()): this {
    return this.min(1, message);
  }

  unique(message: MessageFn<{ value: unknown[] }> = () => _messages().array.unique()): this {
    return this._addConstraint((value) => {
      const typed = value as unknown[];

      if (new Set(typed).size === typed.length) return null;

      return fail(ErrorCode.invalid_unique, resolveMessage(message, { value: typed }), { unique: true });
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    const ann = this._annotations;

    return {
      ...this._describeBase(),
      ...(ann.maxItems !== undefined ? { maxItems: ann.maxItems } : {}),
      ...(ann.minItems !== undefined ? { minItems: ann.minItems } : {}),
      items: this.itemSchema.toDescriptor(),
      kind: 'array',
    };
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
      this._annotations.minItems === other._annotations.minItems &&
      this._annotations.maxItems === other._annotations.maxItems
    );
  }
}
