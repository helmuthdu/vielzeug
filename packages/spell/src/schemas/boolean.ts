import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class BooleanSchema<Input = boolean> extends Schema<boolean, Input> {
  protected override get _kind(): string {
    return 'boolean';
  }

  constructor() {
    super((value, ctx) =>
      typeof value === 'boolean'
        ? null
        : [{ code: ErrorCode.invalid_type, message: (ctx?.messages ?? _messages()).boolean.type(), path: [] }],
    );
  }

  /**
   * Returns a new schema that coerces the input to a boolean before validation.
   * Accepts `'true'`, `'1'`, `1` as `true`; `'false'`, `'0'`, `0` as `false`.
   *
   * Equivalent to `s.coerce.boolean()`.
   */
  coerce(): BooleanSchema<unknown> {
    return BooleanSchema.coerce();
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'boolean' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
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
