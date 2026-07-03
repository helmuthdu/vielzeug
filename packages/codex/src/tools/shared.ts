import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { ToolSchema } from './schema.js';

import { ToolError } from '../errors.js';
import { normalisePackage } from '../search.js';
import { type BundledData, type BundledPackage, type CemDeclaration } from '../types.js';

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

export function text(value: string): CallToolResult {
  return { content: [{ text: value, type: 'text' }] };
}

// ---------------------------------------------------------------------------
// Context — pre-computed once from BundledData, shared across all server instances
// ---------------------------------------------------------------------------

export interface ToolContext {
  bySlug: Map<string, BundledPackage>;
  normalisedPackages: ReturnType<typeof normalisePackage>[];
  /** [] when refine wasn't built before data generation. */
  refineComponents: CemDeclaration[];
  /** Pre-filtered tag names from refineComponents. */
  refineComponentTags: string[];
}

export function buildToolContext(data: BundledData): ToolContext {
  return {
    bySlug: new Map(data.packages.map((pkg) => [pkg.slug, pkg])),
    normalisedPackages: data.packages.map(normalisePackage),
    refineComponents: data.refineComponents,
    refineComponentTags: data.refineComponents.filter((d) => d.tagName).map((d) => d.tagName as string),
  };
}

export function knownSlugs(context: ToolContext): string {
  return [...context.bySlug.keys()].join(', ');
}

/** Looks up a package by slug or throws `ToolError('NOT_FOUND', ...)` — the one place every tool resolves a slug. */
export function requirePackage(context: ToolContext, slug: string): BundledPackage {
  const pkg = context.bySlug.get(slug);

  if (!pkg) throw new ToolError('NOT_FOUND', `Package "${slug}" not found. Available slugs: ${knownSlugs(context)}`);

  return pkg;
}

// ---------------------------------------------------------------------------
// Tool definition shape
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  description: string;
  inputSchema: ToolSchema;
  name: string;
  run: (args: Record<string, unknown>, context: ToolContext) => CallToolResult;
}
