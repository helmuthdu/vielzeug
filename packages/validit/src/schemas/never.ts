import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class NeverSchema extends Schema<never> {
  constructor() {
    super([(_value) => [{ code: ErrorCode.invalid_type, message: _messages().never.invalid(), path: [] }]]);
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    return { not: {} };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.never) return visitor.never(this);
    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    return other instanceof NeverSchema;
  }

  protected override _construct(state: import('../core').SchemaState<any, any>): this {
    const next = new NeverSchema() as this;
    next.state = state as any;
    return next;
  }
}
