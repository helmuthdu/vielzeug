import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class InstanceOfSchema<T> extends Schema<T> {
  constructor(cls: new (...args: any[]) => T) {
    super((value) =>
      value instanceof cls
        ? null
        : [{ code: ErrorCode.invalid_type, message: _messages().instanceof.type({ className: cls.name }), path: [] }],
    );
  }

  protected override _describeImpl(): SchemaDescriptor {
    return {
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
      kind: 'instanceof',
    };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.instanceof) return visitor.instanceof(this);

    return super._walk(visitor);
  }
}
