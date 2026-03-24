import type { MessageFn } from '../core';

import { ErrorCode, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

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
    return this._addValidator((value, path) =>
      (value as number) >= minimum
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { min: minimum, value: value as number }),
              params: { minimum },
              path,
            },
          ],
    );
  }

  max(
    maximum: number,
    message: MessageFn<{ max: number; value: number }> = (ctx) => _messages().number_max(ctx),
  ): this {
    return this._addValidator((value, path) =>
      (value as number) <= maximum
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { max: maximum, value: value as number }),
              params: { maximum },
              path,
            },
          ],
    );
  }

  int(message: MessageFn<{ value: number }> = () => _messages().number_int()): this {
    return this._addValidator((value, path) =>
      Number.isInteger(value as number)
        ? null
        : [{ code: ErrorCode.not_integer, message: resolveMessage(message, { value: value as number }), path }],
    );
  }

  positive(message: MessageFn<{ value: number }> = () => _messages().number_positive()): this {
    return this._addValidator((value, path) =>
      (value as number) > 0
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { value: value as number }),
              params: { exclusive: true, minimum: 0 },
              path,
            },
          ],
    );
  }

  negative(message: MessageFn<{ value: number }> = () => _messages().number_negative()): this {
    return this._addValidator((value, path) =>
      (value as number) < 0
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { value: value as number }),
              params: { exclusive: true, maximum: 0 },
              path,
            },
          ],
    );
  }

  nonNegative(message: MessageFn<{ value: number }> = () => _messages().number_non_negative()): this {
    return this._addValidator((value, path) =>
      (value as number) >= 0
        ? null
        : [
            {
              code: ErrorCode.too_small,
              message: resolveMessage(message, { value: value as number }),
              params: { minimum: 0 },
              path,
            },
          ],
    );
  }

  nonPositive(message: MessageFn<{ value: number }> = () => _messages().number_non_positive()): this {
    return this._addValidator((value, path) =>
      (value as number) <= 0
        ? null
        : [
            {
              code: ErrorCode.too_big,
              message: resolveMessage(message, { value: value as number }),
              params: { maximum: 0 },
              path,
            },
          ],
    );
  }

  multipleOf(
    step: number,
    message: MessageFn<{ step: number; value: number }> = (ctx) => _messages().number_multiple_of(ctx),
  ): this {
    return this._addValidator((value, path) =>
      Math.abs(Math.round((value as number) / step) - (value as number) / step) < 1e-9
        ? null
        : [
            {
              code: ErrorCode.not_multiple_of,
              message: resolveMessage(message, { step, value: value as number }),
              params: { step },
              path,
            },
          ],
    );
  }

  static coerce(): NumberSchema {
    return new NumberSchema()._addPreprocessor((v) => {
      if (typeof v === 'number') return v;

      if (typeof v === 'string') {
        const trimmed = v.trim();

        return trimmed.length === 0 ? v : Number(trimmed);
      }

      return v;
    });
  }
}

export const number = (): NumberSchema => new NumberSchema();
export const coerceNumber = (): NumberSchema => NumberSchema.coerce();
