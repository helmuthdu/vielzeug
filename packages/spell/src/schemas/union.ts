import type { AnySchema, InferOutput, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { _makeCtx, ErrorCode, Schema, SpellValidationError } from '../core';

export class UnionSchema<
  T extends readonly AnySchema[],
  Mode extends import('../core').SchemaMode = import('../core').MergeSchemaModes<
    import('../core').InferSchemaMode<T[number]>
  >,
> extends Schema<InferOutput<T[number]>, unknown, Mode> {
  readonly schemas: T;

  protected override get _kind(): string {
    return 'union';
  }

  override checkAsync(
    this: UnionSchema<T, 'sync'>,
    fn: (
      value: InferOutput<T[number]>,
      ctx: import('../core').CheckContext,
    ) => Promise<import('../core').ValidateResult>,
  ): UnionSchema<T, 'async'> {
    return this._addCheck(fn, true) as unknown as UnionSchema<T, 'async'>;
  }

  constructor(schemas: T) {
    super();
    this.schemas = Object.freeze([...schemas]) as T;
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue | Promise<ParseValue> {
    const branchErrors: Issue[][] = [];

    for (const schema of this.schemas) {
      const result = schema._parseFullSync(value, ctx);

      if (result.issues.length === 0) return { data: result.data, issues: [], typeOk: true };

      branchErrors.push(result.issues);
    }

    return {
      data: value,
      issues: [
        {
          code: ErrorCode.invalid_union,
          message: ctx.messages.union.invalid(),
          params: { errors: branchErrors },
          path: [],
        },
      ],
      typeOk: false,
    };
  }

  override async parseAsync(value: unknown, ctx?: ParseContext): Promise<InferOutput<T[number]>> {
    const c = ctx ?? _makeCtx();

    return this._withCatchAsync(async () => {
      const prepared = this._prepareInput(value);

      if (prepared.skip) return prepared.value as InferOutput<T[number]>;

      const v = prepared.value;

      const branchErrors: Issue[][] = [];

      for (const schema of this.schemas) {
        const result = await schema._parseFullAsync(v, c);

        if (result.issues.length > 0) {
          branchErrors.push(result.issues);
          continue;
        }

        const validationIssues = await this._runValidatorsAsync(result.data, c);

        if (validationIssues.length > 0) throw new SpellValidationError(validationIssues);

        return this._runPostprocessors(result.data) as InferOutput<T[number]>;
      }

      throw new SpellValidationError([
        {
          code: ErrorCode.invalid_union,
          message: c.messages.union.invalid(),
          params: { errors: branchErrors },
          path: [],
        },
      ]);
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), branches: this.schemas.map((s) => s.definition()), kind: 'union' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const branches = this.schemas.map((s) => s.walk(visitor));

    if (visitor.union) return visitor.union(this, branches);

    return super._walk(visitor);
  }
}
