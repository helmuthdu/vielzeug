import type { Issue, MessageFn, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, fail, prependIssuePath, resolveMessage, Schema, SpellValidationError, _makeCtx } from '../core';
import { _messages } from '../messages';

export class SetSchema<T> extends Schema<Set<T>> {
  readonly itemSchema: Schema<T, any>;

  protected override get _kind(): string {
    return 'set';
  }

  constructor(itemSchema: Schema<T, any>) {
    super();
    this.itemSchema = itemSchema;
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
    if (!(value instanceof Set)) {
      return {
        data: value,
        issues: [{ code: ErrorCode.invalid_type, message: ctx.messages.set.type(), path: [] }],
        typeOk: false,
      };
    }

    const issues: Issue[] = [];
    const parsed = new Set<T>();
    let i = 0;

    for (const item of value) {
      const result = this.itemSchema._parseFullSync(item, ctx);

      if (result.issues.length === 0) {
        parsed.add(result.data as T);
      } else {
        issues.push(...prependIssuePath(result.issues, i));
      }

      i += 1;
    }

    return { data: parsed, issues, typeOk: true };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<Set<T>> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as unknown as Set<T>;

      const raw = prepared.value;

      if (!(raw instanceof Set)) {
        throw new SpellValidationError([{ code: ErrorCode.invalid_type, message: c.messages.set.type(), path: [] }]);
      }

      const items = [...raw];
      const settled = await Promise.all(items.map((item) => this.itemSchema._parseFullAsync(item, c)));

      const issues: Issue[] = [];
      const parsed = new Set<T>();

      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];

        if (result.issues.length === 0) {
          parsed.add(result.data as T);
        } else {
          issues.push(...prependIssuePath(result.issues, i));
        }
      }

      const validationIssues = await this._runValidatorsAsync(parsed, c);
      const allIssues = [...issues, ...validationIssues];

      if (allIssues.length > 0) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(parsed) as Set<T>;
    });
  }

  min(
    size: number,
    message: MessageFn<{ min: number; value: Set<unknown> }> = (ctx) => _messages().set.min(ctx),
  ): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Set<unknown>;

      if (typed.size >= size) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: size, value: typed }), { min: size });
    });
  }

  max(
    size: number,
    message: MessageFn<{ max: number; value: Set<unknown> }> = (ctx) => _messages().set.max(ctx),
  ): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Set<unknown>;

      if (typed.size <= size) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { max: size, value: typed }), { max: size });
    });
  }

  size(
    exact: number,
    message: MessageFn<{ exact: number; value: Set<unknown> }> = (ctx) => _messages().set.size(ctx),
  ): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Set<unknown>;

      if (typed.size === exact) return null;

      return fail(ErrorCode.invalid_length, resolveMessage(message, { exact, value: typed }), { exact });
    });
  }

  nonEmpty(message: MessageFn<{ min: number }> = () => _messages().set.nonEmpty()): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Set<unknown>;

      if (typed.size > 0) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: 1 }), { min: 1 });
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), items: this.itemSchema.toDescriptor(), kind: 'set' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const item = this.itemSchema.walk(visitor);

    if (visitor.set) return visitor.set(this, item);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof SetSchema)) return false;

    return this.itemSchema.equals(other.itemSchema);
  }
}
