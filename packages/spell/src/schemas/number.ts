import {
  atLeast,
  atMost,
  invalid,
  issue,
  type MaybePromise,
  ok,
  type ParseValue,
  type RunContext,
  resolveMessage,
} from '../_parse';
import { Schema } from '../schema';
import { ErrorCode, type MessageFn, type SchemaDescriptor, type SchemaKind } from '../types';

type NumberMeta = {
  exclusiveMaximum: number;
  exclusiveMinimum: number;
  finite: true;
  integer: true;
  maximum: number;
  minimum: number;
  multipleOf: number;
};

type ValueMessage = MessageFn<{ value: number }>;

export class NumberSchema<Input = number> extends Schema<number, Input> {
  override get kind(): SchemaKind {
    return 'number';
  }

  /** Accepts any `number` except `NaN`; `Infinity` passes unless `finite()` is added. */
  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return typeof value === 'number' && !Number.isNaN(value)
      ? ok(value)
      : invalid(value, issue(ErrorCode.invalid_type, ctx.messages.number.type()));
  }

  min(minimum: number, message?: MessageFn<{ min: number; value: number }>): this {
    return this._refine<NumberMeta>(
      (value) => value >= minimum,
      (value, m) =>
        issue(ErrorCode.too_small, resolveMessage(message ?? m.number.min, { min: minimum, value }), { min: minimum }),
      (current) => ({ minimum: atLeast(current.minimum, minimum) }),
    );
  }

  max(maximum: number, message?: MessageFn<{ max: number; value: number }>): this {
    return this._refine<NumberMeta>(
      (value) => value <= maximum,
      (value, m) =>
        issue(ErrorCode.too_big, resolveMessage(message ?? m.number.max, { max: maximum, value }), { max: maximum }),
      (current) => ({ maximum: atMost(current.maximum, maximum) }),
    );
  }

  positive(message?: ValueMessage): this {
    return this._refine<NumberMeta>(
      (value) => value > 0,
      (value, m) =>
        issue(ErrorCode.too_small, resolveMessage(message ?? m.number.positive, { value }), {
          exclusive: true,
          min: 0,
        }),
      (current) => ({ exclusiveMinimum: atLeast(current.exclusiveMinimum, 0) }),
    );
  }

  negative(message?: ValueMessage): this {
    return this._refine<NumberMeta>(
      (value) => value < 0,
      (value, m) =>
        issue(ErrorCode.too_big, resolveMessage(message ?? m.number.negative, { value }), { exclusive: true, max: 0 }),
      (current) => ({ exclusiveMaximum: atMost(current.exclusiveMaximum, 0) }),
    );
  }

  nonNegative(message?: ValueMessage): this {
    return this._refine<NumberMeta>(
      (value) => value >= 0,
      (value, m) => issue(ErrorCode.too_small, resolveMessage(message ?? m.number.nonNegative, { value }), { min: 0 }),
      (current) => ({ minimum: atLeast(current.minimum, 0) }),
    );
  }

  nonPositive(message?: ValueMessage): this {
    return this._refine<NumberMeta>(
      (value) => value <= 0,
      (value, m) => issue(ErrorCode.too_big, resolveMessage(message ?? m.number.nonPositive, { value }), { max: 0 }),
      (current) => ({ maximum: atMost(current.maximum, 0) }),
    );
  }

  int(message?: ValueMessage): this {
    return this._refine<NumberMeta>(
      Number.isInteger,
      (value, m) => issue(ErrorCode.invalid_integer, resolveMessage(message ?? m.number.int, { value })),
      () => ({ integer: true }),
    );
  }

  /** Integer within ±`Number.MAX_SAFE_INTEGER`. */
  safe(message?: ValueMessage): this {
    return this._refine<NumberMeta>(
      Number.isSafeInteger,
      (value, m) => issue(ErrorCode.invalid_safe, resolveMessage(message ?? m.number.safe, { value })),
      (current) => ({
        integer: true,
        maximum: atMost(current.maximum, Number.MAX_SAFE_INTEGER),
        minimum: atLeast(current.minimum, Number.MIN_SAFE_INTEGER),
      }),
    );
  }

  finite(message?: ValueMessage): this {
    return this._refine<NumberMeta>(
      Number.isFinite,
      (value, m) => issue(ErrorCode.invalid_finite, resolveMessage(message ?? m.number.finite, { value })),
      () => ({ finite: true }),
    );
  }

  /** Multiple of `step`, tolerant of binary floating-point error (e.g. `0.3` for step `0.1`). */
  multipleOf(step: number, message?: MessageFn<{ step: number; value: number }>): this {
    return this._refine<NumberMeta>(
      (value) => Math.abs(Math.round(value / step) - value / step) < 1e-9,
      (value, m) =>
        issue(ErrorCode.invalid_multiple_of, resolveMessage(message ?? m.number.multipleOf, { step, value }), { step }),
      () => ({ multipleOf: step }),
    );
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), ...(this.state.meta as Partial<NumberMeta>), kind: 'number' };
  }
}
