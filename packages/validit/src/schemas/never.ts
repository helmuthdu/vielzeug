import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class NeverSchema extends Schema<never> {
  constructor() {
    super([(_, path) => [{ code: ErrorCode.invalid_type, message: _messages().never_invalid(), path }]]);
  }
}

export const never = (): NeverSchema => new NeverSchema();
