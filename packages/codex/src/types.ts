export const DOC_PAGES = ['index', 'api', 'usage', 'examples'] as const;
export type DocPage = (typeof DOC_PAGES)[number];

export const SNAPSHOT_SCHEMA_VERSION = 2 as const;

export interface CemTypeRef {
  readonly text: string;
}

export interface CemAttribute {
  readonly default?: string;
  readonly description?: string;
  readonly fieldName?: string;
  readonly name: string;
  readonly type?: CemTypeRef;
}

export interface CemCssPart {
  readonly description?: string;
  readonly name: string;
}

export interface CemCssProperty {
  readonly default?: string;
  readonly description?: string;
  readonly name: string;
}

export interface CemEvent {
  readonly description?: string;
  readonly name: string;
  readonly type?: CemTypeRef;
}

export interface CemMember {
  readonly description?: string;
  readonly kind?: 'field' | 'method';
  readonly name: string;
  readonly type?: CemTypeRef;
}

export interface CemSlot {
  readonly description?: string;
  readonly name: string;
}

export interface CemDeclaration {
  readonly attributes?: readonly CemAttribute[];
  readonly cssParts?: readonly CemCssPart[];
  readonly cssProperties?: readonly CemCssProperty[];
  readonly description?: string;
  readonly events?: readonly CemEvent[];
  readonly members?: readonly CemMember[];
  readonly name?: string;
  readonly slots?: readonly CemSlot[];
  readonly superclass?: { readonly name: string; readonly package?: string };
  readonly tagName?: string;
  readonly [key: string]: unknown;
}

export interface Example {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface PackageMeta {
  readonly availableDocPages: readonly DocPage[];
  readonly category: string;
  readonly description: string;
  readonly exampleIds: readonly string[];
  readonly exports: readonly string[];
  readonly hasSource: boolean;
  readonly keywords: readonly string[];
  readonly name: string;
  readonly related: readonly string[];
  readonly slug: string;
  readonly version: string;
}

export interface PackageContent {
  readonly apiSource: string | null;
  readonly docs: Readonly<Partial<Record<DocPage, string>>>;
  readonly examples: readonly Example[];
  readonly typeSignatures: Readonly<Record<string, string>>;
}

export interface CatalogFile {
  readonly packages: readonly PackageMeta[];
  readonly version: string;
}

/** Layout filenames (`catalog.json`, `packages/`, `refine.json`) are code constants; the manifest carries data only. */
export interface SnapshotManifest {
  readonly schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  readonly version: string;
}
