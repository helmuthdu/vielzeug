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
 * Full stored package — canonical shape. Metadata plus heavy content payload.
 * Tools project down to PackageMeta for responses.
 */
export interface BundledPackage {
  apiSource: string | null;
  availableDocPages: DocPage[];
  category: string;
  components: CemDeclaration[];
  description: string;
  docs: Partial<Record<DocPage, string>>;
  exports: string[];
  keywords: string[];
  name: string;
  related: string[];
  slug: string;
  version: string;
}

/**
 * Lightweight metadata for a package — what list-packages and get-package expose.
 * Derived from BundledPackage: heavy fields stripped, hasSource computed.
 */
export type PackageMeta = Omit<BundledPackage, 'apiSource' | 'components' | 'docs'> & {
  hasSource: boolean;
};

export interface BundledData {
  packages: BundledPackage[];
  schemaVersion: typeof SCHEMA_VERSION;
  version: string;
}
