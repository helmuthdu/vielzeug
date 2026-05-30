import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class NeverSchema extends Schema<never> {
  constructor() {
    super((_value) => [{ code: ErrorCode.invalid_type, message: _messages().never.invalid(), path: [] }]);
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    return { not: {} };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'never' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.never) return visitor.never(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    return other instanceof NeverSchema;
  }
}
