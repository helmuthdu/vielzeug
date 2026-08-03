import type { AnySchema, InferOutput, Issue, MessageFn, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, fail, prependIssuePath, resolveMessage, Schema, SpellValidationError, _makeCtx } from '../core';

export class SetSchema<
  T extends AnySchema,
  Mode extends import('../core').SchemaMode = import('../core').MergeSchemaModes<import('../core').InferSchemaMode<T>>,
> extends Schema<Set<InferOutput<T>>, unknown, Mode> {
  readonly itemSchema: T;

  protected override get _kind(): string {
    return 'set';
  }

  override checkAsync(
    this: SetSchema<T, 'sync'>,
    fn: (value: Set<InferOutput<T>>, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): SetSchema<T, 'async'> {
    return this._addCheck(fn, true) as unknown as SetSchema<T, 'async'>;
  }

  constructor(itemSchema: T) {
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
    const parsed = new Set<InferOutput<T>>();
    let i = 0;

    for (const item of value) {
      const result = this.itemSchema._parseFullSync(item, ctx);

      if (result.issues.length === 0) {
        parsed.add(result.data as InferOutput<T>);
      } else {
        issues.push(...prependIssuePath(result.issues, i));
      }

      i += 1;
    }

    return { data: parsed, issues, typeOk: true };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<Set<InferOutput<T>>> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as unknown as Set<InferOutput<T>>;

      const raw = prepared.value;

      if (!(raw instanceof Set)) {
        throw new SpellValidationError([{ code: ErrorCode.invalid_type, message: c.messages.set.type(), path: [] }]);
      }

      const items = [...raw];
      const settled = await Promise.all(items.map((item) => this.itemSchema._parseFullAsync(item, c)));

      const issues: Issue[] = [];
      const parsed = new Set<InferOutput<T>>();

      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];

        if (result.issues.length === 0) {
          parsed.add(result.data as InferOutput<T>);
        } else {
          issues.push(...prependIssuePath(result.issues, i));
        }
      }

      const validationIssues = await this._runValidatorsAsync(parsed, c);
      const allIssues = [...issues, ...validationIssues];

      if (allIssues.length > 0) throw new SpellValidationError(allIssues);

      return this._runPostprocessors(parsed) as Set<InferOutput<T>>;
    });
  }

  min(size: number, message?: MessageFn<{ min: number; value: Set<unknown> }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Set<unknown>;

      if (typed.size >= size) return null;

      return fail(ErrorCode.too_small, resolveMessage(message ?? ctx!.messages.set.min, { min: size, value: typed }), {
        min: size,
      });
    });
  }

  max(size: number, message?: MessageFn<{ max: number; value: Set<unknown> }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Set<unknown>;

      if (typed.size <= size) return null;

      return fail(ErrorCode.too_big, resolveMessage(message ?? ctx!.messages.set.max, { max: size, value: typed }), {
        max: size,
      });
    });
  }

  size(exact: number, message?: MessageFn<{ exact: number; value: Set<unknown> }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Set<unknown>;

      if (typed.size === exact) return null;

      return fail(
        ErrorCode.invalid_length,
        resolveMessage(message ?? ctx!.messages.set.size, { exact, value: typed }),
        { exact },
      );
    });
  }

  nonEmpty(message?: MessageFn<{ min: number }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Set<unknown>;

      if (typed.size > 0) return null;

      return fail(ErrorCode.too_small, resolveMessage(message ?? ctx!.messages.set.nonEmpty, { min: 1 }), { min: 1 });
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), items: this.itemSchema.definition(), kind: 'set' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const item = this.itemSchema.walk(visitor);

    if (visitor.set) return visitor.set(this, item);

    return super._walk(visitor);
  }
}
