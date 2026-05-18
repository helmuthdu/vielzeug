import type { MessageFn, NumberConstraints, SchemaTypeHint } from '../core';

import { ErrorCode, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

export class NumberSchema<Input = number> extends Schema<number, Input, NumberConstraints, SchemaTypeHint> {
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
    return this._addValidatorWithConstraints(
      (value, path) => {
        const typed = value as number;

        if (typed >= minimum) return null;

        return [
          {
            code: ErrorCode.too_small,
            message: resolveMessage(message, { min: minimum, value: typed }),
            params: { minimum },
            path,
          },
        ];
      },
      { minimum },
    );
  }

  max(
    maximum: number,
    message: MessageFn<{ max: number; value: number }> = (ctx) => _messages().number.max(ctx),
  ): this {
    return this._addValidatorWithConstraints(
      (value, path) => {
        const typed = value as number;

        if (typed <= maximum) return null;

        return [
          {
            code: ErrorCode.too_big,
            message: resolveMessage(message, { max: maximum, value: typed }),
            params: { maximum },
            path,
          },
        ];
      },
      { maximum },
    );
  }

  int(message: MessageFn<{ value: number }> = () => _messages().number.int()): this {
    return this._addValidatorWithTypeHint((value, path) => {
      const typed = value as number;

      if (Number.isInteger(typed)) return null;

      return [{ code: ErrorCode.invalid_integer, message: resolveMessage(message, { value: typed }), path }];
    }, 'integer');
  }

  positive(message: MessageFn<{ value: number }> = () => _messages().number.positive()): this {
    return this._addValidatorWithConstraints(
      (value, path) => {
        const typed = value as number;

        if (typed > 0) return null;

        return [
          {
            code: ErrorCode.too_small,
            message: resolveMessage(message, { value: typed }),
            params: { exclusive: true, minimum: 0 },
            path,
          },
        ];
      },
      { exclusiveMinimum: 0 },
    );
  }

  negative(message: MessageFn<{ value: number }> = () => _messages().number.negative()): this {
    return this._addValidatorWithConstraints(
      (value, path) => {
        const typed = value as number;

        if (typed < 0) return null;

        return [
          {
            code: ErrorCode.too_big,
            message: resolveMessage(message, { value: typed }),
            params: { exclusive: true, maximum: 0 },
            path,
          },
        ];
      },
      { exclusiveMaximum: 0 },
    );
  }

  nonNegative(message: MessageFn<{ value: number }> = () => _messages().number.nonNegative()): this {
    return this._addValidatorWithConstraints(
      (value, path) => {
        const typed = value as number;

        if (typed >= 0) return null;

        return [
          {
            code: ErrorCode.too_small,
            message: resolveMessage(message, { value: typed }),
            params: { minimum: 0 },
            path,
          },
        ];
      },
      { minimum: 0 },
    );
  }

  nonPositive(message: MessageFn<{ value: number }> = () => _messages().number.nonPositive()): this {
    return this._addValidatorWithConstraints(
      (value, path) => {
        const typed = value as number;

        if (typed <= 0) return null;

        return [
          {
            code: ErrorCode.too_big,
            message: resolveMessage(message, { value: typed }),
            params: { maximum: 0 },
            path,
          },
        ];
      },
      { maximum: 0 },
    );
  }

  multipleOf(
    step: number,
    message: MessageFn<{ step: number; value: number }> = (ctx) => _messages().number.multipleOf(ctx),
  ): this {
    return this._addValidatorWithConstraints(
      (value, path) => {
        const typed = value as number;

        if (Math.abs(Math.round(typed / step) - typed / step) < 1e-9) return null;

        return [
          {
            code: ErrorCode.invalid_multiple_of,
            message: resolveMessage(message, { step, value: typed }),
            params: { step },
            path,
          },
        ];
      },
      { multipleOf: step },
    );
  }

  safe(message: MessageFn<{ value: number }> = () => _messages().number.safe()): this {
    return this._addValidator((value, path) => {
      const typed = value as number;

      if (Number.isSafeInteger(typed)) return null;

      return [
        {
          code: ErrorCode.invalid_safe,
          message: resolveMessage(message, { value: typed }),
          params: { safe: true },
          path,
        },
      ];
    });
  }

  finite(message: MessageFn<{ value: number }> = () => _messages().number.finite()): this {
    return this._addValidator((value, path) => {
      const typed = value as number;

      if (Number.isFinite(typed)) return null;

      return [
        {
          code: ErrorCode.invalid_finite,
          message: resolveMessage(message, { value: typed }),
          params: { finite: true },
          path,
        },
      ];
    });
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
