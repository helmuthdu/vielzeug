import type { ValidateFn } from '../core';

import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

export type EnumValues = readonly [string | number, ...(string | number)[]];
type EnumType<T extends EnumValues> = T[number];

export function buildEnumValidator(values: readonly unknown[]): ValidateFn {
  const set = new Set<unknown>(values);

  return (value, path) =>
    set.has(value)
      ? null
      : [
          {
            code: ErrorCode.invalid_enum,
            message: _messages().enum.invalid({ values }),
            params: { values },
            path,
          },
        ];
}

export class EnumSchema<T extends EnumValues> extends Schema<EnumType<T>> {
  readonly values: T;

  constructor(values: T) {
    super([buildEnumValidator(values)]);
    this.values = values;
  }
}
