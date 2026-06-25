import type { Issue, MessageFn, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, SpellValidationError, _makeCtx, fail, prependIssuePath, resolveMessage } from '../core';
import { _messages } from '../messages';

/* -------------------- Typed annotations -------------------- */

interface ArrayAnnotations extends Record<string, unknown> {
  maxItems?: number;
  minItems?: number;
}

export class ArraySchema<T> extends Schema<T[]> {
  readonly itemSchema: Schema<T, any>;

  protected override get _kind(): string {
    return 'array';
  }

  constructor(itemSchema: Schema<T, any>) {
    super();
    this.itemSchema = itemSchema;
  }

  private _parseItemsSync(items: unknown[], ctx: ParseContext): { data: T[]; issues: Issue[] } {
    const issues: Issue[] = [];
    const parsed: T[] = [];

    for (let i = 0; i < items.length; i++) {
      const result = this.itemSchema._parseFullSync(items[i], ctx);

      if (result.issues.length === 0) {
        parsed.push(result.data as T);
      } else {
        issues.push(...prependIssuePath(result.issues, i));
        parsed.push(items[i] as T);
      }
    }

    return { data: parsed, issues };
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    if (!Array.isArray(value)) {
      return { data: value, issues: fail(ErrorCode.invalid_type, ctx.messages.array.type()), typeOk: false };
    }

    const { data: items, issues } = this._parseItemsSync(value, ctx);

    return { data: items, issues, typeOk: true };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<T[]> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as unknown as T[];

      const raw = prepared.value;

      if (!Array.isArray(raw)) {
        throw new SpellValidationError(fail(ErrorCode.invalid_type, c.messages.array.type()));
      }

      const settled = await Promise.all(raw.map((item) => this.itemSchema._parseFullAsync(item, c)));

      const issues: Issue[] = [];
      const parsed: T[] = [];

      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];

        if (result.issues.length === 0) {
          parsed.push(result.data as T);
        } else {
          issues.push(...prependIssuePath(result.issues, i));
          parsed.push(raw[i] as T);
        }
      }

      const validationIssues = await this._runValidatorsAsync(parsed, c);
      const allIssues = [...issues, ...validationIssues];

      if (allIssues.length > 0) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(parsed) as T[];
    });
  }

  min(
    length: number,
    message: MessageFn<{ min: number; value: unknown[] }> = (ctx) => _messages().array.min(ctx),
  ): this {
    return this._addConstraint(
      (value, _ctx) => {
        if ((value as unknown[]).length >= length) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { min: length, value: value as unknown[] }), {
          min: length,
        });
      },
      (current) => {
        const ann = current as ArrayAnnotations;

        return {
          ...ann,
          minItems: ann.minItems === undefined ? length : Math.max(ann.minItems, length),
        };
      },
    );
  }

  max(
    length: number,
    message: MessageFn<{ max: number; value: unknown[] }> = (ctx) => _messages().array.max(ctx),
  ): this {
    return this._addConstraint(
      (value, _ctx) => {
        if ((value as unknown[]).length <= length) return null;

        return fail(ErrorCode.too_big, resolveMessage(message, { max: length, value: value as unknown[] }), {
          max: length,
        });
      },
      (current) => {
        const ann = current as ArrayAnnotations;

        return {
          ...ann,
          maxItems: ann.maxItems === undefined ? length : Math.min(ann.maxItems, length),
        };
      },
    );
  }

  length(
    exact: number,
    message: MessageFn<{ exact: number; value: unknown[] }> = (ctx) => _messages().array.length(ctx),
  ): this {
    return this._addConstraint(
      (value, _ctx) => {
        if ((value as unknown[]).length === exact) return null;

        return fail(ErrorCode.invalid_length, resolveMessage(message, { exact, value: value as unknown[] }), { exact });
      },
      (ann) => ({ ...ann, maxItems: exact, minItems: exact }),
    );
  }

  nonEmpty(message: MessageFn<{ min: number; value: unknown[] }> = () => _messages().array.nonEmpty()): this {
    return this.min(1, message);
  }

  /**
   * Validates that all array elements are unique.
   *
   * **Default behaviour:** Uniqueness is checked using JavaScript `Set` semantics, which means
   * **referential equality** for objects. Two structurally identical objects such as
   * `{ id: 1 }` and `{ id: 1 }` are considered different values and will not be
   * flagged as duplicates.
   *
   * **Custom equality:** Pass an `equalsFn` to use structural or domain-specific comparison
   * logic (e.g. compare by a specific field, or use deep equality).
   *
   * @example
   * s.array(s.object({ id: s.number() })).unique((a, b) => a.id === b.id)
   */
  unique(
    equalsFnOrMessage?: ((a: T, b: T) => boolean) | MessageFn<{ value: unknown[] }>,
    message: MessageFn<{ value: unknown[] }> = () => _messages().array.unique(),
  ): this {
    const isCustomEqualsFn = typeof equalsFnOrMessage === 'function' && equalsFnOrMessage.length === 2;
    const equalsFn = isCustomEqualsFn ? (equalsFnOrMessage as (a: T, b: T) => boolean) : null;
    const resolvedMessage = isCustomEqualsFn
      ? message
      : typeof equalsFnOrMessage === 'function'
        ? (equalsFnOrMessage as MessageFn<{ value: unknown[] }>)
        : () => _messages().array.unique();

    return this._addConstraint((value, _ctx) => {
      const typed = value as T[];
      let isUnique: boolean;

      if (equalsFn) {
        isUnique = typed.every((a, i) => typed.slice(0, i).every((b) => !equalsFn(a, b)));
      } else {
        isUnique = new Set(typed).size === typed.length;
      }

      if (isUnique) return null;

      return fail(ErrorCode.invalid_unique, resolveMessage(resolvedMessage, { value: typed as unknown[] }), {
        unique: true,
      });
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    const ann = this._annotations as ArrayAnnotations;

    return {
      ...this._describeBase(),
      ...(ann.maxItems !== undefined ? { maxItems: ann.maxItems } : {}),
      ...(ann.minItems !== undefined ? { minItems: ann.minItems } : {}),
      items: this.itemSchema.toDescriptor(),
      kind: 'array',
    };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const item = this.itemSchema.walk(visitor);

    if (visitor.array) return visitor.array(this, item);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof ArraySchema)) return false;

    const o = other as ArraySchema<any>;

    const annotations = this._annotations as ArrayAnnotations;
    const otherAnnotations = other._annotations as ArrayAnnotations;

    return (
      this.itemSchema.equals(o.itemSchema as import('../core').AnySchema) &&
      annotations.minItems === otherAnnotations.minItems &&
      annotations.maxItems === otherAnnotations.maxItems
    );
  }
}
