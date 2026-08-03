import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';

export class LiteralSchema<
  T extends string | number | boolean | null | undefined,
  Mode extends import('../core').SchemaMode = 'sync',
> extends Schema<T, T, Mode> {
  readonly value: T;

  protected override get _kind(): string {
    return 'literal';
  }

  override checkAsync(
    fn: (value: T, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): LiteralSchema<T, 'async'> {
    return this._addCheck(fn, true) as unknown as LiteralSchema<T, 'async'>;
  }

  constructor(value: T) {
    super((val, ctx) =>
      val === value
        ? null
        : [
            {
              code: ErrorCode.invalid_literal,
              message: ctx!.messages.literal.expected({ expected: value }),
              params: { expected: value },
              path: [],
            },
          ],
    );
    this.value = value;
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'literal', value: this.value };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.literal) return visitor.literal(this);

    return super._walk(visitor);
  }
}
