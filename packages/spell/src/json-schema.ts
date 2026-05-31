import type { JsonSchema, SchemaDescriptor } from './types';

/**
 * Converts a `SchemaDescriptor` to a JSON Schema object (draft 2020-12 compatible).
 *
 * This is the single authoritative JSON Schema serializer. `Schema.toJsonSchema()`
 * delegates to this function so there is one code path for both introspection and
 * JSON Schema output.
 */
export function descriptorToJsonSchema(d: SchemaDescriptor): JsonSchema {
  const base = _descriptorToBase(d);
  let result: JsonSchema = base;

  if (d.isNullable) result = { anyOf: [base, { type: 'null' }] };

  if (d.description) result = { ...result, description: d.description };

  return result;
}

function _descriptorToBase(d: SchemaDescriptor): JsonSchema {
  switch (d.kind) {
    case 'any':
    case 'unknown':
      return {};

    case 'array': {
      const out: JsonSchema = { items: descriptorToJsonSchema(d.items), type: 'array' };

      if (d.minItems !== undefined) out['minItems'] = d.minItems;

      if (d.maxItems !== undefined) out['maxItems'] = d.maxItems;

      return out;
    }

    case 'bigint':
      return { type: 'integer' };

    case 'boolean':
      return { type: 'boolean' };

    case 'date':
      return {
        $comment:
          'Date objects are not representable in JSON Schema. Validate as a string with a date format in JSON contexts.',
      };

    case 'enum':
      return { enum: [...d.values] };

    case 'instanceof':
    // falls through

    case 'lazy':
      return {};

    case 'intersect':
      return { allOf: d.branches.map(descriptorToJsonSchema) };

    case 'literal':
      if (d.value === null) return { type: 'null' };

      if (d.value === undefined) return {};

      return { const: d.value };

    case 'map':
      return {
        $comment: 'Map type — represented as an object with arbitrary string keys.',
        additionalProperties: descriptorToJsonSchema(d.value),
        type: 'object',
      };

    case 'never':
      return { not: {} };

    case 'number': {
      const out: JsonSchema = { type: d.typeHint === 'integer' ? 'integer' : 'number' };

      if (d.minimum !== undefined) out['minimum'] = d.minimum;

      if (d.maximum !== undefined) out['maximum'] = d.maximum;

      if (d.exclusiveMinimum !== undefined) out['exclusiveMinimum'] = d.exclusiveMinimum;

      if (d.exclusiveMaximum !== undefined) out['exclusiveMaximum'] = d.exclusiveMaximum;

      if (d.multipleOf !== undefined) out['multipleOf'] = d.multipleOf;

      return out;
    }

    case 'object': {
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, fieldDescriptor] of Object.entries(d.fields)) {
        properties[key] = descriptorToJsonSchema(fieldDescriptor);

        if (!fieldDescriptor.isOptional) required.push(key);
      }

      const out: JsonSchema = { properties, type: 'object' };

      if (required.length > 0) out['required'] = required;

      if (d.strict) out['additionalProperties'] = false;

      return out;
    }

    case 'pipe':
      return descriptorToJsonSchema(d.to);

    case 'record':
      return {
        additionalProperties: descriptorToJsonSchema(d.value),
        type: 'object',
      };

    case 'set':
      return { $comment: 'Set<T> — no standard JSON Schema equivalent; treated as an ordered unique-item array.' };

    case 'string': {
      const out: JsonSchema = { type: 'string' };

      if (d.minLength !== undefined) out['minLength'] = d.minLength;

      if (d.maxLength !== undefined) out['maxLength'] = d.maxLength;

      if (d.pattern != null) out['pattern'] = d.pattern;

      if (d.format !== undefined) out['format'] = d.format;

      if (d.contentEncoding !== undefined) out['contentEncoding'] = d.contentEncoding;

      return out;
    }

    case 'tuple': {
      const out: JsonSchema = {
        prefixItems: d.items.map(descriptorToJsonSchema),
        type: 'array',
      };

      if (d.rest !== null) {
        out['items'] = descriptorToJsonSchema(d.rest);
      } else {
        out['items'] = false;
      }

      return out;
    }

    case 'union':
      return { anyOf: d.branches.map(descriptorToJsonSchema) };
    case 'variant':
      return {
        discriminator: { propertyName: d.discriminator },
        oneOf: Object.values(d.branches).map(descriptorToJsonSchema),
      };
  }
}
