import { type AnySchema, Schema } from '../core';
import { ArraySchema } from './array';
import { BigIntSchema } from './bigint';
import { BooleanSchema } from './boolean';
import { EnumSchema } from './enum';
import { IntersectSchema } from './intersect';
import { LiteralSchema } from './literal';
import { NeverSchema } from './never';
import { NumberSchema } from './number';
import { ObjectSchema } from './object';
import { RecordSchema } from './record';
import { StringSchema } from './string';
import { TupleSchema } from './tuple';
import { UnionSchema } from './union';
import { VariantSchema } from './variant';

/**
 * A plain JSON Schema object (targeting JSON Schema 2020-12).
 *
 * @remarks
 * Includes structural type information plus supported constraint metadata from schema state,
 * such as `minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `format`, and
 * `contentEncoding`. Variant schemas also include a `discriminator` annotation for
 * OpenAPI consumers.
 */
export type JsonSchema = Record<string, unknown>;

/**
 * Converts a `validit` schema to a plain JSON Schema (2020-12) object.
 *
 * Supported:
 * - Primitive types: string, number, boolean, bigint (→ integer)
 * - `v.object()` — with properties, required array, additionalProperties: false
 * - `v.array()` — with items
 * - `v.tuple()` — with prefixItems and optional rest items
 * - `v.record()` — with additionalProperties
 * - `v.union()` — anyOf
 * - `v.intersect()` — allOf
 * - `v.variant()` — oneOf with discriminator annotation
 * - `v.enum()` — enum
 * - `v.literal()` — const (or type: 'null' for null literals)
 * - `v.never()` — not: {}
 * - `.optional()` — omits field from parent object's required array
 * - `.nullable()` — wraps in anyOf with { type: 'null' }
 * - `.describe()` — attaches description
 *
 * Not representable (returns `{}`): Date, Map, Set, instanceof, lazy
 */
export function toJsonSchema(schema: AnySchema): JsonSchema {
  const base = deriveBase(schema);

  return applyModifiers(schema, base);
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function applyModifiers(schema: AnySchema, base: JsonSchema): JsonSchema {
  let result = base;

  if (schema.isNullable) {
    result = { anyOf: [base, { type: 'null' }] };
  }

  if (schema.description) {
    result = { ...result, description: schema.description };
  }

  return result;
}

function deriveBase(schema: AnySchema): JsonSchema {
  if (schema instanceof NeverSchema) return { not: {} };

  if (schema instanceof LiteralSchema) {
    const { value } = schema;

    if (value === null) return { type: 'null' };

    if (value === undefined) return {};

    return { const: value };
  }

  if (schema instanceof StringSchema) {
    const base: JsonSchema = { type: 'string' };
    const constraints = schema.meta?.constraints;

    if (constraints) {
      if (constraints.minLength !== undefined) base['minLength'] = constraints.minLength;

      if (constraints.maxLength !== undefined) base['maxLength'] = constraints.maxLength;

      if (constraints.pattern !== undefined) base['pattern'] = constraints.pattern;

      if (constraints.format !== undefined) base['format'] = constraints.format;

      if (constraints.contentEncoding !== undefined) base['contentEncoding'] = constraints.contentEncoding;
    }

    return base;
  }

  if (schema instanceof NumberSchema) {
    const base: JsonSchema = { type: schema.meta?.typeHint === 'integer' ? 'integer' : 'number' };
    const constraints = schema.meta?.constraints;

    if (constraints) {
      if (constraints.minimum !== undefined) base['minimum'] = constraints.minimum;

      if (constraints.maximum !== undefined) base['maximum'] = constraints.maximum;

      if (constraints.exclusiveMinimum !== undefined) base['exclusiveMinimum'] = constraints.exclusiveMinimum;

      if (constraints.exclusiveMaximum !== undefined) base['exclusiveMaximum'] = constraints.exclusiveMaximum;

      if (constraints.multipleOf !== undefined) base['multipleOf'] = constraints.multipleOf;
    }

    return base;
  }

  if (schema instanceof BooleanSchema) return { type: 'boolean' };

  if (schema instanceof BigIntSchema) return { type: 'integer' };

  if (schema instanceof EnumSchema) {
    return { enum: [...schema.values] };
  }

  if (schema instanceof ObjectSchema) {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [key, child] of Object.entries(schema.shape) as [string, AnySchema][]) {
      properties[key] = toJsonSchema(child);

      if (!child.isOptional) required.push(key);
    }

    const result: JsonSchema = { additionalProperties: false, properties, type: 'object' };

    if (required.length > 0) result['required'] = required;

    return result;
  }

  if (schema instanceof RecordSchema) {
    return { additionalProperties: toJsonSchema(schema.valueSchema), type: 'object' };
  }

  if (schema instanceof ArraySchema) {
    const base: JsonSchema = { items: toJsonSchema(schema.itemSchema), type: 'array' };
    const constraints = schema.meta?.constraints;

    if (constraints) {
      if (constraints.minItems !== undefined) base['minItems'] = constraints.minItems;

      if (constraints.maxItems !== undefined) base['maxItems'] = constraints.maxItems;
    }

    return base;
  }

  if (schema instanceof TupleSchema) {
    const prefixItems = (schema.items as AnySchema[]).map(toJsonSchema);
    const result: JsonSchema = { prefixItems, type: 'array' };

    result['items'] = schema.restSchema ? toJsonSchema(schema.restSchema as AnySchema) : false;

    return result;
  }

  if (schema instanceof UnionSchema) {
    return { anyOf: (schema.schemas as AnySchema[]).map(toJsonSchema) };
  }

  if (schema instanceof IntersectSchema) {
    return { allOf: (schema.schemas as AnySchema[]).map(toJsonSchema) };
  }

  if (schema instanceof VariantSchema) {
    const oneOf = [...schema.variantMap.values()].map((s) => toJsonSchema(s));

    return { discriminator: { propertyName: schema.discriminator }, oneOf };
  }

  // Bare Schema() is the explicit any/unknown schema.
  if (schema.constructor === Schema) {
    return {};
  }

  // DateSchema, MapSchema, SetSchema, InstanceOfSchema, LazySchema:
  // no portable JSON Schema representation.
  return {
    $comment:
      'validit: this schema has no portable JSON Schema representation. Runtime validation remains authoritative.',
  };
}
