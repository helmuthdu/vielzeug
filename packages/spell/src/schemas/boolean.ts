import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';

export class BooleanSchema<Input = boolean, Mode extends import('../core').SchemaMode = 'sync'> extends Schema<
  boolean,
  Input,
  Mode
> {
  protected override get _kind(): string {
    return 'boolean';
  }

  override checkAsync(
    this: BooleanSchema<Input, 'sync'>,
    fn: (value: boolean, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): BooleanSchema<Input, 'async'> {
    return this._addCheck(fn, true) as unknown as BooleanSchema<Input, 'async'>;
  }

  constructor() {
    super((value, ctx) =>
      typeof value === 'boolean'
        ? null
        : [{ code: ErrorCode.invalid_type, message: ctx!.messages.boolean.type(), path: [] }],
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

  static coerce(): BooleanSchema<unknown> {
    return new BooleanSchema().preprocess((v: unknown) => {
      if (typeof v === 'boolean') return v;

      if (v === 'true' || v === '1' || v === 1) return true;

      if (v === 'false' || v === '0' || v === 0) return false;

      return v;
    });
  }
}
