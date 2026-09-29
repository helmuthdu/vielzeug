import type { AnySchema, InferInput, InferOutput, Issue, ParseContext, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';

export class UnionSchema<T extends readonly AnySchema[]> extends Schema<InferOutput<T[number]>, InferInput<T[number]>> {
  readonly schemas: T;

  protected override get _kind(): string {
    return 'union';
  }

  constructor(schemas: T) {
    super();
    this.schemas = Object.freeze([...schemas]) as T;
  }

  protected override _parse(value: unknown, ctx: ParseContext): ParseValue {
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

  protected override async _parseAsync(value: unknown, ctx: ParseContext): Promise<ParseValue> {
    const branchErrors: Issue[][] = [];

    for (const schema of this.schemas) {
      const result = await schema._parseFullAsync(value, ctx);

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

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), branches: this.schemas.map((s) => s.definition()), kind: 'union' };
  }
}
