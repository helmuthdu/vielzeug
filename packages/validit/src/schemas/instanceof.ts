import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export class InstanceOfSchema<T> extends Schema<T> {
  constructor(cls: new (...args: any[]) => T) {
    super([
      (value, path) =>
        value instanceof cls
          ? null
          : [{ code: ErrorCode.invalid_type, message: _messages().instanceof.type({ className: cls.name }), path }],
    ]);
  }
}
