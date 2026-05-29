import type { MessageFn } from '../core';

import { ErrorCode, Schema, fail, resolveMessage } from '../core';
import { _messages } from '../messages';

export class NumberSchema<Input = number> extends Schema<number, Input> {
  /** @internal JSON Schema annotation — set by int() */
  _typeHint?: 'integer';
  /** @internal JSON Schema annotation — populated by min()/nonNegative() */
  _minimum?: number;
  /** @internal JSON Schema annotation — populated by max()/nonPositive() */
  _maximum?: number;
  /** @internal JSON Schema annotation — populated by positive() */
  _exclusiveMinimum?: number;
  /** @internal JSON Schema annotation — populated by negative() */
  _exclusiveMaximum?: number;
  /** @internal JSON Schema annotation — populated by multipleOf() */
  _multipleOf?: number;

  constructor() {
    super((value) =>
      typeof value === 'number' && !Number.isNaN(value)
        ? null
        : fail(ErrorCode.invalid_type, _messages().number.type()),
    );
  }

  min(
    minimum: number,
    message: MessageFn<{ min: number; value: number }> = (ctx) => _messages().number.min(ctx),
  ): this {
    const next = this._addValidator((value) => {
      if ((value as number) >= minimum) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { min: minimum, value: value as number }), {
        min: minimum,
      });
    }) as NumberSchema<any>;

    next._minimum = next._minimum === undefined ? minimum : Math.max(next._minimum, minimum);

    return next as this;
  }

  max(
    maximum: number,
    message: MessageFn<{ max: number; value: number }> = (ctx) => _messages().number.max(ctx),
  ): this {
    const next = this._addValidator((value) => {
      if ((value as number) <= maximum) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { max: maximum, value: value as number }), {
        max: maximum,
      });
    }) as NumberSchema<any>;

    next._maximum = next._maximum === undefined ? maximum : Math.min(next._maximum, maximum);

    return next as this;
  }

  int(message: MessageFn<{ value: number }> = () => _messages().number.int()): this {
    const next = this._addValidator((value) => {
      if (Number.isInteger(value as number)) return null;

      return fail(ErrorCode.invalid_integer, resolveMessage(message, { value: value as number }));
    }) as NumberSchema<any>;

    next._typeHint = 'integer';

    return next as this;
  }

  positive(message: MessageFn<{ value: number }> = () => _messages().number.positive()): this {
    const next = this._addValidator((value) => {
      if ((value as number) > 0) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { value: value as number }), {
        exclusive: true,
        min: 0,
      });
    }) as NumberSchema<any>;

    next._exclusiveMinimum = next._exclusiveMinimum === undefined ? 0 : Math.max(next._exclusiveMinimum, 0);

    return next as this;
  }

  negative(message: MessageFn<{ value: number }> = () => _messages().number.negative()): this {
    const next = this._addValidator((value) => {
      if ((value as number) < 0) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { value: value as number }), {
        exclusive: true,
        max: 0,
      });
    }) as NumberSchema<any>;

    next._exclusiveMaximum = next._exclusiveMaximum === undefined ? 0 : Math.min(next._exclusiveMaximum, 0);

    return next as this;
  }

  nonNegative(message: MessageFn<{ value: number }> = () => _messages().number.nonNegative()): this {
    const next = this._addValidator((value) => {
      if ((value as number) >= 0) return null;

      return fail(ErrorCode.too_small, resolveMessage(message, { value: value as number }), { min: 0 });
    }) as NumberSchema<any>;

    next._minimum = next._minimum === undefined ? 0 : Math.max(next._minimum, 0);

    return next as this;
  }

  nonPositive(message: MessageFn<{ value: number }> = () => _messages().number.nonPositive()): this {
    const next = this._addValidator((value) => {
      if ((value as number) <= 0) return null;

      return fail(ErrorCode.too_big, resolveMessage(message, { value: value as number }), { max: 0 });
    }) as NumberSchema<any>;

    next._maximum = next._maximum === undefined ? 0 : Math.min(next._maximum, 0);

    return next as this;
  }

  multipleOf(
    step: number,
    message: MessageFn<{ step: number; value: number }> = (ctx) => _messages().number.multipleOf(ctx),
  ): this {
    const next = this._addValidator((value) => {
      if (Math.abs(Math.round((value as number) / step) - (value as number) / step) < 1e-9) return null;

      return fail(ErrorCode.invalid_multiple_of, resolveMessage(message, { step, value: value as number }), { step });
    }) as NumberSchema<any>;

    next._multipleOf = step;

    return next as this;
  }

  safe(message: MessageFn<{ value: number }> = () => _messages().number.safe()): this {
    return this._addValidator((value) => {
      if (Number.isSafeInteger(value as number)) return null;

      return fail(ErrorCode.invalid_safe, resolveMessage(message, { value: value as number }));
    });
  }

  finite(message: MessageFn<{ value: number }> = () => _messages().number.finite()): this {
    return this._addValidator((value) => {
      if (Number.isFinite(value as number)) return null;

      return fail(ErrorCode.invalid_finite, resolveMessage(message, { value: value as number }));
    });
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    const base: Record<string, unknown> = { type: this._typeHint ?? 'number' };

    if (this._minimum !== undefined) base['minimum'] = this._minimum;

    if (this._maximum !== undefined) base['maximum'] = this._maximum;

    if (this._exclusiveMinimum !== undefined) base['exclusiveMinimum'] = this._exclusiveMinimum;

    if (this._exclusiveMaximum !== undefined) base['exclusiveMaximum'] = this._exclusiveMaximum;

    if (this._multipleOf !== undefined) base['multipleOf'] = this._multipleOf;

    return base;
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.number) return visitor.number(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof NumberSchema)) return false;

    const o = other as NumberSchema<any>;

    return (
      this._typeHint === o._typeHint &&
      this._minimum === o._minimum &&
      this._maximum === o._maximum &&
      this._exclusiveMinimum === o._exclusiveMinimum &&
      this._exclusiveMaximum === o._exclusiveMaximum &&
      this._multipleOf === o._multipleOf
    );
  }

  static coerce(): NumberSchema<unknown> {
    return new NumberSchema().preprocess((v: unknown) => (typeof v === 'number' ? v : Number(v)));
  }
}
