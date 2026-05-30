import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class LiteralSchema<T extends string | number | boolean | null | undefined> extends Schema<T> {
  readonly value: T;

  constructor(value: T) {
    super((val) =>
      val === value
        ? null
        : [
            {
              code: ErrorCode.invalid_literal,
              message: _messages().literal.expected({ expected: value }),
              params: { expected: value },
              path: [],
            },
          ],
    );
    this.value = value;
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    if (this.value === null) return { type: 'null' };

    if (this.value === undefined) return {};

    return { const: this.value };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'literal', value: this.value };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.literal) return visitor.literal(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof LiteralSchema)) return false;

    return this.value === other.value;
  }
}
