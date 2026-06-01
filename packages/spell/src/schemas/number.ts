import type { AnySchema, MessageFn, SchemaDescriptor } from '../core';

import { ErrorCode, fail, resolveMessage, Schema } from '../core';
import { _messages } from '../messages';

/* -------------------- Typed annotations -------------------- */

interface NumberAnnotations extends Record<string, unknown> {
  exclusiveMaximum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
  minimum?: number;
  multipleOf?: number;
  typeHint?: 'integer';
}

export class NumberSchema<Input = number> extends Schema<number, Input> {
  protected override get _kind(): string {
    return 'number';
  }

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
      (current) => {
        const ann = current as NumberAnnotations;

        return {
          ...ann,
          minimum: ann.minimum === undefined ? minimum : Math.max(ann.minimum, minimum),
        };
      },
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
      (current) => {
        const ann = current as NumberAnnotations;

        return {
          ...ann,
          maximum: ann.maximum === undefined ? maximum : Math.min(ann.maximum, maximum),
        };
      },
    );
  }

  int(message: MessageFn<{ value: number }> = () => _messages().number.int()): this {
    return this._addConstraint(
      (value) => {
        if (Number.isInteger(value as number)) return null;

        return fail(ErrorCode.invalid_integer, resolveMessage(message, { value: value as number }));
      },
      (ann) => ({ ...ann, typeHint: 'integer' as const }),
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
      (current) => {
        const ann = current as NumberAnnotations;

        return {
          ...ann,
          exclusiveMinimum: ann.exclusiveMinimum === undefined ? 0 : Math.max(ann.exclusiveMinimum, 0),
        };
      },
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
      (current) => {
        const ann = current as NumberAnnotations;

        return {
          ...ann,
          exclusiveMaximum: ann.exclusiveMaximum === undefined ? 0 : Math.min(ann.exclusiveMaximum, 0),
        };
      },
    );
  }

  nonNegative(message: MessageFn<{ value: number }> = () => _messages().number.nonNegative()): this {
    return this._addConstraint(
      (value) => {
        if ((value as number) >= 0) return null;

        return fail(ErrorCode.too_small, resolveMessage(message, { value: value as number }), { min: 0 });
      },
      (current) => {
        const ann = current as NumberAnnotations;

        return { ...ann, minimum: ann.minimum === undefined ? 0 : Math.max(ann.minimum, 0) };
      },
    );
  }

  nonPositive(message: MessageFn<{ value: number }> = () => _messages().number.nonPositive()): this {
    return this._addConstraint(
      (value) => {
        if ((value as number) <= 0) return null;

        return fail(ErrorCode.too_big, resolveMessage(message, { value: value as number }), { max: 0 });
      },
      (current) => {
        const ann = current as NumberAnnotations;

        return { ...ann, maximum: ann.maximum === undefined ? 0 : Math.min(ann.maximum, 0) };
      },
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

  protected override _walk<R>(visitor: import('../core').SchemaWalker<R>): R {
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

  protected override _equalsImpl(other: AnySchema): boolean {
    if (!(other instanceof NumberSchema)) return false;

    return this._annotationsEqual(other);
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
