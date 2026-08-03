import type { SchemaDescriptor } from '../core';

import { ErrorCode, Schema } from '../core';

export class NeverSchema<Mode extends import('../core').SchemaMode = 'sync'> extends Schema<never, never, Mode> {
  protected override get _kind(): string {
    return 'never';
  }

  override checkAsync(
    this: NeverSchema<'sync'>,
    fn: (value: never, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): NeverSchema<'async'> {
    return this._addCheck(fn, true) as unknown as NeverSchema<'async'>;
  }

  constructor() {
    super((_value, ctx) => [{ code: ErrorCode.invalid_type, message: ctx!.messages.never.invalid(), path: [] }]);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'never' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.never) return visitor.never(this);

    return super._walk(visitor);
  }
}
