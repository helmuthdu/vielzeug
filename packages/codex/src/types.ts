export const DOC_PAGES = ['index', 'api', 'usage', 'examples'] as const;
export type DocPage = (typeof DOC_PAGES)[number];

export const SNAPSHOT_SCHEMA_VERSION = 1 as const;

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

export interface Example {
  code: string;
  id: string;
  name: string;
}

export interface PackageMeta {
  availableDocPages: DocPage[];
  category: string;
  description: string;
  exampleIds: string[];
  exports: string[];
  hasSource: boolean;
  keywords: string[];
  name: string;
  related: string[];
  slug: string;
  version: string;
}

export interface PackageContent {
  apiSource: string | null;
  docs: Partial<Record<DocPage, string>>;
  examples: Example[];
  typeSignatures: Record<string, string>;
}

export interface SnapshotCatalog {
  packages: PackageMeta[];
  version: string;
}

export interface SearchRecord {
  category: string;
  description: string;
  docs: Partial<Record<DocPage, string>>;
  examples: Array<{ id: string; text: string }>;
  exports: string;
  keywords: string;
  name: string;
  related: string;
  slug: string;
  source: string | null;
}

export interface SnapshotPointer {
  directory: string;
}

export interface SnapshotManifest {
  catalog: 'catalog.json';
  contentDirectory: 'packages';
  refine: 'refine.json' | null;
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  search: 'search.json';
  version: string;
}

export interface SnapshotArtifacts {
  catalog: SnapshotCatalog;
  contents: ReadonlyMap<string, PackageContent>;
  manifest: SnapshotManifest;
  refineComponents: CemDeclaration[];
  search: SearchRecord[];
}
