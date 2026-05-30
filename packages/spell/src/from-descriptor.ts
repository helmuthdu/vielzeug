import type { AnySchema, SchemaDescriptor } from './core';

import { Schema } from './core';
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

/**
 * Reconstructs a Schema instance from a SchemaDescriptor.
 *
 * Not all descriptor kinds can be fully round-tripped (e.g. `instanceof`, `lazy`,
 * `pipe`). These are returned as a plain `Schema<unknown>` placeholder.
 */
export function fromDescriptor(descriptor: SchemaDescriptor): AnySchema {
  const { kind } = descriptor;

  switch (kind) {
    case 'any':
    case 'unknown':
      return new Schema<unknown>();

    case 'array': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'array' }>;
      const schema = new ArraySchema(fromDescriptor(d.items));

      if (d.minItems !== undefined) schema.min(d.minItems);

      if (d.maxItems !== undefined) schema.max(d.maxItems);

      return schema;
    }

    case 'bigint':
      return new BigIntSchema();

    case 'boolean':
      return new BooleanSchema();

    case 'date':
      return new DateSchema();

    case 'enum':
      return new EnumSchema((descriptor as Extract<SchemaDescriptor, { kind: 'enum' }>).values as any);

    case 'intersect': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'union' | 'intersect' }> & { kind: 'intersect' };

      return new IntersectSchema(d.branches.map(fromDescriptor) as any);
    }

    case 'literal':
      return new LiteralSchema((descriptor as Extract<SchemaDescriptor, { kind: 'literal' }>).value);

    case 'map': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'map' }>;

      return new MapSchema(fromDescriptor(d.key), fromDescriptor(d.value));
    }

    case 'never':
      return new NeverSchema();

    case 'number': {
      const n = new NumberSchema();

      if ('minimum' in descriptor && descriptor.minimum !== undefined) n.min(descriptor.minimum);

      if ('maximum' in descriptor && descriptor.maximum !== undefined) n.max(descriptor.maximum);

      return n;
    }

    case 'object': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'object' }>;
      const shape = Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, fromDescriptor(v)]));

      return new ObjectSchema(shape as any);
    }

    case 'record': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'record' }>;

      return new RecordSchema(fromDescriptor(d.key) as any, fromDescriptor(d.value));
    }

    case 'set': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'set' }>;

      return new SetSchema(fromDescriptor(d.item));
    }

    case 'string': {
      const s = new StringSchema();

      if ('minLength' in descriptor && descriptor.minLength !== undefined) s.min(descriptor.minLength);

      if ('maxLength' in descriptor && descriptor.maxLength !== undefined) s.max(descriptor.maxLength);

      return s;
    }

    case 'tuple': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'tuple' }>;

      return new TupleSchema(d.items.map(fromDescriptor) as any);
    }

    case 'union': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'union' | 'intersect' }> & { kind: 'union' };

      return new UnionSchema(d.branches.map(fromDescriptor) as any);
    }

    // 'variant', 'pipe', 'instanceof', 'lazy' cannot be losslessly reconstructed
    default:
      return new Schema<unknown>();
  }
}
