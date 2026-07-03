export const DOC_PAGES = ['index', 'api', 'usage', 'examples'] as const;
export type DocPage = (typeof DOC_PAGES)[number];

/** Increment whenever the shape of BundledData/BundledPackage changes to auto-invalidate stale caches. */
export const SCHEMA_VERSION = 4 as const;

// ---------------------------------------------------------------------------
// Custom Elements Manifest (CEM) types
// ---------------------------------------------------------------------------

export interface CemTypeRef {
  text: string;
}

export interface CemAttribute {
  default?: string;
  description?: string;
  fieldName?: string;
  name: string;
  type?: CemTypeRef;
}

export interface CemCssPart {
  description?: string;
  name: string;
}

export interface CemCssProperty {
  default?: string;
  description?: string;
  name: string;
}

export interface CemEvent {
  description?: string;
  name: string;
  type?: CemTypeRef;
}

export interface CemMember {
  description?: string;
  kind?: 'field' | 'method';
  name: string;
  type?: CemTypeRef;
}

export interface CemSlot {
  description?: string;
  name: string;
}

export interface CemDeclaration {
  [key: string]: unknown;
  attributes?: CemAttribute[];
  cssProperties?: CemCssProperty[];
  cssParts?: CemCssPart[];
  description?: string;
  events?: CemEvent[];
  members?: CemMember[];
  name?: string;
  slots?: CemSlot[];
  superclass?: { name: string; package?: string };
  tagName?: string;
}

// ---------------------------------------------------------------------------
// REPL examples
// ---------------------------------------------------------------------------

/** A single runnable REPL code example, sourced from docs/.vitepress/theme/components/repl/examples/<slug>/. */
export interface BundledExample {
  code: string;
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Bundled data
// ---------------------------------------------------------------------------

/**
 * Full stored package — canonical shape. Metadata plus heavy content payload.
 * Tools project down to PackageMeta for responses.
 */
export interface BundledPackage {
  apiSource: string | null;
  availableDocPages: DocPage[];
  category: string;
  description: string;
  docs: Partial<Record<DocPage, string>>;
  examples: BundledExample[];
  exports: string[];
  keywords: string[];
  name: string;
  related: string[];
  slug: string;
  /** Exported declaration text keyed by name, extracted from apiSource at generate time. See get-type-signature. */
  typeSignatures: Record<string, string>;
  version: string;
}

/**
 * Lightweight metadata for a package — what list-packages and get-package expose.
 * Derived from BundledPackage: heavy fields stripped, hasSource computed, examples reduced to ids.
 */
export type PackageMeta = Omit<BundledPackage, 'apiSource' | 'docs' | 'examples' | 'typeSignatures'> & {
  exampleIds: string[];
  hasSource: boolean;
};

/**
 * `refineComponents` lives at the top level rather than as a per-`BundledPackage` field:
 * CEM data only ever exists for the single 'refine' package, so modelling it as a
 * per-package field forced every other package to carry a permanently-empty array and
 * forced tool code to look refine up by slug to use it. `[]` when refine wasn't built
 * before data generation.
 */
export interface BundledData {
  packages: BundledPackage[];
  refineComponents: CemDeclaration[];
  schemaVersion: typeof SCHEMA_VERSION;
  version: string;
}
