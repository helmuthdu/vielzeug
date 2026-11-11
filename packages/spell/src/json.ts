import { defineOwnProperty } from './_object';
import type { PatternDescriptor, SchemaDescriptor } from './types';

/** Plain JSON Schema object (targeting JSON Schema 2020-12). */
export type JsonSchema = Record<string, unknown>;

/** Spell format names with a different JSON Schema `format` spelling. */
const JSON_FORMATS: Readonly<Record<string, string>> = { isoDate: 'date', isoDateTime: 'date-time', url: 'uri' };

function stringFormat(format: string): JsonSchema {
  if (format === 'base64' || format === 'base64url') return { contentEncoding: format };

  if (format === 'ip') return { anyOf: [{ format: 'ipv4' }, { format: 'ipv6' }] };

  return { format: JSON_FORMATS[format] ?? format };
}

/** JSON Schema patterns are flagless ECMA-262 regexes, so regex flags are not carried over. */
function stringConstraints(formats: readonly string[], patterns: readonly PatternDescriptor[]): JsonSchema {
  const parts = [...formats.map(stringFormat), ...patterns.map(({ source }) => ({ pattern: source }))];

  if (parts.length === 0) return {};

  const [first, ...rest] = parts;

  return rest.length === 0 ? first! : { allOf: parts };
}

const toNumber = (value: bigint | undefined) => (value === undefined ? undefined : Number(value));

function withDefined(base: JsonSchema, extra: Record<string, unknown>): JsonSchema {
  for (const [key, value] of Object.entries(extra)) if (value !== undefined) base[key] = value;

  return base;
}

function toBase(d: SchemaDescriptor): JsonSchema {
  switch (d.kind) {
    case 'unknown':
    case 'lazy':
      return {};

    case 'never':
      return { not: {} };

    case 'boolean':
      return { type: 'boolean' };

    case 'string':
      return withDefined(
        { type: 'string', ...stringConstraints(d.formats ?? [], d.patterns ?? []) },
        { maxLength: d.maxLength, minLength: d.minLength },
      );

    case 'number':
      return withDefined(
        { type: d.integer ? 'integer' : 'number' },
        {
          exclusiveMaximum: d.exclusiveMaximum,
          exclusiveMinimum: d.exclusiveMinimum,
          maximum: d.maximum,
          minimum: d.minimum,
          multipleOf: d.multipleOf,
        },
      );

    case 'bigint':
      return withDefined(
        { type: 'integer' },
        {
          exclusiveMaximum: toNumber(d.exclusiveMaximum),
          exclusiveMinimum: toNumber(d.exclusiveMinimum),
          maximum: toNumber(d.maximum),
          minimum: toNumber(d.minimum),
          multipleOf: toNumber(d.multipleOf),
        },
      );

    case 'date':
      return {
        $comment:
          'Date objects are not representable in JSON Schema. Validate as a string with a date format in JSON contexts.',
      };

    case 'instanceof':
      return { $comment: `Instances of "${d.className}" are not representable in JSON Schema.` };

    case 'literal':
      if (d.value === null) return { type: 'null' };

      return d.value === undefined ? {} : { const: d.value };

    case 'enum':
      return { enum: [...d.values] };

    case 'array':
      return withDefined(
        { items: toJsonSchema(d.items), type: 'array' },
        { maxItems: d.maxItems, minItems: d.minItems, uniqueItems: d.uniqueItems },
      );

    case 'tuple':
      return {
        items: d.rest === null ? false : toJsonSchema(d.rest),
        prefixItems: d.items.map(toJsonSchema),
        type: 'array',
      };

    case 'set':
      return withDefined(
        {
          $comment: 'Set<T>: no standard JSON Schema equivalent; treated as an ordered unique-item array.',
          items: toJsonSchema(d.items),
          type: 'array',
          uniqueItems: true,
        },
        { maxItems: d.maxSize, minItems: d.minSize },
      );

    case 'map':
      return withDefined(
        {
          $comment: 'Map: represented as an object; key constraints are not representable.',
          additionalProperties: toJsonSchema(d.value),
          type: 'object',
        },
        { maxProperties: d.maxSize, minProperties: d.minSize },
      );

    case 'record':
      return { additionalProperties: toJsonSchema(d.value), propertyNames: toJsonSchema(d.key), type: 'object' };

    case 'object': {
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, field] of Object.entries(d.fields)) {
        defineOwnProperty(properties, key, toJsonSchema(field));

        if (!field.isOptional) required.push(key);
      }

      for (const key of d.tolerated ?? []) if (!Object.hasOwn(properties, key)) defineOwnProperty(properties, key, {});

      return withDefined(
        { properties, type: 'object' },
        { additionalProperties: d.strict ? false : undefined, required: required.length > 0 ? required : undefined },
      );
    }

    case 'union':
      return { anyOf: d.branches.map(toJsonSchema) };

    case 'intersect':
      return { allOf: d.branches.map(toJsonSchema) };

    case 'discriminatedUnion':
      return { discriminator: { propertyName: d.discriminator }, oneOf: Object.values(d.branches).map(toJsonSchema) };

    case 'pipe':
      return toJsonSchema(d.to);
  }
}

/**
 * Converts a schema definition (`schema.definition()`) to a JSON Schema 2020-12 object.
 * Non-JSON types (`date`, `map`, `set`, `instanceof`) are approximated and annotated with `$comment`.
 */
export function toJsonSchema(definition: SchemaDescriptor): JsonSchema {
  const base = toBase(definition);
  const schema = definition.isNullable ? { anyOf: [base, { type: 'null' }] } : base;

  return definition.description === undefined ? schema : { ...schema, description: definition.description };
}
