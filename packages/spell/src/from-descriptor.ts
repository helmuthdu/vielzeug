import type { AnySchema, ReconstructibleSchemaDescriptor } from './core';

import { Schema } from './core';
import { defineOwnProperty } from './safe-object';
import { ArraySchema } from './schemas/array';
import { BigIntSchema } from './schemas/bigint';
import { BooleanSchema } from './schemas/boolean';
import { DateSchema } from './schemas/date';
import { EnumSchema } from './schemas/enum';
import { IntersectSchema } from './schemas/intersect';
import { LiteralSchema } from './schemas/literal';
import { MapSchema } from './schemas/map';
import { NeverSchema } from './schemas/never';
import { NumberSchema } from './schemas/number';
import { ObjectSchema } from './schemas/object';
import { RecordSchema } from './schemas/record';
import { SetSchema } from './schemas/set';
import { StringSchema } from './schemas/string';
import { TupleSchema } from './schemas/tuple';
import { UnionSchema } from './schemas/union';

function applyBaseFields(schema: AnySchema, descriptor: ReconstructibleSchemaDescriptor): AnySchema {
  let result = schema;

  if (descriptor.isOptional && descriptor.isNullable) {
    result = result.nullish();
  } else if (descriptor.isOptional) {
    result = result.optional();
  } else if (descriptor.isNullable) {
    result = result.nullable();
  }

  if (descriptor.description !== undefined) {
    result = result.label(descriptor.description);
  }

  return result;
}

function applyNumberFields(
  schema: NumberSchema,
  descriptor: Extract<ReconstructibleSchemaDescriptor, { kind: 'number' }>,
): NumberSchema {
  let result = schema;

  if (descriptor.minimum !== undefined) result = result.min(descriptor.minimum);

  if (descriptor.maximum !== undefined) result = result.max(descriptor.maximum);

  if (descriptor.exclusiveMinimum === 0) result = result.positive();

  if (descriptor.exclusiveMaximum === 0) result = result.negative();

  if (descriptor.multipleOf !== undefined) result = result.multipleOf(descriptor.multipleOf);

  if (descriptor.typeHint === 'integer') result = result.int();

  return result;
}

function applyStringFields(
  schema: StringSchema,
  descriptor: Extract<ReconstructibleSchemaDescriptor, { kind: 'string' }>,
): StringSchema {
  let result = schema;

  if (descriptor.minLength !== undefined) result = result.min(descriptor.minLength);

  if (descriptor.maxLength !== undefined) result = result.max(descriptor.maxLength);

  if (descriptor.pattern !== undefined && descriptor.pattern !== null) {
    try {
      result = result.regex(new RegExp(descriptor.pattern));
    } catch {
      throw new Error('[@vielzeug/spell] fromDescriptor(): invalid string pattern in descriptor.');
    }
  }

  if (descriptor.contentEncoding === 'base64') result = result.base64();

  switch (descriptor.format) {
    case 'date':
      result = result.isoDate();
      break;
    case 'date-time':
      result = result.isoDateTime();
      break;
    case 'duration':
      result = result.duration();
      break;
    case 'email':
      result = result.email();
      break;
    case 'uri':
      result = result.url();
      break;
    case 'uuid':
      result = result.uuid();
      break;
  }

  return result;
}

/**
 * Reconstructs a Schema instance from a SchemaDescriptor.
 *
 * Round-trips all base descriptor fields plus the reconstructible string/number/object
 * annotations exposed by spell descriptors. Some descriptor kinds and annotations still
 * cannot be restored losslessly (for example `instanceof`, `lazy`, `pipe`, `variant`,
 * ambiguous `pattern: null`, or non-zero exclusive number bounds).
 *
 * **Security note:** Only pass descriptors produced by `schema.toDescriptor()` on schemas
 * you control. Never deserialize descriptors from untrusted external sources — the `pattern`
 * field is compiled into a `RegExp` and an adversarial pattern could cause ReDoS.
 */
export function fromDescriptor(descriptor: ReconstructibleSchemaDescriptor): AnySchema {
  const { kind } = descriptor;

  switch (kind) {
    case 'any':
    case 'unknown':
      return applyBaseFields(new Schema<unknown>(), descriptor);

    case 'array': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'array' }>;
      let schema = new ArraySchema(fromDescriptor(d.items));

      if (d.minItems !== undefined) schema = schema.min(d.minItems);

      if (d.maxItems !== undefined) schema = schema.max(d.maxItems);

      return applyBaseFields(schema, d);
    }

    case 'bigint':
      return applyBaseFields(new BigIntSchema(), descriptor);

    case 'boolean':
      return applyBaseFields(new BooleanSchema(), descriptor);

    case 'date':
      return applyBaseFields(new DateSchema(), descriptor);

    case 'enum':
      return applyBaseFields(
        new EnumSchema((descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'enum' }>).values as any),
        descriptor,
      );

    case 'intersect': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'union' | 'intersect' }> & {
        kind: 'intersect';
      };

      return applyBaseFields(new IntersectSchema(d.branches.map(fromDescriptor) as any), d);
    }

    case 'literal':
      return applyBaseFields(
        new LiteralSchema((descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'literal' }>).value),
        descriptor,
      );

    case 'map': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'map' }>;

      return applyBaseFields(new MapSchema(fromDescriptor(d.key), fromDescriptor(d.value)), d);
    }

    case 'never':
      return applyBaseFields(new NeverSchema(), descriptor);

    case 'number': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'number' }>;

      return applyBaseFields(applyNumberFields(new NumberSchema(), d), d);
    }

    case 'object': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'object' }>;
      const shape: Record<string, AnySchema> = {};

      for (const [key, field] of Object.entries(d.fields)) {
        defineOwnProperty(shape, key, fromDescriptor(field));
      }

      const schema = new ObjectSchema(shape as any);

      return applyBaseFields(d.strict ? schema : schema.relaxed(), d);
    }

    case 'record': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'record' }>;

      return applyBaseFields(new RecordSchema(fromDescriptor(d.key) as any, fromDescriptor(d.value)), d);
    }

    case 'set': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'set' }>;

      return applyBaseFields(new SetSchema(fromDescriptor(d.items)), d);
    }

    case 'string': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'string' }>;

      return applyBaseFields(applyStringFields(new StringSchema(), d), d);
    }

    case 'tuple': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'tuple' }>;
      const base = new TupleSchema(d.items.map(fromDescriptor) as any);
      const schema = d.rest !== null ? base.rest(fromDescriptor(d.rest)) : base;

      return applyBaseFields(schema, d);
    }

    case 'union': {
      const d = descriptor as Extract<ReconstructibleSchemaDescriptor, { kind: 'union' | 'intersect' }> & {
        kind: 'union';
      };

      return applyBaseFields(new UnionSchema(d.branches.map(fromDescriptor) as any), d);
    }

    // 'variant', 'pipe', 'instanceof', 'lazy' cannot be losslessly reconstructed
    default:
      throw new Error(
        `[@vielzeug/spell] fromDescriptor(): "${kind}" descriptors cannot be reconstructed ` +
          `(round-trip not supported for lazy, pipe, instanceof, variant). Check descriptor.kind first.`,
      );
  }
}
