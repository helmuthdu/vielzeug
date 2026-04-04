import { ErrorCode, Schema } from '../core';
import { _messages } from '../messages';

type NativeEnumValue = string | number;
type NativeEnumObj = Record<string, NativeEnumValue>;
type InferNativeEnum<T extends NativeEnumObj> = T[keyof T];

export class NativeEnumSchema<T extends NativeEnumObj> extends Schema<InferNativeEnum<T>> {
  readonly enum: T;

  constructor(enumObj: T) {
    // For numeric TypeScript enums, the object contains reverse mappings (number → name).
    // Filter those out to get only the declared values.
    const values = Object.values(enumObj).filter(
      (v) => typeof v !== 'number' || !Object.hasOwn(enumObj, v),
    ) as NativeEnumValue[];
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
    this.enum = enumObj;
  }
}

export const nativeEnum = <T extends Record<string, string | number>>(enumObj: T): NativeEnumSchema<T> =>
  new NativeEnumSchema(enumObj);
