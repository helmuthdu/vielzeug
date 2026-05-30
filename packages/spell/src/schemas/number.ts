import type { MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, Schema, fail, resolveMessage } from '../core';
import { _messages } from '../messages';

export class NumberSchema<Input = number> extends Schema<number, Input> {
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
    return this._addConstraint(
      (value) => {
        if ((value as number) >= minimum) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { min: minimum, value: value as number }), {
          min: minimum,
        });
      },
      (ann) => ({
        ...ann,
        minimum: ann['minimum'] === undefined ? minimum : Math.max(ann['minimum'] as number, minimum),
      }),
    );
  }

  max(
    maximum: number,
    message: MessageFn<{ max: number; value: number }> = (ctx) => _messages().number.max(ctx),
  ): this {
    return this._addConstraint(
      (value) => {
        if ((value as number) <= maximum) return null;

        return fail(ErrorCode.too_big, resolveMessage(message, { max: maximum, value: value as number }), {
          max: maximum,
        });
      },
      (ann) => ({
        ...ann,
        maximum: ann['maximum'] === undefined ? maximum : Math.min(ann['maximum'] as number, maximum),
      }),
    );
  }

  int(message: MessageFn<{ value: number }> = () => _messages().number.int()): this {
    return this._addConstraint(
      (value) => {
        if (Number.isInteger(value as number)) return null;

        return fail(ErrorCode.invalid_integer, resolveMessage(message, { value: value as number }));
      },
      (ann) => ({ ...ann, typeHint: 'integer' }),
    );
  }

  positive(message: MessageFn<{ value: number }> = () => _messages().number.positive()): this {
    return this._addConstraint(
      (value) => {
        if ((value as number) > 0) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { value: value as number }), {
          exclusive: true,
          min: 0,
        });
      },
      (ann) => ({
        ...ann,
        exclusiveMinimum: ann['exclusiveMinimum'] === undefined ? 0 : Math.max(ann['exclusiveMinimum'] as number, 0),
      }),
    );
  }

  negative(message: MessageFn<{ value: number }> = () => _messages().number.negative()): this {
    return this._addConstraint(
      (value) => {
        if ((value as number) < 0) return null;

        return fail(ErrorCode.too_big, resolveMessage(message, { value: value as number }), {
          exclusive: true,
          max: 0,
        });
      },
      (ann) => ({
        ...ann,
        exclusiveMaximum: ann['exclusiveMaximum'] === undefined ? 0 : Math.min(ann['exclusiveMaximum'] as number, 0),
      }),
    );
  }

  nonNegative(message: MessageFn<{ value: number }> = () => _messages().number.nonNegative()): this {
    return this._addConstraint(
      (value) => {
        if ((value as number) >= 0) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { value: value as number }), { min: 0 });
      },
      (ann) => ({ ...ann, minimum: ann['minimum'] === undefined ? 0 : Math.max(ann['minimum'] as number, 0) }),
    );
  }

  nonPositive(message: MessageFn<{ value: number }> = () => _messages().number.nonPositive()): this {
    return this._addConstraint(
      (value) => {
        if ((value as number) <= 0) return null;

        return fail(ErrorCode.too_big, resolveMessage(message, { value: value as number }), { max: 0 });
      },
      (ann) => ({ ...ann, maximum: ann['maximum'] === undefined ? 0 : Math.min(ann['maximum'] as number, 0) }),
    );
  }

  multipleOf(
    step: number,
    message: MessageFn<{ step: number; value: number }> = (ctx) => _messages().number.multipleOf(ctx),
  ): this {
    return this._addConstraint(
      (value) => {
        if (Math.abs(Math.round((value as number) / step) - (value as number) / step) < 1e-9) return null;

        return fail(ErrorCode.invalid_multiple_of, resolveMessage(message, { step, value: value as number }), { step });
      },
      (ann) => ({ ...ann, multipleOf: step }),
    );
  }

  safe(message: MessageFn<{ value: number }> = () => _messages().number.safe()): this {
    return this._addConstraint((value) => {
      if (Number.isSafeInteger(value as number)) return null;

      return fail(ErrorCode.invalid_safe, resolveMessage(message, { value: value as number }));
    });
  }

  finite(message: MessageFn<{ value: number }> = () => _messages().number.finite()): this {
    return this._addConstraint((value) => {
      if (Number.isFinite(value as number)) return null;

      return fail(ErrorCode.invalid_finite, resolveMessage(message, { value: value as number }));
    });
  }

  protected override _toSchemaBase(): Record<string, unknown> {
    const ann = this._annotations;
    const base: Record<string, unknown> = { type: (ann['typeHint'] as string | undefined) ?? 'number' };

    if (ann['minimum'] !== undefined) base['minimum'] = ann['minimum'];

    if (ann['maximum'] !== undefined) base['maximum'] = ann['maximum'];

    if (ann['exclusiveMinimum'] !== undefined) base['exclusiveMinimum'] = ann['exclusiveMinimum'];

    if (ann['exclusiveMaximum'] !== undefined) base['exclusiveMaximum'] = ann['exclusiveMaximum'];

    if (ann['multipleOf'] !== undefined) base['multipleOf'] = ann['multipleOf'];

    return base;
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
    if (visitor.number) return visitor.number(this);

    return super._walk(visitor);
  }

  protected override _describeImpl(): SchemaDescriptor {
    const ann = this._annotations;

    return {
      ...(this.state.description ? { description: this.state.description } : {}),
      ...(this.state.isNullable ? { isNullable: true } : {}),
      ...(this.state.isOptional ? { isOptional: true } : {}),
      ...(ann['exclusiveMaximum'] !== undefined ? { exclusiveMaximum: ann['exclusiveMaximum'] as number } : {}),
      ...(ann['exclusiveMinimum'] !== undefined ? { exclusiveMinimum: ann['exclusiveMinimum'] as number } : {}),
      ...(ann['maximum'] !== undefined ? { maximum: ann['maximum'] as number } : {}),
      ...(ann['minimum'] !== undefined ? { minimum: ann['minimum'] as number } : {}),
      ...(ann['multipleOf'] !== undefined ? { multipleOf: ann['multipleOf'] as number } : {}),
      ...(ann['typeHint'] !== undefined ? { typeHint: ann['typeHint'] as 'integer' } : {}),
      kind: 'number',
    };
  }

  protected override _equalsImpl(other: import('../core').AnySchema): boolean {
    if (!(other instanceof NumberSchema)) return false;

    const a = this._annotations;
    const b = other._annotations;

    return (
      a['typeHint'] === b['typeHint'] &&
      a['minimum'] === b['minimum'] &&
      a['maximum'] === b['maximum'] &&
      a['exclusiveMinimum'] === b['exclusiveMinimum'] &&
      a['exclusiveMaximum'] === b['exclusiveMaximum'] &&
      a['multipleOf'] === b['multipleOf']
    );
  }

  static coerce(): NumberSchema<unknown> {
    return new NumberSchema().preprocess((v: unknown) => (typeof v === 'number' ? v : Number(v)));
  }
}
