import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export type EnumValues = readonly [string, ...string[]];
type EnumType<T extends EnumValues> = T[number];

export class EnumSchema<T extends EnumValues> extends Schema<EnumType<T>> {
  readonly values: T;

  constructor(values: T) {
    const set = new Set<unknown>(values);

    super([
      (value, path) =>
        set.has(value)
          ? null
          : [
              {
                code: ErrorCode.invalid_enum,
                message: _messages().enum_invalid({ values }),
                params: { values },
                path,
              },
            ],
    ]);
    this.values = values;
  }
}
