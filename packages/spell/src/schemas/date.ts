import type { MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, fail, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

export class DateSchema<Input = Date> extends Schema<Date, Input> {
  protected override get _kind(): string {
    return 'date';
  }

  constructor() {
    super((value, ctx) =>
      value instanceof Date && !Number.isNaN(value.getTime())
        ? null
        : fail(ErrorCode.invalid_date, (ctx?.messages ?? _messages()).date.type()),
    );
  }

  min(date: Date, message: MessageFn<{ min: Date; value: Date }> = (ctx) => _messages().date.min(ctx)): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Date;

      return typed >= date
        ? null
        : fail(ErrorCode.too_small, resolveMessage(message, { min: date, value: typed }), { min: date });
    });
  }

  max(date: Date, message: MessageFn<{ max: Date; value: Date }> = (ctx) => _messages().date.max(ctx)): this {
    return this._addConstraint((value, _ctx) => {
      const typed = value as Date;

      return typed <= date
        ? null
        : fail(ErrorCode.too_big, resolveMessage(message, { max: date, value: typed }), { max: date });
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

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    return other instanceof DateSchema;
  }

  static coerce(): DateSchema<unknown> {
    return new DateSchema().preprocess((v: unknown) => {
      if (v instanceof Date) return v;

      if (typeof v === 'string' || typeof v === 'number') return new Date(v);

      return v;
    });
  }
}
