import type { MessageFn } from '../core';

import { ErrorCode, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

export class BigIntSchema<Input = bigint> extends Schema<bigint, Input> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'bigint' ? null : [{ code: ErrorCode.invalid_type, message: _messages().bigint.type(), path }],
    ]);
  }

  min(
    minimum: bigint,
    message: MessageFn<{ min: bigint; value: bigint }> = (ctx) => _messages().bigint.min(ctx),
  ): this {
    return this._addValidator((value, path) => {
      const typed = value as bigint;

      if (typed >= minimum) return null;

      return [
        {
          code: ErrorCode.too_small,
          message: resolveMessage(message, { min: minimum, value: typed }),
          params: { minimum },
          path,
        },
      ];
    });
  }

  max(
    maximum: bigint,
    message: MessageFn<{ max: bigint; value: bigint }> = (ctx) => _messages().bigint.max(ctx),
  ): this {
    return this._addValidator((value, path) => {
      const typed = value as bigint;

      if (typed <= maximum) return null;

      return [
        {
          code: ErrorCode.too_big,
          message: resolveMessage(message, { max: maximum, value: typed }),
          params: { maximum },
          path,
        },
      ];
    });
  }

  positive(message: MessageFn<{ value: bigint }> = () => _messages().bigint.positive()): this {
    return this._addValidator((value, path) => {
      const typed = value as bigint;

      if (typed > 0n) return null;

      return [
        {
          code: ErrorCode.too_small,
          message: resolveMessage(message, { value: typed }),
          params: { exclusive: true, minimum: 0n },
          path,
        },
      ];
    });
  }

  negative(message: MessageFn<{ value: bigint }> = () => _messages().bigint.negative()): this {
    return this._addValidator((value, path) => {
      const typed = value as bigint;

      if (typed < 0n) return null;

      return [
        {
          code: ErrorCode.too_big,
          message: resolveMessage(message, { value: typed }),
          params: { exclusive: true, maximum: 0n },
          path,
        },
      ];
    });
  }

  nonNegative(message: MessageFn<{ value: bigint }> = () => _messages().bigint.nonNegative()): this {
    return this._addValidator((value, path) => {
      const typed = value as bigint;

      if (typed >= 0n) return null;

      return [
        {
          code: ErrorCode.too_small,
          message: resolveMessage(message, { value: typed }),
          params: { minimum: 0n },
          path,
        },
      ];
    });
  }

  nonPositive(message: MessageFn<{ value: bigint }> = () => _messages().bigint.nonPositive()): this {
    return this._addValidator((value, path) => {
      const typed = value as bigint;

      if (typed <= 0n) return null;

      return [
        { code: ErrorCode.too_big, message: resolveMessage(message, { value: typed }), params: { maximum: 0n }, path },
      ];
    });
  }

  multipleOf(
    step: bigint,
    message: MessageFn<{ step: bigint; value: bigint }> = (ctx) => _messages().bigint.multipleOf(ctx),
  ): this {
    return this._addValidator((value, path) => {
      const typed = value as bigint;

      if (typed % step === 0n) return null;

      return [
        {
          code: ErrorCode.invalid_multiple_of,
          message: resolveMessage(message, { step, value: typed }),
          params: { step },
          path,
        },
      ];
    });
  }

  static coerce(): BigIntSchema<unknown> {
    return new BigIntSchema().preprocess((value: unknown) => {
      if (typeof value === 'bigint') return value;

      if (typeof value === 'number') {
        if (!Number.isFinite(value) || !Number.isInteger(value)) return value;

        try {
          return BigInt(value);
        } catch {
          return value;
        }
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();

        if (trimmed.length === 0) return value;

        try {
          return BigInt(trimmed);
        } catch {
          return value;
        }
      }

      return value;
    });
  }
}
