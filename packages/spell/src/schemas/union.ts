import type { AnySchema, InferOutput, Issue, ParseValue, SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class UnionSchema<T extends readonly AnySchema[]> extends Schema<InferOutput<T[number]>> {
  readonly schemas: T;

  constructor(schemas: T) {
    super();
    this.schemas = schemas;
  }

  private _invalidUnionResult(value: unknown, errors: Issue[][]): ParseValue {
    return {
      data: value,
      issues: [
        {
          code: ErrorCode.invalid_union,
          message: _messages().union.invalid(),
          params: { errors },
          path: [],
        },
      ],
      typeOk: false,
    };
  }

  protected override _parseValueSync(value: unknown): ParseValue {
    const branchErrors: Issue[][] = [];

    for (const schema of this.schemas) {
      const result = schema._parseFullSync(value);

      if (result.issues.length === 0) return { data: result.data, issues: [], typeOk: true };

      branchErrors.push(result.issues);
    }

    return this._invalidUnionResult(value, branchErrors);
  }

  protected override async _parseValueAsync(value: unknown): Promise<ParseValue> {
    // Run all branches in parallel; return the first success (Promise.any semantics).
    // If all branches fail, collect all branch errors for the invalid_union issue.
    try {
      const data = await Promise.any(
        this.schemas.map((schema) =>
          schema.safeParseAsync(value).then((result) => {
            if (result.success) return result.data;

            throw result.error;
          }),
        ),
      );

      return { data, issues: [], typeOk: true };
    } catch (aggregateError) {
      const branchErrors = (aggregateError as AggregateError).errors.map((e: { issues: Issue[] }) => e.issues);

      return this._invalidUnionResult(value, branchErrors);
    }
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), branches: this.schemas.map((s) => s.toDescriptor()), kind: 'union' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
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
