import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CodexError } from './errors.js';
import { type LoadedSnapshot, parseContent } from './snapshot.js';
import type { CemDeclaration, DocPage, Example, PackageContent, PackageMeta } from './types.js';

export type CatalogErrorCode = 'INVALID_ARG' | 'NOT_FOUND' | 'UNAVAILABLE';

export class CatalogError extends CodexError {
  readonly code: CatalogErrorCode;

  constructor(code: CatalogErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface SearchHit {
  readonly matchedExamples?: readonly string[];
  readonly matchedIn: readonly ('docs' | 'examples' | 'exports' | 'keywords' | 'metadata' | 'related' | 'source')[];
  readonly matchedPages?: readonly DocPage[];
  readonly name: string;
  readonly slug: string;
}

/**
 * The query surface every consumer (MCP tools, embedders) codes against. `search` reads package
 * content chunks lazily through the same cache as the content getters, so there is no separate
 * search index to keep in sync.
 */
export interface Catalog {
  getComponent(tagName: string): CemDeclaration;
  getDocs(slug: string, page: DocPage): string;
  getExample(slug: string, exampleId: string): Example;
  getPackage(slug: string): PackageMeta;
  getSource(slug: string): string;
  getTypeSignature(slug: string, symbol: string): string;
  listComponents(): readonly CemDeclaration[];
  listExamples(slug: string): readonly Pick<Example, 'id' | 'name'>[];
  listPackages(): readonly PackageMeta[];
  search(query: string): readonly SearchHit[];
}

function matches(haystack: string, terms: readonly string[]): boolean {
  return terms.every((term) => haystack.includes(term));
}

function normalise(value: string): string {
  return value.toLowerCase().replaceAll('-', ' ');
}

function copyPackage(pkg: PackageMeta): PackageMeta {
  return {
    ...pkg,
    availableDocPages: [...pkg.availableDocPages],
    exampleIds: [...pkg.exampleIds],
    exports: [...pkg.exports],
    keywords: [...pkg.keywords],
    related: [...pkg.related],
  };
}

interface RankedSearchHit {
  hit: SearchHit;
  tier: 0 | 1 | 2 | 3;
}

export class SnapshotCatalog implements Catalog {
  private readonly bySlug: Map<string, PackageMeta>;
  private readonly componentsByTag: Map<string, CemDeclaration>;
  private readonly components: readonly CemDeclaration[];
  private readonly contentCache = new Map<string, PackageContent>();
  private readonly snapshot: LoadedSnapshot;

  constructor(snapshot: LoadedSnapshot) {
    this.snapshot = snapshot;
    this.bySlug = new Map(snapshot.catalog.packages.map((pkg) => [pkg.slug, pkg]));
    this.components = snapshot.refineComponents;
    this.componentsByTag = new Map(
      this.components.flatMap((component) => (component.tagName ? [[component.tagName, component] as const] : [])),
    );
  }

  private requirePackage(slug: string): PackageMeta {
    const pkg = this.bySlug.get(slug);

    if (!pkg)
      throw new CatalogError(
        'NOT_FOUND',
        `Package "${slug}" not found. Available slugs: ${[...this.bySlug.keys()].join(', ')}`,
      );

    return pkg;
  }

  getPackage(slug: string): PackageMeta {
    return copyPackage(this.requirePackage(slug));
  }

  listComponents(): readonly CemDeclaration[] {
    return this.components.map((component) => structuredClone(component));
  }

  getComponent(tagName: string): CemDeclaration {
    const component = this.componentsByTag.get(tagName);

    if (!component) throw new CatalogError('NOT_FOUND', `Component "${tagName}" not found.`);

    return structuredClone(component);
  }

  private readContent(slug: string): PackageContent {
    this.requirePackage(slug);

    const cached = this.contentCache.get(slug);

    if (cached) return cached;

    const path = resolve(this.snapshot.contentDirectory, `${slug}.json`);
    let content: PackageContent;

    try {
      content = parseContent(JSON.parse(readFileSync(path, 'utf8')), slug);
    } catch (error) {
      if (error instanceof CodexError) throw error;

      throw new CodexError(
        `Failed to read snapshot content for ${slug}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    this.contentCache.set(slug, content);

    return content;
  }

  listPackages(): readonly PackageMeta[] {
    return [...this.bySlug.values()].map(copyPackage);
  }

  getDocs(slug: string, page: DocPage): string {
    const content = this.readContent(slug).docs[page];

    if (content === undefined)
      throw new CatalogError(
        'NOT_FOUND',
        `No "${page}" page for "${slug}". Available: ${this.requirePackage(slug).availableDocPages.join(', ') || 'none'}.`,
      );

    return content;
  }

  getSource(slug: string): string {
    const source = this.readContent(slug).apiSource;

    if (source === null) throw new CatalogError('UNAVAILABLE', `Package "${slug}" has no bundled source.`);

    return source;
  }

  listExamples(slug: string): readonly Pick<Example, 'id' | 'name'>[] {
    return this.readContent(slug).examples.map(({ id, name }) => ({ id, name }));
  }

  getExample(slug: string, exampleId: string): Example {
    const example = this.readContent(slug).examples.find((item) => item.id === exampleId);

    if (!example) throw new CatalogError('NOT_FOUND', `No example "${exampleId}" for "${slug}".`);

    return { ...example };
  }

  getTypeSignature(slug: string, symbol: string): string {
    const signature = this.readContent(slug).typeSignatures[symbol];

    if (signature === undefined) throw new CatalogError('NOT_FOUND', `No exported symbol "${symbol}" for "${slug}".`);

    return signature;
  }

  search(query: string): readonly SearchHit[] {
    const terms = normalise(query).split(/\s+/).filter(Boolean);

    if (terms.length === 0) throw new CatalogError('INVALID_ARG', 'query: required non-empty string.');

    const ranked: RankedSearchHit[] = [];

    for (const pkg of this.snapshot.catalog.packages) {
      const hit = this.searchPackage(pkg, terms);

      if (hit) ranked.push(hit);
    }

    return ranked
      .sort((left, right) => left.tier - right.tier || left.hit.slug.localeCompare(right.hit.slug))
      .map((result) => result.hit);
  }

  private searchPackage(pkg: PackageMeta, terms: readonly string[]): RankedSearchHit | null {
    const matched = new Set<SearchHit['matchedIn'][number]>();
    const pages: DocPage[] = [];
    const examples: string[] = [];

    if (
      matches(normalise(pkg.name), terms) ||
      matches(normalise(pkg.category), terms) ||
      matches(normalise(pkg.description), terms)
    )
      matched.add('metadata');

    const fields: Array<['keywords' | 'exports' | 'related', string]> = [
      ['keywords', pkg.keywords.join(' ')],
      ['exports', pkg.exports.join(' ')],
      ['related', pkg.related.join(' ')],
    ];

    for (const [field, value] of fields) if (matches(normalise(value), terms)) matched.add(field);

    const content = this.readContent(pkg.slug);

    for (const [page, value] of Object.entries(content.docs) as Array<[DocPage, string]>) {
      if (matches(normalise(value), terms)) {
        matched.add('docs');
        pages.push(page);
      }
    }
    for (const example of content.examples) {
      if (matches(normalise(`${example.name} ${example.code}`), terms)) {
        matched.add('examples');
        examples.push(example.id);
      }
    }
    if (content.apiSource !== null && matches(normalise(content.apiSource), terms)) matched.add('source');

    if (matched.size === 0) return null;

    const normalizedQuery = terms.join(' ');
    const normalizedName = normalise(pkg.name);
    const normalizedSlug = normalise(pkg.slug);
    const tier =
      normalizedSlug === normalizedQuery || normalizedName === normalizedQuery
        ? 0
        : normalizedSlug.startsWith(normalizedQuery) || normalizedName.startsWith(normalizedQuery)
          ? 1
          : matched.has('metadata') || matched.has('keywords') || matched.has('exports') || matched.has('related')
            ? 2
            : 3;

    return {
      hit: {
        ...(examples.length > 0 && { matchedExamples: examples }),
        matchedIn: [...matched].sort(),
        ...(pages.length > 0 && { matchedPages: pages }),
        name: pkg.name,
        slug: pkg.slug,
      },
      tier,
    };
  }
}
