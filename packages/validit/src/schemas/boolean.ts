import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class BooleanSchema extends Schema<boolean> {
  constructor() {
    super([
      (value, path) =>
        typeof value === 'boolean'
          ? null
          : [{ code: ErrorCode.invalid_type, message: _messages().boolean_type(), path }],
    ]);
  }

  static coerce(): BooleanSchema {
    return new BooleanSchema()._addPreprocessor((v) => {
      if (typeof v === 'boolean') return v;

      if (v === 'true' || v === '1' || v === 1) return true;

      if (v === 'false' || v === '0' || v === 0) return false;

      return v;
    });
  }
}

export const boolean = (): BooleanSchema => new BooleanSchema();
export const coerceBoolean = (): BooleanSchema => BooleanSchema.coerce();
