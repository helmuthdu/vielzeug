import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class InstanceOfSchema<T> extends Schema<T> {
  protected override get _kind(): string {
    return 'instanceof';
  }

  constructor(cls: new (...args: any[]) => T) {
    super((value, ctx) =>
      value instanceof cls
        ? null
        : [
            {
              code: ErrorCode.invalid_type,
              message: (ctx?.messages ?? _messages()).instanceof.type({ className: cls.name }),
              path: [],
            },
          ],
    );
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'instanceof' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.instanceof) return visitor.instanceof(this);

    return super._walk(visitor);
  }
}
