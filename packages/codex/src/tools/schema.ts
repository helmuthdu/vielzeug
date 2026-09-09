import { CatalogError } from '../catalog.js';

export interface ToolProperty {
  default?: string;
  description: string;
  enum?: readonly string[];
  maxLength?: number;
  minLength?: number;
  type: 'string';
}

export interface ToolSchema {
  additionalProperties: false;
  properties: Record<string, ToolProperty>;
  required?: string[];
  type: 'object';
}

export const EMPTY_SCHEMA: ToolSchema = { additionalProperties: false, properties: {}, type: 'object' };

export const PACKAGE_SLUG_PROPERTY: ToolProperty = {
  description: 'Package folder name, e.g. "ripple"',
  maxLength: 100,
  minLength: 1,
  type: 'string',
};

export type InferArgs<S extends ToolSchema> = {
  [K in keyof S['properties']]: S['properties'][K] extends { enum: readonly (infer E)[] } ? E : string;
};

export function parseArgs<S extends ToolSchema>(schema: S, raw: Record<string, unknown>): InferArgs<S> {
  const result: Record<string, string> = {};

  for (const key of Object.keys(raw)) {
    if (!Object.hasOwn(schema.properties, key)) throw new CatalogError('INVALID_ARG', `${key}: unknown argument.`);
  }

  for (const [key, property] of Object.entries(schema.properties)) {
    const required = schema.required?.includes(key) ?? false;
    const value = raw[key];

    if (value === undefined || value === '') {
      if (required) throw new CatalogError('INVALID_ARG', `${key}: required non-empty string.`);
      if (property.default !== undefined) result[key] = property.default;
      continue;
    }

    if (typeof value !== 'string') throw new CatalogError('INVALID_ARG', `${key}: must be a string.`);

    const trimmed = value.trim();

    if (required && trimmed.length === 0) throw new CatalogError('INVALID_ARG', `${key}: required non-empty string.`);
    if (property.minLength !== undefined && trimmed.length < property.minLength)
      throw new CatalogError('INVALID_ARG', `${key}: must be at least ${property.minLength} characters.`);
    if (property.maxLength !== undefined && trimmed.length > property.maxLength)
      throw new CatalogError(
        'INVALID_ARG',
        `${key}: exceeds ${property.maxLength} character limit. Shorten the value.`,
      );
    if (property.enum && !property.enum.includes(trimmed))
      throw new CatalogError('INVALID_ARG', `${key}: must be one of ${property.enum.join(', ')}.`);

    result[key] = trimmed;
  }

  return result as InferArgs<S>;
}
