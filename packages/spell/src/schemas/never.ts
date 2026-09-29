import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';

export class NeverSchema extends Schema<never, never> {
  protected override get _kind(): string {
    return 'never';
  }

  constructor() {
    super((_value, ctx) => [{ code: ErrorCode.invalid_type, message: ctx!.messages.never.invalid(), path: [] }]);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'never' };
  }
}
