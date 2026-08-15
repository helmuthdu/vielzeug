import { warn } from '../_dev';
import type { MessageFn, SchemaDescriptor } from '../core';
import { ErrorCode, fail, resolveMessage, Schema } from '../core';

export class BigIntSchema<Input = bigint, Mode extends import('../core').SchemaMode = 'sync'> extends Schema<
  bigint,
  Input,
  Mode
> {
  protected override get _kind(): string {
    return 'bigint';
  }

  override checkAsync(
    this: BigIntSchema<Input, 'sync'>,
    fn: (value: bigint, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): BigIntSchema<Input, 'async'> {
    return this._addCheck(fn, true) as unknown as BigIntSchema<Input, 'async'>;
  }

  constructor() {
    super((value, ctx) =>
      typeof value === 'bigint' ? null : fail(ErrorCode.invalid_type, ctx!.messages.bigint.type()),
    );
  }

  min(minimum: bigint, message?: MessageFn<{ min: bigint; value: bigint }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as bigint;

      if (typed >= minimum) return null;

      return fail(
        ErrorCode.too_small,
        resolveMessage(message ?? ctx!.messages.bigint.min, { min: minimum, value: typed }),
        { min: minimum },
      );
    });
  }

  max(maximum: bigint, message?: MessageFn<{ max: bigint; value: bigint }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as bigint;

      if (typed <= maximum) return null;

      return fail(
        ErrorCode.too_big,
        resolveMessage(message ?? ctx!.messages.bigint.max, { max: maximum, value: typed }),
        { max: maximum },
      );
    });
  }

  positive(message?: MessageFn<{ value: bigint }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as bigint;

      if (typed > 0n) return null;

      return fail(ErrorCode.too_small, resolveMessage(message ?? ctx!.messages.bigint.positive, { value: typed }), {
        exclusive: true,
        min: 0n,
      });
    });
  }

  negative(message?: MessageFn<{ value: bigint }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as bigint;

      if (typed < 0n) return null;

      return fail(ErrorCode.too_big, resolveMessage(message ?? ctx!.messages.bigint.negative, { value: typed }), {
        exclusive: true,
        max: 0n,
      });
    });
  }

  nonNegative(message?: MessageFn<{ value: bigint }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as bigint;

      if (typed >= 0n) return null;

      return fail(ErrorCode.too_small, resolveMessage(message ?? ctx!.messages.bigint.nonNegative, { value: typed }), {
        min: 0n,
      });
    });
  }

  nonPositive(message?: MessageFn<{ value: bigint }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as bigint;

      if (typed <= 0n) return null;

      return fail(ErrorCode.too_big, resolveMessage(message ?? ctx!.messages.bigint.nonPositive, { value: typed }), {
        max: 0n,
      });
    });
  }

  multipleOf(step: bigint, message?: MessageFn<{ step: bigint; value: bigint }>): this {
    return this._addConstraint((value, ctx) => {
      const typed = value as bigint;

      if (typed % step === 0n) return null;

      return fail(
        ErrorCode.invalid_multiple_of,
        resolveMessage(message ?? ctx!.messages.bigint.multipleOf, { step, value: typed }),
        { step },
      );
    });
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.bigint) return visitor.bigint(this);

    return super._walk(visitor);
  }

  /**
   * Returns a new schema that coerces the input to a bigint before validation.
   * Handles number, string (up to 1000 digits), and bigint inputs.
   *
   * Equivalent to `s.coerce.bigint()`.
   */
  coerce(): BigIntSchema<unknown> {
    return BigIntSchema.coerce();
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    if (this.state.validators.length > 0) {
      warn(
        'definition(): this bigint schema has constraints (e.g. min(), max(), positive()). ' +
          'BigInt constraints are not serializable and will not appear in the definition.',
      );
    }

    return { ...this._describeBase(), kind: 'bigint' };
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
