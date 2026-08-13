import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';

export class InstanceOfSchema<T, Mode extends import('../core').SchemaMode = 'sync'> extends Schema<T, T, Mode> {
  readonly cls: new (
    ...args: any[]
  ) => T;

  protected override get _kind(): string {
    return 'instanceof';
  }

  override checkAsync(
    this: InstanceOfSchema<T, 'sync'>,
    fn: (value: T, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): InstanceOfSchema<T, 'async'> {
    return this._addCheck(fn, true) as unknown as InstanceOfSchema<T, 'async'>;
  }

  constructor(cls: new (...args: any[]) => T) {
    super((value, ctx) =>
      value instanceof cls
        ? null
        : [
            {
              code: ErrorCode.invalid_type,
              message: ctx!.messages.instanceof.type({ className: cls.name }),
              path: [],
            },
          ],
    );
    this.cls = cls;
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), className: this.cls.name, kind: 'instanceof' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.instanceof) return visitor.instanceof(this);

    return super._walk(visitor);
  }
}
