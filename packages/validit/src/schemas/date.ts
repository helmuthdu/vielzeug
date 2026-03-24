import type { MessageFn } from '../core';

import { ErrorCode, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

export class DateSchema extends Schema<Date> {
  constructor() {
    super([
      (value, path) =>
        value instanceof Date && !Number.isNaN(value.getTime())
          ? null
          : [{ code: ErrorCode.invalid_date, message: _messages().date_type(), path }],
    ]);
  }

  min(date: Date, message: MessageFn<{ min: Date; value: Date }> = (ctx) => _messages().date_min(ctx)): this {
    return this._addValidator((value, path) =>
      (value as Date) >= date
        ? null
        : [{ code: ErrorCode.too_small, message: resolveMessage(message, { min: date, value: value as Date }), path }],
    );
  }

  max(date: Date, message: MessageFn<{ max: Date; value: Date }> = (ctx) => _messages().date_max(ctx)): this {
    return this._addValidator((value, path) =>
      (value as Date) <= date
        ? null
        : [{ code: ErrorCode.too_big, message: resolveMessage(message, { max: date, value: value as Date }), path }],
    );
  }

  static coerce(): DateSchema {
    return new DateSchema()._addPreprocessor((v) => {
      if (v instanceof Date) return v;

      if (typeof v === 'string' || typeof v === 'number') return new Date(v);

      return v;
    });
  }
}

export const date = (): DateSchema => new DateSchema();
export const coerceDate = (): DateSchema => DateSchema.coerce();
