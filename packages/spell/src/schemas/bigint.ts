import type { MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, fail, resolveMessage } from '../core';
import { _messages } from '../messages';

export class BigIntSchema<Input = bigint> extends Schema<bigint, Input> {
  constructor() {
    super((value) => (typeof value === 'bigint' ? null : fail(ErrorCode.invalid_type, _messages().bigint.type())));
  }

  min(
    minimum: bigint,
    message: MessageFn<{ min: bigint; value: bigint }> = (ctx) => _messages().bigint.min(ctx),
  ): this {
    return this._addConstraint((value) => {
      const typed = value as bigint;

      if (typed >= minimum) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: minimum, value: typed }), { min: minimum });
    });
  }

  max(
    maximum: bigint,
    message: MessageFn<{ max: bigint; value: bigint }> = (ctx) => _messages().bigint.max(ctx),
  ): this {
    return this._addConstraint((value) => {
      const typed = value as bigint;

      if (typed <= maximum) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { max: maximum, value: typed }), { max: maximum });
    });
  }

  positive(message: MessageFn<{ value: bigint }> = () => _messages().bigint.positive()): this {
    return this._addConstraint((value) => {
      const typed = value as bigint;

      if (typed > 0n) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { value: typed }), { exclusive: true, min: 0n });
    });
  }

  negative(message: MessageFn<{ value: bigint }> = () => _messages().bigint.negative()): this {
    return this._addConstraint((value) => {
      const typed = value as bigint;

      if (typed < 0n) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { value: typed }), { exclusive: true, max: 0n });
    });
  }

  nonNegative(message: MessageFn<{ value: bigint }> = () => _messages().bigint.nonNegative()): this {
    return this._addConstraint((value) => {
      const typed = value as bigint;

      if (typed >= 0n) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { value: typed }), { min: 0n });
    });
  }

  nonPositive(message: MessageFn<{ value: bigint }> = () => _messages().bigint.nonPositive()): this {
    return this._addConstraint((value) => {
      const typed = value as bigint;

      if (typed <= 0n) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { value: typed }), { max: 0n });
    });
  }

  multipleOf(
    step: bigint,
    message: MessageFn<{ step: bigint; value: bigint }> = (ctx) => _messages().bigint.multipleOf(ctx),
  ): this {
    return this._addConstraint((value) => {
      const typed = value as bigint;

      if (typed % step === 0n) return null;

      return fail(ErrorCode.invalid_multiple_of, resolveMessage(message, { step, value: typed }), { step });
    });
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    return { type: 'integer' };
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.bigint) return visitor.bigint(this);

    return super._walk(visitor);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    return { ...this._describeBase(), kind: 'bigint' };
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    return other instanceof BigIntSchema;
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

        // Guard against DoS: BigInt() conversion is O(n²) in digit count.
        if (trimmed.length === 0 || trimmed.length > 1000) return value;

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
