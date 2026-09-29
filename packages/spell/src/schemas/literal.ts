import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';

export class LiteralSchema<T extends string | number | boolean | null | undefined> extends Schema<T, T> {
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
}
