import { ErrorCode, Schema } from '../core';

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
                message: `Expected one of: ${values.join(', ')}`,
                params: { values },
                path,
              },
            ],
    ]);
    this.values = values;
  }
}

/** `enum` is a reserved word — use `enumOf` for the flat import API. */
export const enumOf = <const T extends EnumValues>(values: T): EnumSchema<T> => new EnumSchema(values);
