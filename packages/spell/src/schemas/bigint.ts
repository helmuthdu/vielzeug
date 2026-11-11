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

type BigIntMeta = {
  exclusiveMaximum: bigint;
  exclusiveMinimum: bigint;
  maximum: bigint;
  minimum: bigint;
  multipleOf: bigint;
};

type ValueMessage = MessageFn<{ value: bigint }>;

export class BigIntSchema<Input = bigint> extends Schema<bigint, Input> {
  override get kind(): SchemaKind {
    return 'bigint';
  }

  protected override _parse(value: unknown, ctx: RunContext): MaybePromise<ParseValue> {
    return typeof value === 'bigint'
      ? ok(value)
      : invalid(value, issue(ErrorCode.invalid_type, ctx.messages.bigint.type()));
  }

  min(minimum: bigint, message?: MessageFn<{ min: bigint; value: bigint }>): this {
    return this._refine<BigIntMeta>(
      (value) => value >= minimum,
      (value, m) =>
        issue(ErrorCode.too_small, resolveMessage(message ?? m.bigint.min, { min: minimum, value }), { min: minimum }),
      (current) => ({ minimum: atLeast(current.minimum, minimum) }),
    );
  }

  max(maximum: bigint, message?: MessageFn<{ max: bigint; value: bigint }>): this {
    return this._refine<BigIntMeta>(
      (value) => value <= maximum,
      (value, m) =>
        issue(ErrorCode.too_big, resolveMessage(message ?? m.bigint.max, { max: maximum, value }), { max: maximum }),
      (current) => ({ maximum: atMost(current.maximum, maximum) }),
    );
  }

  positive(message?: ValueMessage): this {
    return this._refine<BigIntMeta>(
      (value) => value > 0n,
      (value, m) =>
        issue(ErrorCode.too_small, resolveMessage(message ?? m.bigint.positive, { value }), {
          exclusive: true,
          min: 0n,
        }),
      (current) => ({ exclusiveMinimum: atLeast(current.exclusiveMinimum, 0n) }),
    );
  }

  negative(message?: ValueMessage): this {
    return this._refine<BigIntMeta>(
      (value) => value < 0n,
      (value, m) =>
        issue(ErrorCode.too_big, resolveMessage(message ?? m.bigint.negative, { value }), { exclusive: true, max: 0n }),
      (current) => ({ exclusiveMaximum: atMost(current.exclusiveMaximum, 0n) }),
    );
  }

  nonNegative(message?: ValueMessage): this {
    return this._refine<BigIntMeta>(
      (value) => value >= 0n,
      (value, m) => issue(ErrorCode.too_small, resolveMessage(message ?? m.bigint.nonNegative, { value }), { min: 0n }),
      (current) => ({ minimum: atLeast(current.minimum, 0n) }),
    );
  }

  nonPositive(message?: ValueMessage): this {
    return this._refine<BigIntMeta>(
      (value) => value <= 0n,
      (value, m) => issue(ErrorCode.too_big, resolveMessage(message ?? m.bigint.nonPositive, { value }), { max: 0n }),
      (current) => ({ maximum: atMost(current.maximum, 0n) }),
    );
  }

  multipleOf(step: bigint, message?: MessageFn<{ step: bigint; value: bigint }>): this {
    return this._refine<BigIntMeta>(
      // A zero step can never divide: fail as an issue like NumberSchema does,
      // instead of letting `value % step` throw RangeError from the check.
      (value) => step !== 0n && value % step === 0n,
      (value, m) =>
        issue(ErrorCode.invalid_multiple_of, resolveMessage(message ?? m.bigint.multipleOf, { step, value }), { step }),
      () => ({ multipleOf: step }),
    );
  }

  protected override _describe(): SchemaDescriptor {
    return { ...this._describeBase(), ...(this.state.meta as Partial<BigIntMeta>), kind: 'bigint' };
  }
}
