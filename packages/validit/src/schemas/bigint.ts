import type { MessageFn } from '../core';

import { ErrorCode, Schema } from '../core';
import { createConstraintValidator } from './constraint-factories';

export class BigIntSchema<Input = bigint> extends Schema<bigint, Input> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'bigint' ? null : [{ code: ErrorCode.invalid_bigint, message: 'Expected bigint', path }],
    ]);
  }

  min(
    minimum: bigint,
    message: MessageFn<{ min: bigint; value: bigint }> = ({ min }) => `Must be at least ${min}`,
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<bigint, { min: bigint; value: bigint }>({
        check: (value) => value >= minimum,
        code: ErrorCode.too_small,
        context: { min: minimum },
        message,
        params: { minimum },
      }),
    );
  }

  max(
    maximum: bigint,
    message: MessageFn<{ max: bigint; value: bigint }> = ({ max }) => `Must be at most ${max}`,
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<bigint, { max: bigint; value: bigint }>({
        check: (value) => value <= maximum,
        code: ErrorCode.too_big,
        context: { max: maximum },
        message,
        params: { maximum },
      }),
    );
  }

  positive(message: MessageFn<{ value: bigint }> = () => 'Must be positive'): this {
    return this._addCoreValidator(
      createConstraintValidator<bigint, { value: bigint }>({
        check: (value) => value > 0n,
        code: ErrorCode.too_small,
        message,
        params: { exclusive: true, minimum: 0n },
      }),
    );
  }

  negative(message: MessageFn<{ value: bigint }> = () => 'Must be negative'): this {
    return this._addCoreValidator(
      createConstraintValidator<bigint, { value: bigint }>({
        check: (value) => value < 0n,
        code: ErrorCode.too_big,
        message,
        params: { exclusive: true, maximum: 0n },
      }),
    );
  }

  nonNegative(message: MessageFn<{ value: bigint }> = () => 'Must be non-negative'): this {
    return this._addCoreValidator(
      createConstraintValidator<bigint, { value: bigint }>({
        check: (value) => value >= 0n,
        code: ErrorCode.too_small,
        message,
        params: { minimum: 0n },
      }),
    );
  }

  nonPositive(message: MessageFn<{ value: bigint }> = () => 'Must be non-positive'): this {
    return this._addCoreValidator(
      createConstraintValidator<bigint, { value: bigint }>({
        check: (value) => value <= 0n,
        code: ErrorCode.too_big,
        message,
        params: { maximum: 0n },
      }),
    );
  }

  multipleOf(
    step: bigint,
    message: MessageFn<{ step: bigint; value: bigint }> = ({ step }) => `Must be a multiple of ${step}`,
  ): this {
    return this._addCoreValidator(
      createConstraintValidator<bigint, { step: bigint; value: bigint }>({
        check: (value) => value % step === 0n,
        code: ErrorCode.not_multiple_of,
        context: { step },
        message,
        params: { step },
      }),
    );
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
