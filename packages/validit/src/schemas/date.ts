import type { MessageFn } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';
import { createConstraintValidator } from './constraint-factories';

export class DateSchema<Input = Date> extends Schema<Date, Input> {
  constructor() {
    super([
      (value, path) =>
        value instanceof Date && !Number.isNaN(value.getTime())
          ? null
          : [{ code: ErrorCode.invalid_date, message: _messages().date.type(), path }],
    ]);
  }

  min(date: Date, message: MessageFn<{ min: Date; value: Date }> = (ctx) => _messages().date.min(ctx)): this {
    return this._addCoreValidator(
      createConstraintValidator<Date, { min: Date; value: Date }>({
        check: (value) => value >= date,
        code: ErrorCode.too_small,
        context: { min: date },
        message,
      }),
    );
  }

  max(date: Date, message: MessageFn<{ max: Date; value: Date }> = (ctx) => _messages().date.max(ctx)): this {
    return this._addCoreValidator(
      createConstraintValidator<Date, { max: Date; value: Date }>({
        check: (value) => value <= date,
        code: ErrorCode.too_big,
        context: { max: date },
        message,
      }),
    );
  }

  static coerce(): DateSchema<unknown> {
    return new DateSchema().preprocess((v: unknown) => {
      if (v instanceof Date) return v;

      if (typeof v === 'string' || typeof v === 'number') return new Date(v);

      return v;
    });
  }
}
