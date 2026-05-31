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
      let schema = new ArraySchema(fromDescriptor(d.items));

      if (d.minItems !== undefined) schema = schema.min(d.minItems);

      if (d.maxItems !== undefined) schema = schema.max(d.maxItems);

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
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'number' }>;
      let n = new NumberSchema();

      if (d.minimum !== undefined) n = n.min(d.minimum);

      if (d.maximum !== undefined) n = n.max(d.maximum);

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

      return new SetSchema(fromDescriptor(d.items));
    }

    case 'string': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'string' }>;
      let s = new StringSchema();

      if (d.minLength !== undefined) s = s.min(d.minLength);

      if (d.maxLength !== undefined) s = s.max(d.maxLength);

      return s;
    }

    case 'tuple': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'tuple' }>;
      const base = new TupleSchema(d.items.map(fromDescriptor) as any);

      return d.rest !== null ? base.rest(fromDescriptor(d.rest)) : base;
    }

    case 'union': {
      const d = descriptor as Extract<SchemaDescriptor, { kind: 'union' | 'intersect' }> & { kind: 'union' };

      return new UnionSchema(d.branches.map(fromDescriptor) as any);
    }

    // 'variant', 'pipe', 'instanceof', 'lazy' cannot be losslessly reconstructed
    default:
      throw new Error(
        `[@vielzeug/spell] fromDescriptor(): "${kind}" descriptors cannot be reconstructed ` +
          `(round-trip not supported for lazy, pipe, instanceof, variant). Check descriptor.kind first.`,
      );
  }
}
