import type { Issue, MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, fail, prependIssuePath, resolveMessage } from '../core';
import { _messages } from '../messages';

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
    return this._addConstraint(
      (value) => {
        if ((value as unknown[]).length >= length) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { min: length, value: value as unknown[] }), {
          min: length,
        });
      },
      (ann) => ({
        ...ann,
        minItems: ann['minItems'] === undefined ? length : Math.max(ann['minItems'] as number, length),
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
        maxItems: ann['maxItems'] === undefined ? length : Math.min(ann['maxItems'] as number, length),
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

  protected override _toSchemaBase(): Record<string, unknown> {
    const ann = this._annotations;
    const base: Record<string, unknown> = { items: this.itemSchema.toJsonSchema(), type: 'array' };

    if (ann['minItems'] !== undefined) base['minItems'] = ann['minItems'];

    if (ann['maxItems'] !== undefined) base['maxItems'] = ann['maxItems'];

    return base;
  }

  protected override _describeImpl(): SchemaDescriptor {
    const ann = this._annotations;

    return {
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
      ...(ann['maxItems'] !== undefined ? { maxItems: ann['maxItems'] as number } : {}),
      ...(ann['minItems'] !== undefined ? { minItems: ann['minItems'] as number } : {}),
      items: this.itemSchema.describe(),
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
      this._annotations['minItems'] === other._annotations['minItems'] &&
      this._annotations['maxItems'] === other._annotations['maxItems']
    );
  }
}
