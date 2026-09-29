import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';

export class InstanceOfSchema<T> extends Schema<T, T> {
  readonly cls: new (
    ...args: never[]
  ) => T;

  protected override get _kind(): string {
    return 'instanceof';
  }

  constructor(cls: new (...args: never[]) => T) {
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
}
