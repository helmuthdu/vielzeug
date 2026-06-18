export const DOC_PAGES = ['index', 'api', 'usage', 'examples'] as const;
export type DocPage = (typeof DOC_PAGES)[number];

/** Increment whenever the shape of BundledPackage changes to auto-invalidate stale caches. */
export const SCHEMA_VERSION = 1 as const;

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
// Bundled data
// ---------------------------------------------------------------------------

/**
 * Lightweight metadata for a package — what list-packages and search-packages expose.
 * Does not include heavy content (docs text, source, CEM declarations).
 */
export interface PackageMeta {
  availableDocPages: DocPage[];
  category: string;
  description: string;
  exports: string[];
  hasSource: boolean;
  keywords: string[];
  name: string;
  related: string[];
  slug: string;
  version: string;
}

/**
 * Full stored package — metadata plus heavy content payload.
 * Only used internally; tools project down to PackageMeta for responses.
 */
export interface BundledPackage extends Omit<PackageMeta, 'hasSource'> {
  apiSource: string | null;
  components: CemDeclaration[];
  docs: Partial<Record<DocPage, string>>;
}

export interface BundledData {
  packages: BundledPackage[];
  schemaVersion: typeof SCHEMA_VERSION;
  version: string;
}
