import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';

export class BooleanSchema<Input = boolean> extends Schema<boolean, Input> {
  protected override get _kind(): string {
    return 'boolean';
  }

  constructor() {
    super((value, ctx) =>
      typeof value === 'boolean'
        ? null
        : [{ code: ErrorCode.invalid_type, message: ctx!.messages.boolean.type(), path: [] }],
    );
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'boolean' };
  }

  static coerce(): BooleanSchema<unknown> {
    return new BooleanSchema().preprocess((v: unknown) => {
      if (typeof v === 'boolean') return v;

      if (v === 'true' || v === '1' || v === 1) return true;

      if (v === 'false' || v === '0' || v === 0) return false;

      return v;
    });
  }
}
