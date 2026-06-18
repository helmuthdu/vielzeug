import type { AnySchema, InferOutput, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, ValidationError, _makeCtx } from '../core';

export class UnionSchema<T extends readonly AnySchema[]> extends Schema<InferOutput<T[number]>> {
  readonly schemas: T;

  protected override get _kind(): string {
    return 'union';
  }

  constructor(schemas: T) {
    super();
    this.schemas = schemas;
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

      try {
        const data = await Promise.any(
          this.schemas.map((schema) =>
            schema.safeParseAsync(v, c).then((result) => {
              if (result.success) return result.data;

              throw result.error;
            }),
          ),
        );

        const validationIssues = await this._runValidatorsAsync(data, c);

        if (validationIssues.length) throw new ValidationError(validationIssues);

        return this._runPostprocessors(data) as InferOutput<T[number]>;
      } catch (err) {
        if (err instanceof AggregateError) {
          const errors = err.errors as unknown[];
          const nonValidation = errors.find((e) => !ValidationError.is(e));

          if (nonValidation !== undefined) throw nonValidation;

          const branchErrors = (errors as ValidationError[]).map((e) => e.issues);

          throw new ValidationError([
            {
              code: ErrorCode.invalid_union,
              message: c.messages.union.invalid(),
              params: { errors: branchErrors },
              path: [],
            },
          ]);
        }

        throw err;
      }
    });
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), branches: this.schemas.map((s) => s.toDescriptor()), kind: 'union' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    const branches = this.schemas.map((s) => s.walk(visitor));

    if (visitor.union) return visitor.union(this, branches);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof UnionSchema)) return false;

    if (this.schemas.length !== other.schemas.length) return false;

    return this.schemas.every((s, i) => s.equals(other.schemas[i]));
  }
}
