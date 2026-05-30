import type { MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, fail, resolveMessage } from '../core';
import { _messages } from '../messages';

export class DateSchema<Input = Date> extends Schema<Date, Input> {
  constructor() {
    super((value) =>
      value instanceof Date && !Number.isNaN(value.getTime())
        ? null
        : fail(ErrorCode.invalid_date, _messages().date.type()),
    );
  }

  min(date: Date, message: MessageFn<{ min: Date; value: Date }> = (ctx) => _messages().date.min(ctx)): this {
    return this._addConstraint((value) => {
      const typed = value as Date;

      return typed >= date
        ? null
        : fail(ErrorCode.too_small, resolveMessage(message, { min: date, value: typed }), { min: date });
    });
  }

  max(date: Date, message: MessageFn<{ max: Date; value: Date }> = (ctx) => _messages().date.max(ctx)): this {
    return this._addConstraint((value) => {
      const typed = value as Date;

      return typed <= date
        ? null
        : fail(ErrorCode.too_big, resolveMessage(message, { max: date, value: typed }), { max: date });
    });
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    return {
      $comment:
        'Date objects are not representable in JSON Schema. Validate as a string with a date format in JSON contexts.',
    };
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'date' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
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
