import type { MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, fail, resolveMessage, Schema } from '../core';

/* -------------------- Typed annotations -------------------- */

interface NumberAnnotations extends Record<string, unknown> {
  exclusiveMaximum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
  minimum?: number;
  multipleOf?: number;
  typeHint?: 'integer';
}

export class NumberSchema<Input = number, Mode extends import('../core').SchemaMode = 'sync'> extends Schema<
  number,
  Input,
  Mode
> {
  protected override get _kind(): string {
    return 'number';
  }

  override checkAsync(
    this: NumberSchema<Input, 'sync'>,
    fn: (value: number, ctx: import('../core').CheckContext) => Promise<import('../core').ValidateResult>,
  ): NumberSchema<Input, 'async'> {
    return this._addCheck(fn, true) as unknown as NumberSchema<Input, 'async'>;
  }

  constructor() {
    super((value, ctx) =>
      typeof value === 'number' && !Number.isNaN(value)
        ? null
        : fail(ErrorCode.invalid_type, ctx!.messages.number.type()),
    );
  }

  min(minimum: number, message?: MessageFn<{ min: number; value: number }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as number) >= minimum) return null;

        return fail(
          ErrorCode.too_small,
          resolveMessage(message ?? ctx!.messages.number.min, { min: minimum, value: value as number }),
          {
            min: minimum,
          },
        );
      },
      (current) => {
        const ann = current as NumberAnnotations;

        return {
          ...ann,
          minimum: ann.minimum === undefined ? minimum : Math.max(ann.minimum, minimum),
        };
      },
    );
  }

  max(maximum: number, message?: MessageFn<{ max: number; value: number }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as number) <= maximum) return null;

        return fail(
          ErrorCode.too_big,
          resolveMessage(message ?? ctx!.messages.number.max, { max: maximum, value: value as number }),
          {
            max: maximum,
          },
        );
      },
      (current) => {
        const ann = current as NumberAnnotations;

        return {
          ...ann,
          maximum: ann.maximum === undefined ? maximum : Math.min(ann.maximum, maximum),
        };
      },
    );
  }

  int(message?: MessageFn<{ value: number }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if (Number.isInteger(value as number)) return null;

        return fail(
          ErrorCode.invalid_integer,
          resolveMessage(message ?? ctx!.messages.number.int, { value: value as number }),
        );
      },
      (ann) => ({ ...ann, typeHint: 'integer' as const }),
    );
  }

  positive(message?: MessageFn<{ value: number }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as number) > 0) return null;

        return fail(
          ErrorCode.too_small,
          resolveMessage(message ?? ctx!.messages.number.positive, { value: value as number }),
          {
            exclusive: true,
            min: 0,
          },
        );
      },
      (current) => {
        const ann = current as NumberAnnotations;

        return {
          ...ann,
          exclusiveMinimum: ann.exclusiveMinimum === undefined ? 0 : Math.max(ann.exclusiveMinimum, 0),
        };
      },
    );
  }

  negative(message?: MessageFn<{ value: number }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as number) < 0) return null;

        return fail(
          ErrorCode.too_big,
          resolveMessage(message ?? ctx!.messages.number.negative, { value: value as number }),
          {
            exclusive: true,
            max: 0,
          },
        );
      },
      (current) => {
        const ann = current as NumberAnnotations;

        return {
          ...ann,
          exclusiveMaximum: ann.exclusiveMaximum === undefined ? 0 : Math.min(ann.exclusiveMaximum, 0),
        };
      },
    );
  }

  nonNegative(message?: MessageFn<{ value: number }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as number) >= 0) return null;

        return fail(
          ErrorCode.too_small,
          resolveMessage(message ?? ctx!.messages.number.nonNegative, { value: value as number }),
          { min: 0 },
        );
      },
      (current) => {
        const ann = current as NumberAnnotations;

        return { ...ann, minimum: ann.minimum === undefined ? 0 : Math.max(ann.minimum, 0) };
      },
    );
  }

  nonPositive(message?: MessageFn<{ value: number }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if ((value as number) <= 0) return null;

        return fail(
          ErrorCode.too_big,
          resolveMessage(message ?? ctx!.messages.number.nonPositive, { value: value as number }),
          { max: 0 },
        );
      },
      (current) => {
        const ann = current as NumberAnnotations;

        return { ...ann, maximum: ann.maximum === undefined ? 0 : Math.min(ann.maximum, 0) };
      },
    );
  }

  multipleOf(step: number, message?: MessageFn<{ step: number; value: number }>): this {
    return this._addConstraint(
      (value, ctx) => {
        if (Math.abs(Math.round((value as number) / step) - (value as number) / step) < 1e-9) return null;

        return fail(
          ErrorCode.invalid_multiple_of,
          resolveMessage(message ?? ctx!.messages.number.multipleOf, { step, value: value as number }),
          { step },
        );
      },
      (ann) => ({ ...ann, multipleOf: step }),
    );
  }

  safe(message?: MessageFn<{ value: number }>): this {
    return this._addConstraint((value, ctx) => {
      if (Number.isSafeInteger(value as number)) return null;

      return fail(
        ErrorCode.invalid_safe,
        resolveMessage(message ?? ctx!.messages.number.safe, { value: value as number }),
      );
    });
  }

  finite(message?: MessageFn<{ value: number }>): this {
    return this._addConstraint((value, ctx) => {
      if (Number.isFinite(value as number)) return null;

      return fail(
        ErrorCode.invalid_finite,
        resolveMessage(message ?? ctx!.messages.number.finite, { value: value as number }),
      );
    });
  }

  /**
   * Returns a new schema that coerces the input to a number via `Number(value)` before validation.
   *
   * Equivalent to `s.coerce.number()`.
   */
  coerce(): NumberSchema<unknown> {
    return NumberSchema.coerce();
  }

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R | null {
    if (visitor.number) return visitor.number(this);

    return super._walk(visitor);
  }

  protected override _toDescriptorImpl(): SchemaDescriptor {
    const ann = this._annotations as NumberAnnotations;

    return {
      ...this._describeBase(),
      ...(ann.exclusiveMaximum !== undefined ? { exclusiveMaximum: ann.exclusiveMaximum } : {}),
      ...(ann.exclusiveMinimum !== undefined ? { exclusiveMinimum: ann.exclusiveMinimum } : {}),
      ...(ann.maximum !== undefined ? { maximum: ann.maximum } : {}),
      ...(ann.minimum !== undefined ? { minimum: ann.minimum } : {}),
      ...(ann.multipleOf !== undefined ? { multipleOf: ann.multipleOf } : {}),
      ...(ann.typeHint !== undefined ? { typeHint: ann.typeHint } : {}),
      kind: 'number',
    };
  }

  static coerce(): NumberSchema<unknown> {
    return new NumberSchema().preprocess((v: unknown) => {
      if (typeof v === 'number') return v;

      if (typeof v === 'string' || typeof v === 'boolean') {
        const n = Number(v);

        return Number.isNaN(n) ? v : n;
      }

      return v;
    });
  }
}
