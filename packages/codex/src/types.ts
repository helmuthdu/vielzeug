/**
 * The snapshot contract shared by the generator (`scripts/`) and the runtime (`src/`).
 * One `data/snapshot.json` carries everything the server serves; metadata the server can
 * derive from content (page lists, example ids, export names) is never stored beside it.
 */

/** Documentation pages keyed by path relative to `docs/<slug>/` without the `.md` extension (`index`, `migration`, `components/button`). */
export type PageMap = Readonly<Record<string, string>>;

/**
 * One heading-delimited section of a docs page. `start`/`end` are offsets into the stored
 * page markdown, computed at generate time against the exact shipped string.
 */
export interface Section {
  readonly end: number;
  /** Heading text without leading `#`s; the section before the first heading uses the page title. */
  readonly heading: string;
  readonly level: 2 | 3;
  readonly page: string;
  readonly start: number;
}

/** One public export of a package, resolved through the TypeScript checker at generate time. */
export interface ExportEntry {
  /** The export's JSDoc summary, when the declaration carries one. */
  readonly doc?: string;
  readonly kind: 'class' | 'const' | 'function' | 'interface' | 'type' | 'variable';
  readonly name: string;
  /** The declaration text including JSDoc, as written in source. */
  readonly signature: string;
}

export interface Example {
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface PackageMeta {
  readonly category: string;
  readonly description: string;
  readonly keywords: readonly string[];
  readonly name: string;
  readonly related: readonly string[];
  readonly slug: string;
  readonly version: string;
}

/** Everything one package contributes to the snapshot. */
export interface PackageEntry {
  readonly examples: readonly Example[];
  /** The package's real public exports; this list replaces any hand-curated one. */
  readonly exports: readonly ExportEntry[];
  readonly meta: PackageMeta;
  readonly pages: PageMap;
  readonly sections: readonly Section[];
  /** Page title from each page's frontmatter, keyed like `pages`. */
  readonly titles: Readonly<Record<string, string>>;
}

export interface RefineAttribute {
  readonly default?: string;
  readonly description?: string;
  readonly name: string;
  /** The CEM type text, e.g. `'primary' | 'ghost'` or `'boolean'`. */
  readonly type?: string;
}

export interface RefineComponent {
  readonly attributes?: readonly RefineAttribute[];
  readonly cssParts?: readonly { readonly description?: string; readonly name: string }[];
  readonly cssProperties?: readonly {
    readonly default?: string;
    readonly description?: string;
    readonly name: string;
  }[];
  /** Docs page carrying this component's examples, e.g. `components/button`. */
  readonly docPage?: string;
  readonly events?: readonly { readonly description?: string; readonly name: string; readonly type?: string }[];
  readonly slots?: readonly { readonly description?: string; readonly name: string }[];
  readonly summary?: string;
  readonly tag: string;
}

/** One theme custom property from `packages/refine/src/styles/theme.css`. */
export interface ThemeToken {
  readonly comment?: string;
  readonly name: string;
  readonly value: string;
}

export interface Snapshot {
  /** Element declarations only; non-custom-element CEM declarations are projected out. */
  readonly components: readonly RefineComponent[];
  readonly packages: readonly PackageEntry[];
  readonly tokens: readonly ThemeToken[];
  /** The codex package version this snapshot was generated from. */
  readonly version: string;
}
