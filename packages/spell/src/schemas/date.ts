import type { MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, fail, resolveMessage, Schema } from '../core';

export class DateSchema<Input = Date, Mode extends import('../core').SchemaMode = 'sync'> extends Schema<
  Date,
  Input,
  Mode
> {
  protected override get _kind(): string {
    return 'date';
  }

  override checkAsync(
    this: DateSchema<Input, 'sync'>,
    fn: (value: Date, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): DateSchema<Input, 'async'> {
    return this._addCheck(fn, true) as unknown as DateSchema<Input, 'async'>;
  }

  constructor() {
    super((value, ctx) =>
      value instanceof Date && !Number.isNaN(value.getTime())
        ? null
        : fail(ErrorCode.invalid_date, ctx!.messages.date.type()),
    );
  }

  min(date: Date, message?: MessageFn<{ min: Date; value: Date }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Date;

      return typed >= date
        ? null
        : fail(ErrorCode.too_small, resolveMessage(message ?? ctx!.messages.date.min, { min: date, value: typed }), {
            min: date,
          });
    });
  }

  max(date: Date, message?: MessageFn<{ max: Date; value: Date }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as Date;

      return typed <= date
        ? null
        : fail(ErrorCode.too_big, resolveMessage(message ?? ctx!.messages.date.max, { max: date, value: typed }), {
            max: date,
          });
    });
  }

  /**
   * Returns a new schema that coerces string or number input to a `Date` before validation.
   *
   * Equivalent to `s.coerce.date()`.
   */
  coerce(): DateSchema<unknown> {
    return DateSchema.coerce();
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'date' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.date) return visitor.date(this);

    return super._walk(visitor);
  }

  static coerce(): DateSchema<unknown> {
    return new DateSchema().preprocess((v: unknown) => {
      if (v instanceof Date) return v;

      if (typeof v === 'string' || typeof v === 'number') return new Date(v);

      return v;
    });
  }
}
