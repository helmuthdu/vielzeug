import { invalid, issue, type MaybePromise, ok, type ParseValue, type RunContext, resolveMessage } from '../_parse';
import { Schema } from '../schema';
import { ErrorCode, type MessageFn, type SchemaDescriptor, type SchemaKind } from '../types';

/** Bounds are kept as ISO strings so definitions stay plain, frozen data. */
type DateMeta = { maximum: string; minimum: string };

export class DateSchema<Input = Date> extends Schema<Date, Input> {
  override get kind(): SchemaKind {
    return 'date';
  }

  /** Accepts `Date` instances holding a valid time. */
  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return value instanceof Date && !Number.isNaN(value.getTime())
      ? ok(value)
      : invalid(value, issue(ErrorCode.invalid_date, ctx.messages.date.type()));
  }

  min(date: Date, message?: MessageFn<{ min: Date; value: Date }>): this {
    return this._refine<DateMeta>(
      (value) => value >= date,
      (value, m) =>
        issue(ErrorCode.too_small, resolveMessage(message ?? m.date.min, { min: date, value }), { min: date }),
      (current) => ({
        minimum:
          current.minimum === undefined || date > new Date(current.minimum) ? date.toISOString() : current.minimum,
      }),
    );
  }

  max(date: Date, message?: MessageFn<{ max: Date; value: Date }>): this {
    return this._refine<DateMeta>(
      (value) => value <= date,
      (value, m) =>
        issue(ErrorCode.too_big, resolveMessage(message ?? m.date.max, { max: date, value }), { max: date }),
      (current) => ({
        maximum:
          current.maximum === undefined || date < new Date(current.maximum) ? date.toISOString() : current.maximum,
      }),
    );
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), ...(this.state.meta as Partial<DateMeta>), kind: 'date' };
  }
}
