import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class LiteralSchema<T extends string | number | boolean | null | undefined> extends Schema<T> {
  readonly value: T;

  protected override get _kind(): string {
    return 'literal';
  }

  constructor(value: T) {
    super((val, ctx) =>
      val === value
        ? null
        : [
            {
              code: ErrorCode.invalid_literal,
              message: (ctx?.messages ?? _messages()).literal.expected({ expected: value }),
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

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof LiteralSchema)) return false;

    return this.value === other.value;
  }
}
