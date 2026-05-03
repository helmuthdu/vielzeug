import { Schema } from '../core';
import { buildEnumValidator } from './enum';

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

    super([buildEnumValidator(values)]);
    this.enum = enumObj;
  }
}
