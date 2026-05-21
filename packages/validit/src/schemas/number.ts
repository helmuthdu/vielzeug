import type { MessageFn, NumberConstraints } from '../core';

import { ErrorCode, Schema, resolveMessage } from '../core';
import { _messages } from '../messages';

export class NumberSchema<Input = number> extends Schema<number, Input, NumberConstraints> {
  constructor() {
    super([
      (value) =>
        typeof value === 'number' && !Number.isNaN(value)
          ? null
          : [{ code: ErrorCode.invalid_type, message: _messages().number.type(), path: [] }],
    ]);
  }

  min(minimum: number, message: MessageFn<{ min: number; value: number }> = (ctx) => _messages().number.min(ctx)): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as number;

        if (typed >= minimum) return null;

        return [{ code: ErrorCode.too_small, message: resolveMessage(message, { min: minimum, value: typed }), params: { min: minimum }, path: [] }];
      },
      { minimum },
    );
  }

  max(maximum: number, message: MessageFn<{ max: number; value: number }> = (ctx) => _messages().number.max(ctx)): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as number;

        if (typed <= maximum) return null;

        return [{ code: ErrorCode.too_big, message: resolveMessage(message, { max: maximum, value: typed }), params: { max: maximum }, path: [] }];
      },
      { maximum },
    );
  }

  /* R3: uses _addValidatorWithConstraints with typeHint param — _addValidatorWithTypeHint removed */
  int(message: MessageFn<{ value: number }> = () => _messages().number.int()): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as number;

        if (Number.isInteger(typed)) return null;

        return [{ code: ErrorCode.invalid_integer, message: resolveMessage(message, { value: typed }), path: [] }];
      },
      {},
      'integer',
    );
  }

  positive(message: MessageFn<{ value: number }> = () => _messages().number.positive()): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as number;

        if (typed > 0) return null;

        return [{ code: ErrorCode.too_small, message: resolveMessage(message, { value: typed }), params: { exclusive: true, min: 0 }, path: [] }];
      },
      { exclusiveMinimum: 0 },
    );
  }

  negative(message: MessageFn<{ value: number }> = () => _messages().number.negative()): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as number;

        if (typed < 0) return null;

        return [{ code: ErrorCode.too_big, message: resolveMessage(message, { value: typed }), params: { exclusive: true, max: 0 }, path: [] }];
      },
      { exclusiveMaximum: 0 },
    );
  }

  nonNegative(message: MessageFn<{ value: number }> = () => _messages().number.nonNegative()): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as number;

        if (typed >= 0) return null;

        return [{ code: ErrorCode.too_small, message: resolveMessage(message, { value: typed }), params: { min: 0 }, path: [] }];
      },
      { minimum: 0 },
    );
  }

  nonPositive(message: MessageFn<{ value: number }> = () => _messages().number.nonPositive()): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as number;

        if (typed <= 0) return null;

        return [{ code: ErrorCode.too_big, message: resolveMessage(message, { value: typed }), params: { max: 0 }, path: [] }];
      },
      { maximum: 0 },
    );
  }

  multipleOf(
    step: number,
    message: MessageFn<{ step: number; value: number }> = (ctx) => _messages().number.multipleOf(ctx),
  ): this {
    return this._addValidatorWithConstraints(
      (value) => {
        const typed = value as number;

        if (Math.abs(Math.round(typed / step) - typed / step) < 1e-9) return null;

        return [{ code: ErrorCode.invalid_multiple_of, message: resolveMessage(message, { step, value: typed }), params: { step }, path: [] }];
      },
      { multipleOf: step },
    );
  }

  safe(message: MessageFn<{ value: number }> = () => _messages().number.safe()): this {
    return this._addValidator((value) => {
      const typed = value as number;

      if (Number.isSafeInteger(typed)) return null;

      return [{ code: ErrorCode.invalid_safe, message: resolveMessage(message, { value: typed }), path: [] }];
    });
  }

  finite(message: MessageFn<{ value: number }> = () => _messages().number.finite()): this {
    return this._addValidator((value) => {
      const typed = value as number;

      if (Number.isFinite(typed)) return null;

      return [{ code: ErrorCode.invalid_finite, message: resolveMessage(message, { value: typed }), path: [] }];
    });
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    const base: Record<string, unknown> = { type: this.state.meta?.typeHint === 'integer' ? 'integer' : 'number' };
    const constraints = this.state.meta?.constraints;

    if (constraints) {
      if (constraints.minimum !== undefined) base['minimum'] = constraints.minimum;
      if (constraints.maximum !== undefined) base['maximum'] = constraints.maximum;
      if (constraints.exclusiveMinimum !== undefined) base['exclusiveMinimum'] = constraints.exclusiveMinimum;
      if (constraints.exclusiveMaximum !== undefined) base['exclusiveMaximum'] = constraints.exclusiveMaximum;
      if (constraints.multipleOf !== undefined) base['multipleOf'] = constraints.multipleOf;
    }

    return base;
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.number) return visitor.number(this);

    return super._walk(visitor);
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof NumberSchema)) return false;

    return super._equalsImpl(other);
  }

  protected override _construct(state: import('../core').SchemaState<any, any>): this {
    const next = new NumberSchema() as this;

    next.state = state as any;

    return next;
  }

  static coerce(): NumberSchema<unknown> {
    return new NumberSchema().preprocess((v: unknown) => (typeof v === 'number' ? v : Number(v)));
  }
}
