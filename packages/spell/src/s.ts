import { Schema } from './schema';
import { ArraySchema } from './schemas/array';
import { BigIntSchema } from './schemas/bigint';
import { DateSchema } from './schemas/date';
import { type DiscriminatedBranches, DiscriminatedUnionSchema } from './schemas/discriminated-union';
import { IntersectSchema } from './schemas/intersect';
import { LazySchema } from './schemas/lazy';
import { MapSchema } from './schemas/map';
import { NumberSchema } from './schemas/number';
import { ObjectSchema, type ObjectShape } from './schemas/object';
import {
  BooleanSchema,
  EnumSchema,
  type EnumValues,
  InstanceOfSchema,
  LiteralSchema,
  type LiteralValue,
  NeverSchema,
} from './schemas/primitives';
import { RecordSchema } from './schemas/record';
import { SetSchema } from './schemas/set';
import { StringSchema } from './schemas/string';
import { TupleSchema, type TupleSchemas } from './schemas/tuple';
import { type UnionMembers, UnionSchema } from './schemas/union';
import type { AnySchema, InferInput, InferOutput } from './types';

const coerceNumber = (value: unknown): unknown => {
  if (typeof value !== 'string' && typeof value !== 'boolean') return value;

  const parsed = Number(value);

  return Number.isNaN(parsed) ? value : parsed;
};

const coerceBoolean = (value: unknown): unknown => {
  if (value === 'true' || value === '1' || value === 1) return true;

  if (value === 'false' || value === '0' || value === 0) return false;

  return value;
};

const coerceBigInt = (value: unknown): unknown => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // BigInt() parsing is superlinear in digit count; bound untrusted input.
    if (trimmed.length === 0 || trimmed.length > 1000) return value;

    try {
      return BigInt(trimmed);
    } catch {
      return value;
    }
  }

  return typeof value === 'number' ? BigInt(value) : value;
};

const coerceDate = (value: unknown): unknown =>
  typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;

const coerceString = (value: unknown): unknown => (value == null ? value : String(value));

/**
 * Namespace of all schema builders.
 *
 * @example
 * import { s, type Infer } from '@vielzeug/spell';
 *
 * const User = s.object({ name: s.string(), age: s.number().int().positive() });
 * type User = Infer<typeof User>;
 */
export const s = {
  array: <T extends AnySchema>(item: T): ArraySchema<T> => new ArraySchema(item),
  bigint: (): BigIntSchema => new BigIntSchema(),
  boolean: (): BooleanSchema => new BooleanSchema(),
  /** Primitive schemas that convert their raw input before validating it. */
  coerce: {
    /** Converts safe-integer numbers and integer strings (up to 1000 characters). */
    bigint: (): BigIntSchema<unknown> => new BigIntSchema<unknown>().preprocess(coerceBigInt),
    /** Converts `'true'`/`'1'`/`1` and `'false'`/`'0'`/`0`. */
    boolean: (): BooleanSchema<unknown> => new BooleanSchema<unknown>().preprocess(coerceBoolean),
    /** Converts strings and epoch milliseconds with `new Date()`. */
    date: (): DateSchema<unknown> => new DateSchema<unknown>().preprocess(coerceDate),
    /** Converts numeric strings and booleans with `Number()`. */
    number: (): NumberSchema<unknown> => new NumberSchema<unknown>().preprocess(coerceNumber),
    /** Converts any non-nullish value with `String()`. */
    string: (): StringSchema<unknown> => new StringSchema<unknown>().preprocess(coerceString),
  },
  date: (): DateSchema => new DateSchema(),
  discriminatedUnion: <K extends string, M extends DiscriminatedBranches>(
    discriminator: K,
    branches: M,
  ): DiscriminatedUnionSchema<K, M> => new DiscriminatedUnionSchema(discriminator, branches),
  enum: <const T extends EnumValues>(values: T): EnumSchema<T> => new EnumSchema(values),
  instanceof: <T>(cls: abstract new (...args: never[]) => T): InstanceOfSchema<T> => new InstanceOfSchema(cls),
  intersect: <const T extends UnionMembers>(...schemas: T): IntersectSchema<T> => new IntersectSchema(schemas),
  lazy: <T extends AnySchema>(getter: () => T): LazySchema<InferOutput<T>, InferInput<T>> => new LazySchema(getter),
  literal: <const T extends LiteralValue>(value: T): LiteralSchema<T> => new LiteralSchema(value),
  map: <K extends AnySchema, V extends AnySchema>(key: K, value: V): MapSchema<K, V> => new MapSchema(key, value),
  never: (): NeverSchema => new NeverSchema(),
  null: (): LiteralSchema<null> => new LiteralSchema(null),
  number: (): NumberSchema => new NumberSchema(),
  object: <T extends ObjectShape>(shape: T): ObjectSchema<T> => new ObjectSchema(shape),
  record: <K extends AnySchema, V extends AnySchema>(key: K, value: V): RecordSchema<K, V> =>
    new RecordSchema(key, value),
  set: <T extends AnySchema>(item: T): SetSchema<T> => new SetSchema(item),
  string: (): StringSchema => new StringSchema(),
  tuple: <const T extends TupleSchemas>(items: T): TupleSchema<T> => new TupleSchema(items),
  undefined: (): LiteralSchema<undefined> => new LiteralSchema(undefined),
  union: <const T extends UnionMembers>(...schemas: T): UnionSchema<T> => new UnionSchema(schemas),
  unknown: (): Schema<unknown> => new Schema(),
};
