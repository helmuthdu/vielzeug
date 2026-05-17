import type { MessageFn } from '../core';

import { ErrorCode, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

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
    return this._addValidator((value, path) => {
      const typed = value as Date;

      if (typed >= date) return null;

      return [{ code: ErrorCode.too_small, message: resolveMessage(message, { min: date, value: typed }), path }];
    });
  }

  max(date: Date, message: MessageFn<{ max: Date; value: Date }> = (ctx) => _messages().date.max(ctx)): this {
    return this._addValidator((value, path) => {
      const typed = value as Date;

      if (typed <= date) return null;

      return [{ code: ErrorCode.too_big, message: resolveMessage(message, { max: date, value: typed }), path }];
    });
  }

  static coerce(): DateSchema<unknown> {
    return new DateSchema().preprocess((v: unknown) => {
      if (v instanceof Date) return v;

      if (typeof v === 'string' || typeof v === 'number') return new Date(v);

      return v;
    });
  }
}
