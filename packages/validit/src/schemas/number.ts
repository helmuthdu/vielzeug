import type { MessageFn } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';
import { createConstraintValidator } from './constraint-factories';

export class NumberSchema<Input = number> extends Schema<number, Input> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'number' && !Number.isNaN(value)
          ? null
          : [{ code: ErrorCode.invalid_type, message: _messages().number.type(), path }],
    ]);
  }

  min(
    minimum: number,
    message: MessageFn<{ min: number; value: number }> = (ctx) => _messages().number.min(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { min: number; value: number }>({
        check: (value) => value >= minimum,
        code: ErrorCode.too_small,
        context: { min: minimum },
        message,
        params: { minimum },
      }),
    );
  }

  max(
    maximum: number,
    message: MessageFn<{ max: number; value: number }> = (ctx) => _messages().number.max(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { max: number; value: number }>({
        check: (value) => value <= maximum,
        code: ErrorCode.too_big,
        context: { max: maximum },
        message,
        params: { maximum },
      }),
    );
  }

  int(message: MessageFn<{ value: number }> = () => _messages().number.int()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => Number.isInteger(value),
        code: ErrorCode.not_integer,
        message,
      }),
    );
  }

  positive(message: MessageFn<{ value: number }> = () => _messages().number.positive()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => value > 0,
        code: ErrorCode.too_small,
        message,
        params: { exclusive: true, minimum: 0 },
      }),
    );
  }

  negative(message: MessageFn<{ value: number }> = () => _messages().number.negative()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => value < 0,
        code: ErrorCode.too_big,
        message,
        params: { exclusive: true, maximum: 0 },
      }),
    );
  }

  nonNegative(message: MessageFn<{ value: number }> = () => _messages().number.nonNegative()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => value >= 0,
        code: ErrorCode.too_small,
        message,
        params: { minimum: 0 },
      }),
    );
  }

  nonPositive(message: MessageFn<{ value: number }> = () => _messages().number.nonPositive()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => value <= 0,
        code: ErrorCode.too_big,
        message,
        params: { maximum: 0 },
      }),
    );
  }

  multipleOf(
    step: number,
    message: MessageFn<{ step: number; value: number }> = (ctx) => _messages().number.multipleOf(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { step: number; value: number }>({
        check: (value) => Math.abs(Math.round(value / step) - value / step) < 1e-9,
        code: ErrorCode.not_multiple_of,
        context: { step },
        message,
        params: { step },
      }),
    );
  }

  safe(message: MessageFn<{ value: number }> = () => _messages().number.safe()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => Number.isSafeInteger(value),
        code: ErrorCode.not_safe,
        message,
        params: { safe: true },
      }),
    );
  }

  finite(message: MessageFn<{ value: number }> = () => 'Must be finite'): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => Number.isFinite(value),
        code: ErrorCode.not_finite,
        message,
        params: { finite: true },
      }),
    );
  }

  static coerce(): NumberSchema<unknown> {
    return new NumberSchema().preprocess((v: unknown) => {
      if (typeof v === 'number') return v;

      if (typeof v === 'string') {
        const trimmed = v.trim();

        return trimmed.length === 0 ? v : Number(trimmed);
      }

      return v;
    });
  }
}
