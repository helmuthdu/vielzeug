import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CodexError } from './errors.js';
import { type LoadedSnapshot, parseContent } from './snapshot.js';
import type { CemDeclaration, DocPage, Example, PackageContent, PackageMeta, SearchRecord } from './types.js';

export type CatalogErrorCode = 'INVALID_ARG' | 'NOT_FOUND' | 'UNAVAILABLE';

export class CatalogError extends CodexError {
  readonly code: CatalogErrorCode;

  constructor(code: CatalogErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface SearchHit {
  matchedExamples?: string[];
  matchedIn: Array<'docs' | 'examples' | 'exports' | 'keywords' | 'metadata' | 'related' | 'source'>;
  matchedPages?: DocPage[];
  name: string;
  slug: string;
}

export interface Catalog {
  getComponent(tagName: string): CemDeclaration;
  getContent(slug: string): PackageContent;
  getDocs(slug: string, page: DocPage): string;
  getExample(slug: string, exampleId: string): Example;
  getPackage(slug: string): PackageMeta;
  getSource(slug: string): string;
  getTypeSignature(slug: string, symbol: string): string;
  listComponents(): CemDeclaration[];
  listExamples(slug: string): Array<Pick<Example, 'id' | 'name'>>;
  listPackages(): PackageMeta[];
  search(query: string): SearchHit[];
}

function matches(haystack: string, terms: readonly string[]): boolean {
  return terms.every((term) => haystack.includes(term));
}

interface RankedSearchHit {
  hit: SearchHit;
  tier: 0 | 1 | 2 | 3;
}

function searchRecord(record: SearchRecord, query: string): RankedSearchHit | null {
  const terms = query.toLowerCase().replaceAll('-', ' ').split(/\s+/).filter(Boolean);

  if (terms.length === 0) throw new CatalogError('INVALID_ARG', 'query: required non-empty string.');

  const matched = new Set<SearchHit['matchedIn'][number]>();
  const pages: DocPage[] = [];
  const examples: string[] = [];

  if (
    matches(record.name.toLowerCase(), terms) ||
    matches(record.category, terms) ||
    matches(record.description, terms)
  )
    matched.add('metadata');

  for (const field of ['keywords', 'exports', 'related', 'source'] as const) {
    if (record[field] && matches(record[field] ?? '', terms)) matched.add(field);
  }
  for (const [page, content] of Object.entries(record.docs) as Array<[DocPage, string]>) {
    if (matches(content, terms)) {
      matched.add('docs');
      pages.push(page);
    }
  }
  for (const example of record.examples) {
    if (matches(example.text, terms)) {
      matched.add('examples');
      examples.push(example.id);
    }
  }

  if (matched.size === 0) return null;

  const normalizedQuery = terms.join(' ');
  const normalizedName = record.name.toLowerCase().replaceAll('-', ' ');
  const normalizedSlug = record.slug.replaceAll('-', ' ');
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
      name: record.name,
      slug: record.slug,
    },
    tier,
  };
}

export class SnapshotCatalog implements Catalog {
  private readonly bySlug: Map<string, PackageMeta>;
  private readonly componentsByTag: Map<string, CemDeclaration>;
  private readonly contentCache = new Map<string, PackageContent>();
  private readonly snapshot: LoadedSnapshot;

  constructor(snapshot: LoadedSnapshot) {
    this.snapshot = snapshot;
    this.bySlug = new Map(snapshot.catalog.packages.map((pkg) => [pkg.slug, pkg]));
    this.componentsByTag = new Map(
      snapshot.refineComponents.flatMap((component) =>
        component.tagName ? [[component.tagName, component] as const] : [],
      ),
    );
  }

  getPackage(slug: string): PackageMeta {
    const pkg = this.bySlug.get(slug);

    if (!pkg)
      throw new CatalogError(
        'NOT_FOUND',
        `Package "${slug}" not found. Available slugs: ${[...this.bySlug.keys()].join(', ')}`,
      );

    return pkg;
  }

  getContent(slug: string): PackageContent {
    this.getPackage(slug);

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

  listPackages(): PackageMeta[] {
    return [...this.bySlug.values()];
  }

  getDocs(slug: string, page: DocPage): string {
    const content = this.getContent(slug).docs[page];

    if (!content)
      throw new CatalogError(
        'NOT_FOUND',
        `No "${page}" page for "${slug}". Available: ${this.getPackage(slug).availableDocPages.join(', ') || 'none'}.`,
      );

    return content;
  }

  getSource(slug: string): string {
    const source = this.getContent(slug).apiSource;

    if (!source) throw new CatalogError('UNAVAILABLE', `Package "${slug}" has no bundled source.`);

    return source;
  }

  listExamples(slug: string): Array<Pick<Example, 'id' | 'name'>> {
    return this.getContent(slug).examples.map(({ id, name }) => ({ id, name }));
  }

  getExample(slug: string, exampleId: string): Example {
    const example = this.getContent(slug).examples.find((item) => item.id === exampleId);

    if (!example) throw new CatalogError('NOT_FOUND', `No example "${exampleId}" for "${slug}".`);

    return example;
  }

  getTypeSignature(slug: string, symbol: string): string {
    const signature = this.getContent(slug).typeSignatures[symbol];

    if (!signature) throw new CatalogError('NOT_FOUND', `No exported symbol "${symbol}" for "${slug}".`);

    return signature;
  }

  search(query: string): SearchHit[] {
    return this.snapshot.search
      .map((record) => searchRecord(record, query))
      .filter((result): result is RankedSearchHit => result !== null)
      .sort((left, right) => left.tier - right.tier || left.hit.slug.localeCompare(right.hit.slug))
      .map((result) => result.hit);
  }

  listComponents(): CemDeclaration[] {
    if (this.snapshot.refineComponents.length === 0)
      throw new CatalogError('UNAVAILABLE', 'Refine component metadata is unavailable in this snapshot.');

    return this.snapshot.refineComponents;
  }

  getComponent(tagName: string): CemDeclaration {
    this.listComponents();

    const component = this.componentsByTag.get(tagName);

    if (!component) throw new CatalogError('NOT_FOUND', `Component "${tagName}" not found.`);

    return component;
  }
}
