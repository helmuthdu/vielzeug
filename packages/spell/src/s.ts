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

/* -------------------- Internal factory functions -------------------- */

const sAnd = <A, B>(a: Schema<A, any>, b: Schema<B, any>): IntersectSchema<readonly [Schema<A, any>, Schema<B, any>]> =>
  sIntersect(a, b);
const sAny = (): Schema<any> => new Schema();
const sArray = <T>(schema: Schema<T, any>): ArraySchema<T> => new ArraySchema(schema);
const sBigint = (): BigIntSchema => new BigIntSchema();
const sBoolean = (): BooleanSchema => new BooleanSchema();
const sDate = (): DateSchema => new DateSchema();
const sEnum = <const T extends EnumValues>(values: T): EnumSchema<T> => new EnumSchema(values);
const sInstanceof = <T>(cls: new (...args: any[]) => T): InstanceOfSchema<T> => new InstanceOfSchema(cls);
const sIntersect = <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(
  ...items: T
): IntersectSchema<NormalizeItems<T> & readonly AnySchema[]> =>
  new IntersectSchema(normalizeToSchemas(items) as NormalizeItems<T> & readonly AnySchema[]);
const sLazy = <T>(getter: () => Schema<T, any>): LazySchema<T> => new LazySchema(getter);
const sLiteral = <T extends string | number | boolean | null | undefined>(value: T): LiteralSchema<T> =>
  new LiteralSchema(value);
const sMap = <K, V>(keySchema: Schema<K, any>, valueSchema: Schema<V, any>): MapSchema<K, V> =>
  new MapSchema(keySchema, valueSchema);
const sNever = (): NeverSchema => new NeverSchema();
const sNull = (): LiteralSchema<null> => new LiteralSchema(null);
const sNumber = (): NumberSchema => new NumberSchema();
const sObject = <T extends ObjectShape>(shape: T): ObjectSchema<T> => new ObjectSchema(shape);
const sRecord = <K extends string, V>(keySchema: Schema<K, any>, valueSchema: Schema<V, any>): RecordSchema<K, V> =>
  new RecordSchema(keySchema, valueSchema);
const sSet = <T>(schema: Schema<T, any>): SetSchema<T> => new SetSchema(schema);
const sString = (): StringSchema => new StringSchema();
const sTuple = <const T extends TupleSchemas>(items: T): TupleSchema<T> => new TupleSchema(items);
const sUndefined = (): LiteralSchema<undefined> => new LiteralSchema(undefined);
const sUnion = <T extends readonly [RawOrSchema, RawOrSchema, ...RawOrSchema[]]>(
  ...items: T
): UnionSchema<NormalizeItems<T> & readonly AnySchema[]> =>
  new UnionSchema(normalizeToSchemas(items) as NormalizeItems<T> & readonly AnySchema[]);
const sOr = <A, B>(a: Schema<A, any>, b: Schema<B, any>): UnionSchema<readonly [Schema<A, any>, Schema<B, any>]> =>
  sUnion(a, b);
const sUnknown = (): Schema<unknown> => new Schema();
const sVariant = <K extends string, M extends Record<string, ObjectSchema<any>>>(
  discriminator: K,
  map: M,
): VariantSchema<K, M> => new VariantSchema(discriminator, map);
const sCoerce = {
  bigint: (): BigIntSchema => BigIntSchema.coerce(),
  boolean: (): BooleanSchema => BooleanSchema.coerce(),
  date: (): DateSchema => DateSchema.coerce(),
  number: (): NumberSchema => NumberSchema.coerce(),
  string: (): StringSchema => StringSchema.coerce(),
};

/* -------------------- `s` namespace — the public API -------------------- */

/**
 * Namespace of all schema factories. Use `s.string()`, `s.object()`, etc.
 *
 * @example
 * import { s, type Infer } from '@vielzeug/spell';
 *
 * const User = s.object({ name: s.string(), age: s.number().int().positive() });
 * type User = Infer<typeof User>;
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
