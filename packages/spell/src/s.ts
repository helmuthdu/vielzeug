import { type AnySchema, Schema } from './core';
import { ArraySchema } from './schemas/array';
import { BigIntSchema } from './schemas/bigint';
import { BooleanSchema } from './schemas/boolean';
import { DateSchema } from './schemas/date';
import { EnumSchema, type EnumValues } from './schemas/enum';
import { InstanceOfSchema } from './schemas/instanceof';
import { IntersectSchema } from './schemas/intersect';
import { LazySchema } from './schemas/lazy';
import { LiteralSchema } from './schemas/literal';
import { MapSchema } from './schemas/map';
import { NeverSchema } from './schemas/never';
import { NumberSchema } from './schemas/number';
import { ObjectSchema, type ObjectShape } from './schemas/object';
import { type NormalizeItems, normalizeToSchemas, type RawOrSchema } from './schemas/raw-or';
import { RecordSchema } from './schemas/record';
import { SetSchema } from './schemas/set';
import { StringSchema } from './schemas/string';
import { TupleSchema, type TupleSchemas } from './schemas/tuple';
import { UnionSchema } from './schemas/union';
import { VariantSchema } from './schemas/variant';

/* -------------------- Tree-shakeable standalone exports -------------------- */

export const sAnd = <A, B>(
  a: Schema<A, any>,
  b: Schema<B, any>,
): IntersectSchema<readonly [Schema<A, any>, Schema<B, any>]> => sIntersect(a, b);
export const sAny = (): Schema<any> => new Schema();
export const sArray = <T>(schema: Schema<T, any>): ArraySchema<T> => new ArraySchema(schema);
export const sBigint = (): BigIntSchema => new BigIntSchema();
export const sBoolean = (): BooleanSchema => new BooleanSchema();
export const sDate = (): DateSchema => new DateSchema();
export const sEnum = <const T extends EnumValues>(values: T): EnumSchema<T> => new EnumSchema(values);
export const sInstanceof = <T>(cls: new (...args: any[]) => T): InstanceOfSchema<T> => new InstanceOfSchema(cls);
export const sIntersect = <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(
  ...items: T
): IntersectSchema<NormalizeItems<T> & readonly AnySchema[]> =>
  new IntersectSchema(normalizeToSchemas(items) as NormalizeItems<T> & readonly AnySchema[]);
export const sLazy = <T>(getter: () => Schema<T, any>): LazySchema<T> => new LazySchema(getter);
export const sLiteral = <T extends string | number | boolean | null | undefined>(value: T): LiteralSchema<T> =>
  new LiteralSchema(value);
export const sMap = <K, V>(keySchema: Schema<K, any>, valueSchema: Schema<V, any>): MapSchema<K, V> =>
  new MapSchema(keySchema, valueSchema);
export const sNever = (): NeverSchema => new NeverSchema();
export const sNull = (): LiteralSchema<null> => new LiteralSchema(null);
export const sNumber = (): NumberSchema => new NumberSchema();
export const sObject = <T extends ObjectShape>(shape: T): ObjectSchema<T> => new ObjectSchema(shape);
export const sRecord = <K extends string, V>(
  keySchema: Schema<K, any>,
  valueSchema: Schema<V, any>,
): RecordSchema<K, V> => new RecordSchema(keySchema, valueSchema);
export const sSet = <T>(schema: Schema<T, any>): SetSchema<T> => new SetSchema(schema);
export const sString = (): StringSchema => new StringSchema();
export const sTuple = <const T extends TupleSchemas>(items: T): TupleSchema<T> => new TupleSchema(items);
export const sUndefined = (): LiteralSchema<undefined> => new LiteralSchema(undefined);
export const sUnion = <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(
  ...items: T
): UnionSchema<NormalizeItems<T> & readonly AnySchema[]> =>
  new UnionSchema(normalizeToSchemas(items) as NormalizeItems<T> & readonly AnySchema[]);
export const sOr = <A, B>(
  a: Schema<A, any>,
  b: Schema<B, any>,
): UnionSchema<readonly [Schema<A, any>, Schema<B, any>]> => sUnion(a, b);
export const sUnknown = (): Schema<unknown> => new Schema();
export const sVariant = <K extends string, M extends Record<string, ObjectSchema<any>>>(
  discriminator: K,
  map: M,
): VariantSchema<K, M> => new VariantSchema(discriminator, map);
export const sCoerce = {
  bigint: (): BigIntSchema => BigIntSchema.coerce(),
  boolean: (): BooleanSchema => BooleanSchema.coerce(),
  date: (): DateSchema => DateSchema.coerce(),
  number: (): NumberSchema => NumberSchema.coerce(),
  string: (): StringSchema => StringSchema.coerce(),
};

/* -------------------- `s` namespace (built from standalones — no duplication) -------------------- */

/**
 * The `s` namespace bundles all schema factories for convenience.
 * All methods are identical to the tree-shakeable `sXxx` exports.
 */
export const s = {
  and: sAnd,
  any: sAny,
  array: sArray,
  bigint: sBigint,
  boolean: sBoolean,
  coerce: sCoerce,
  date: sDate,
  enum: sEnum,
  instanceof: sInstanceof,
  intersect: sIntersect,
  lazy: sLazy,
  literal: sLiteral,
  map: sMap,
  never: sNever,
  null: sNull,
  number: sNumber,
  object: sObject,
  or: sOr,
  record: sRecord,
  set: sSet,
  string: sString,
  tuple: sTuple,
  undefined: sUndefined,
  union: sUnion,
  unknown: sUnknown,
  variant: sVariant,
};
