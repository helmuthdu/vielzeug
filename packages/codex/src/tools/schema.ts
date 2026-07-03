import { ToolError } from '../errors.js';

/**
 * Every tool's `inputSchema` used to be pure documentation — validated for real by a
 * parallel, hand-written `requireStr`/`optionalEnum` call per argument, so client-facing
 * constraints (`minLength`) and enforced constraints (a hardcoded 500-char cap) silently
 * drifted from each other. `parseArgs` reads directly off the same `ToolSchema` object a
 * tool declares as `inputSchema` — one declaration, always in sync with what's enforced.
 *
 * Tool files declare schemas with `satisfies ToolSchema` (not `: ToolSchema`) so the literal
 * property keys survive into the type — `InferArgs` then reads those keys straight off the
 * schema, so `parseArgs(schema, args)` returns an exact, always-in-sync result type with no
 * manually-written (and driftable) type argument at the call site.
 */
export interface ToolProperty {
  default?: string;
  description: string;
  enum?: readonly string[];
  maxLength?: number;
  minLength?: number;
  type: 'string';
}

export interface ToolSchema {
  properties: Record<string, ToolProperty>;
  required?: string[];
  type: 'object';
}

/** A property shared by every tool that takes a package slug — one definition, reused everywhere. */
export const PACKAGE_SLUG_PROPERTY: ToolProperty = {
  description: 'Package folder name, e.g. "ripple"',
  maxLength: 100,
  minLength: 1,
  type: 'string',
};

/**
 * A property with a literal `enum` tuple (e.g. `enum: DOC_PAGES`) infers a union of that tuple's
 * members instead of plain `string` — `parseArgs` already validates the value is one of `enum` at
 * runtime, so callers get that guarantee reflected in the type without a manual cast.
 */
export type InferArgs<S extends ToolSchema> = {
  [K in keyof S['properties']]: S['properties'][K] extends { enum: readonly (infer E)[] } ? E : string;
};

/** Validates + trims raw MCP tool arguments against a `ToolSchema`. Throws `ToolError('INVALID_ARG', ...)` on the first violation. */
export function parseArgs<S extends ToolSchema>(schema: S, raw: Record<string, unknown>): InferArgs<S> {
  const result: Record<string, string> = {};

  for (const [key, prop] of Object.entries(schema.properties)) {
    const required = schema.required?.includes(key) ?? false;
    const value = raw[key];

    if (value === undefined || value === '') {
      if (required) throw new ToolError('INVALID_ARG', `${key}: required non-empty string.`);

      if (prop.default !== undefined) result[key] = prop.default;

      continue;
    }

    if (typeof value !== 'string') throw new ToolError('INVALID_ARG', `${key}: must be a string.`);

    const trimmed = value.trim();

    if (required && trimmed.length === 0) throw new ToolError('INVALID_ARG', `${key}: required non-empty string.`);

    if (prop.minLength !== undefined && trimmed.length < prop.minLength)
      throw new ToolError('INVALID_ARG', `${key}: must be at least ${prop.minLength} characters.`);

    if (prop.maxLength !== undefined && trimmed.length > prop.maxLength)
      throw new ToolError('INVALID_ARG', `${key}: exceeds ${prop.maxLength} character limit. Shorten the value.`);

    if (prop.enum && !prop.enum.includes(trimmed))
      throw new ToolError('INVALID_ARG', `${key}: must be one of ${prop.enum.join(', ')}.`);

    result[key] = trimmed;
  }

  return result as InferArgs<S>;
}
