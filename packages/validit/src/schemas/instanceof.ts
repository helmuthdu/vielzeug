import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class InstanceOfSchema<T> extends Schema<T> {
  constructor(cls: new (...args: any[]) => T) {
    super([
      (value) =>
        value instanceof cls
          ? null
          : [{ code: ErrorCode.invalid_type, message: _messages().instanceof.type({ className: cls.name }), path: [] }],
    ]);
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.instanceof) return visitor.instanceof(this);
    return super._walk(visitor);
  }

  protected override _construct(state: import('../core').SchemaState<any, any>): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this, { state }) as this;
  }
}
