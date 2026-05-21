import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class BooleanSchema<Input = boolean> extends Schema<boolean, Input> {
  constructor() {
    super((value) =>
      typeof value === 'boolean'
        ? null
        : [{ code: ErrorCode.invalid_type, message: _messages().boolean.type(), path: [] }],
    );
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    return { type: 'boolean' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.boolean) return visitor.boolean(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    return other instanceof BooleanSchema;
  }

  static coerce(): BooleanSchema<unknown> {
    return new BooleanSchema().preprocess((v: unknown) => {
      if (typeof v === 'boolean') return v;

      if (v === 'true' || v === '1' || v === 1) return true;

      if (v === 'false' || v === '0' || v === 0) return false;

      return v;
    });
  }
}
