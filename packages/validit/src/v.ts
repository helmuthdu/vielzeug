import { Schema } from './core';
import { ArraySchema } from './schemas/array';
import { BooleanSchema } from './schemas/boolean';
import { DateSchema } from './schemas/date';
import { EnumSchema, type EnumValues } from './schemas/enum';
import { InstanceOfSchema } from './schemas/instanceof';
import { IntersectSchema } from './schemas/intersect';
import { LazySchema } from './schemas/lazy';
import { LiteralSchema, type RawOrSchema, normalizeToSchemas } from './schemas/literal';
import { NativeEnumSchema } from './schemas/native-enum';
import { NeverSchema } from './schemas/never';
import { NumberSchema } from './schemas/number';
import { ObjectSchema, type ObjectShape } from './schemas/object';
import { RecordSchema } from './schemas/record';
import { StringSchema } from './schemas/string';
import { TupleSchema, type TupleSchemas } from './schemas/tuple';
import { UnionSchema } from './schemas/union';
import { VariantSchema } from './schemas/variant';

/**
 * The `v` namespace bundles all schema factories for convenience.
 */
export const v = {
  any: (): Schema<any> => new Schema(),
  array: <T>(schema: Schema<T>): ArraySchema<T> => new ArraySchema(schema),
  boolean: (): BooleanSchema => new BooleanSchema(),
  coerce: {
    boolean: (): BooleanSchema => BooleanSchema.coerce(),
    date: (): DateSchema => DateSchema.coerce(),
    number: (): NumberSchema => NumberSchema.coerce(),
    string: (): StringSchema => StringSchema.coerce(),
  },
  date: (): DateSchema => new DateSchema(),
  enum: <const T extends EnumValues>(values: T): EnumSchema<T> => new EnumSchema(values),
  instanceof: <T>(cls: new (...args: any[]) => T): InstanceOfSchema<T> => new InstanceOfSchema(cls),
  intersect: <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(...items: T): IntersectSchema<any> =>
    new IntersectSchema(normalizeToSchemas(items)),
  lazy: <T>(getter: () => Schema<T>): LazySchema<T> => new LazySchema(getter),
  literal: <T extends string | number | boolean | null | undefined>(value: T): LiteralSchema<T> =>
    new LiteralSchema(value),
  nativeEnum: <T extends Record<string, string | number>>(enumObj: T): NativeEnumSchema<T> =>
    new NativeEnumSchema(enumObj),
  never: (): NeverSchema => new NeverSchema(),
  null: (): LiteralSchema<null> => new LiteralSchema(null),
  number: (): NumberSchema => new NumberSchema(),
  object: <T extends ObjectShape>(shape: T): ObjectSchema<T> => new ObjectSchema(shape),
  record: <K extends string, V>(keySchema: Schema<K>, valueSchema: Schema<V>): RecordSchema<K, V> =>
    new RecordSchema(keySchema, valueSchema),
  string: (): StringSchema => new StringSchema(),
  tuple: <const T extends TupleSchemas>(items: T): TupleSchema<T> => new TupleSchema(items),
  undefined: (): LiteralSchema<undefined> => new LiteralSchema(undefined),
  union: <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(...items: T): UnionSchema<any> =>
    new UnionSchema(normalizeToSchemas(items)),
  unknown: (): Schema<unknown> => new Schema(),
  variant: <K extends string, M extends Record<string, ObjectSchema<any>>>(
    discriminator: K,
    map: M,
  ): VariantSchema<K, M> => new VariantSchema(discriminator, map),
};
