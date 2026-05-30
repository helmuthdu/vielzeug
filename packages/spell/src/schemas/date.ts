import type { MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, resolveMessage } from '../core';
import { _messages } from '../messages';

export class DateSchema<Input = Date> extends Schema<Date, Input> {
  constructor() {
    super((value) =>
      value instanceof Date && !Number.isNaN(value.getTime())
        ? null
        : [{ code: ErrorCode.invalid_date, message: _messages().date.type(), path: [] }],
    );
  }

  min(date: Date, message: MessageFn<{ min: Date; value: Date }> = (ctx) => _messages().date.min(ctx)): this {
    return this._addValidator((value) => {
      const typed = value as Date;

      if (typed >= date) return null;

      return [
        {
          code: ErrorCode.too_small,
          message: resolveMessage(message, { min: date, value: typed }),
          params: { min: date },
          path: [],
        },
      ];
    });
  }

  max(date: Date, message: MessageFn<{ max: Date; value: Date }> = (ctx) => _messages().date.max(ctx)): this {
    return this._addValidator((value) => {
      const typed = value as Date;

      if (typed <= date) return null;

      return [
        {
          code: ErrorCode.too_big,
          message: resolveMessage(message, { max: date, value: typed }),
          params: { max: date },
          path: [],
        },
      ];
    });
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    return {
      $comment:
        'Date objects are not representable in JSON Schema. Validate as a string with a date format in JSON contexts.',
    };
  }

  protected override _describeImpl(): SchemaDescriptor {
    return {
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
      kind: 'date',
    };
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
