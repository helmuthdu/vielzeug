import type { MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, fail, resolveMessage, Schema } from '../core';

export class DateSchema<Input = Date> extends Schema<Date, Input> {
  protected override get _kind(): string {
    return 'date';
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

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'date' };
  }

  static coerce(): DateSchema<unknown> {
    return new DateSchema().preprocess((v: unknown) => {
      if (v instanceof Date) return v;

      if (typeof v === 'string' || typeof v === 'number') return new Date(v);

      return v;
    });
  }
}
