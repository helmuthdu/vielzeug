import { ErrorCode, Schema } from '../core';

export class InstanceOfSchema<T> extends Schema<T> {
  constructor(cls: new (...args: any[]) => T) {
    super([
      (value, path) =>
        value instanceof cls
          ? null
          : [{ code: ErrorCode.invalid_type, message: `Expected instance of ${cls.name}`, path }],
    ]);
  }
}

/** `instanceof` is a reserved word — use `instanceOf` for the flat import API. */
export const instanceOf = <T>(cls: new (...args: any[]) => T): InstanceOfSchema<T> => new InstanceOfSchema(cls);
