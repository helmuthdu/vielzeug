import type { MessageFn } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';
import { createConstraintValidator } from './constraint-factories';

export class NumberSchema extends Schema<number> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'number' && !Number.isNaN(value)
          ? null
          : [{ code: ErrorCode.invalid_type, message: _messages().number_type(), path }],
    ]);
  }

  min(
    minimum: number,
    message: MessageFn<{ min: number; value: number }> = (ctx) => _messages().number_min(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { min: number; value: number }>({
        check: (value) => value >= minimum,
        code: ErrorCode.too_small,
        context: (value) => ({ min: minimum, value }),
        message,
        params: () => ({ minimum }),
      }),
    );
  }

  max(
    maximum: number,
    message: MessageFn<{ max: number; value: number }> = (ctx) => _messages().number_max(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { max: number; value: number }>({
        check: (value) => value <= maximum,
        code: ErrorCode.too_big,
        context: (value) => ({ max: maximum, value }),
        message,
        params: () => ({ maximum }),
      }),
    );
  }

  int(message: MessageFn<{ value: number }> = () => _messages().number_int()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => Number.isInteger(value),
        code: ErrorCode.not_integer,
        context: (value) => ({ value }),
        message,
      }),
    );
  }

  positive(message: MessageFn<{ value: number }> = () => _messages().number_positive()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => value > 0,
        code: ErrorCode.too_small,
        context: (value) => ({ value }),
        message,
        params: () => ({ exclusive: true, minimum: 0 }),
      }),
    );
  }

  negative(message: MessageFn<{ value: number }> = () => _messages().number_negative()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => value < 0,
        code: ErrorCode.too_big,
        context: (value) => ({ value }),
        message,
        params: () => ({ exclusive: true, maximum: 0 }),
      }),
    );
  }

  nonNegative(message: MessageFn<{ value: number }> = () => _messages().number_non_negative()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => value >= 0,
        code: ErrorCode.too_small,
        context: (value) => ({ value }),
        message,
        params: () => ({ minimum: 0 }),
      }),
    );
  }

  nonPositive(message: MessageFn<{ value: number }> = () => _messages().number_non_positive()): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { value: number }>({
        check: (value) => value <= 0,
        code: ErrorCode.too_big,
        context: (value) => ({ value }),
        message,
        params: () => ({ maximum: 0 }),
      }),
    );
  }

  multipleOf(
    step: number,
    message: MessageFn<{ step: number; value: number }> = (ctx) => _messages().number_multiple_of(ctx),
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<number, { step: number; value: number }>({
        check: (value) => Math.abs(Math.round(value / step) - value / step) < 1e-9,
        code: ErrorCode.not_multiple_of,
        context: (value) => ({ step, value }),
        message,
        params: () => ({ step }),
      }),
    );
  }

  static coerce(): NumberSchema {
    return new NumberSchema()._addPreprocessor((v: unknown) => {
      if (typeof v === 'number') return v;

      if (typeof v === 'string') {
        const trimmed = v.trim();

        return trimmed.length === 0 ? v : Number(trimmed);
      }

      return v;
    });
  }
}
