import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class NeverSchema extends Schema<never> {
  protected override get _kind(): string {
    return 'never';
  }

  constructor() {
    super((_value, ctx) => [
      { code: ErrorCode.invalid_type, message: (ctx?.messages ?? _messages()).never.invalid(), path: [] },
    ]);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'never' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.never) return visitor.never(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    return other instanceof NeverSchema;
  }
}
