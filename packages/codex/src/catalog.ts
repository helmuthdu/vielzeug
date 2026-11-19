import { CodexError } from './errors.js';
import type { Example, PackageEntry, PackageMeta, RefineComponent, Section, Snapshot, ThemeToken } from './types.js';

export type CatalogErrorCode = 'INVALID_ARG' | 'NOT_FOUND' | 'UNAVAILABLE';

export class CatalogError extends CodexError {
  readonly code: CatalogErrorCode;

  constructor(code: CatalogErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** One ranked search result: where the match lives and a short excerpt of it. */
export interface SearchHit {
  readonly heading: string;
  readonly page: string;
  readonly score: number;
  readonly section: string;
  readonly slug: string;
  readonly snippet: string;
}

/**
 * Plain functions over the loaded snapshot; the snapshot is immutable once read, so there are
 * no defensive copies. All lookups are O(1) map reads except `search`, which scans the section
 * index.
 */
export class Catalog {
  readonly components: readonly RefineComponent[];
  readonly packages: readonly PackageEntry[];
  readonly tokens: readonly ThemeToken[];
  readonly version: string;
  private readonly bySlug: Map<string, PackageEntry>;
  private readonly byTag: Map<string, RefineComponent>;

  constructor(snapshot: Snapshot) {
    this.version = snapshot.version;
    this.packages = snapshot.packages;
    this.components = snapshot.components;
    this.tokens = snapshot.tokens;
    this.bySlug = new Map(snapshot.packages.map((pkg) => [pkg.meta.slug, pkg]));
    this.byTag = new Map(snapshot.components.map((component) => [component.tag, component]));
  }

  requirePackage(slug: string): PackageEntry {
    const pkg = this.bySlug.get(slug);

    if (!pkg)
      throw new CatalogError(
        'NOT_FOUND',
        `Package "${slug}" not found. Available slugs: ${[...this.bySlug.keys()].join(', ')}`,
      );

    return pkg;
  }

  getPackage(slug: string): PackageEntry {
    return this.requirePackage(slug);
  }

  getMeta(slug: string): PackageMeta {
    return this.requirePackage(slug).meta;
  }

  getDocs(slug: string, page: string, section?: string): { markdown: string; pkg: PackageEntry; section?: Section } {
    const pkg = this.requirePackage(slug);
    const markdown = pkg.pages[page];

    if (markdown === undefined)
      throw new CatalogError(
        'NOT_FOUND',
        `No "${page}" page for "${slug}". Available: ${Object.keys(pkg.pages).sort().join(', ') || 'none'}.`,
      );

    if (section === undefined) return { markdown, pkg };

    const wanted = normalise(section);
    const match = pkg.sections.find(
      (item) => item.page === page && (normalise(item.heading) === wanted || headingSlug(item.heading) === wanted),
    );

    if (!match)
      throw new CatalogError(
        'NOT_FOUND',
        `No section "${section}" on "${slug}/${page}". Headings: ${pkg.sections
          .filter((item) => item.page === page)
          .map((item) => item.heading)
          .join(', ')}.`,
      );

    return { markdown: markdown.slice(match.start, match.end), pkg, section: match };
  }

  getExample(slug: string, exampleId: string): Example {
    const example = this.requirePackage(slug).examples.find((item) => item.id === exampleId);

    if (!example) throw new CatalogError('NOT_FOUND', `No example "${exampleId}" for "${slug}".`);

    return example;
  }

  getExport(slug: string, symbol: string) {
    const entry = this.requirePackage(slug).exports.find((item) => item.name === symbol);

    if (!entry)
      throw new CatalogError(
        'NOT_FOUND',
        `No exported symbol "${symbol}" for "${slug}". Run get-package for the full export list.`,
      );

    return entry;
  }

  getComponent(tag: string): RefineComponent {
    const component = this.byTag.get(tag);

    if (!component)
      throw new CatalogError(
        'NOT_FOUND',
        `Component "${tag}" not found. Run refine-list-components for the full tag list.`,
      );

    return component;
  }

  /**
   * Scores every section of every page. Every term must match inside the section: a term in the
   * heading weighs 3, a body term that is also an export name or keyword 2, a plain body term 1.
   * The ten best sections win, each reported with its exact location and a snippet.
   */
  search(query: string): SearchHit[] {
    const terms = normalise(query).split(/\s+/).filter(Boolean);

    if (terms.length === 0) throw new CatalogError('INVALID_ARG', 'query: required non-empty string.');

    const hits: SearchHit[] = [];

    for (const pkg of this.packages) {
      const names = normalise(
        `${pkg.exports.map((entry) => entry.name).join(' ')} ${pkg.meta.keywords.join(' ')} ${pkg.meta.related.join(' ')}`,
      );

      for (const section of pkg.sections) {
        const markdown = pkg.pages[section.page];
        const body = normalise(markdown.slice(section.start, section.end));
        const heading = normalise(section.heading);

        let score = 0;

        for (const term of terms) {
          if (heading.includes(term)) score += 3;
          else if (body.includes(term)) score += names.includes(term) ? 2 : 1;
          else {
            score = -1;
            break;
          }
        }

        if (score <= 0) continue;

        hits.push({
          heading: section.heading,
          page: section.page,
          score,
          section: headingSlug(section.heading),
          slug: pkg.meta.slug,
          snippet: snippet(markdown.slice(section.start, section.end)),
        });
      }
    }

    return hits
      .sort(
        (left, right) =>
          right.score - left.score || left.slug.localeCompare(right.slug) || left.page.localeCompare(right.page),
      )
      .slice(0, 10);
  }
}

function normalise(value: string): string {
  return value.toLowerCase().replaceAll('-', ' ');
}

/** A URL-style id for a heading; `get-docs` accepts either this id or the heading text. */
export function headingSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** A ~240-character excerpt starting at the section's first non-heading prose line. */
function snippet(sectionMarkdown: string): string {
  const lines = sectionMarkdown.split('\n');
  const body: string[] = [];

  for (const line of lines.slice(1)) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith('#') || trimmed.startsWith('```')) {
      if (body.length > 0) break;
      continue;
    }
    body.push(trimmed);
    if (body.join(' ').length >= 240) break;
  }

  const text = body.join(' ');

  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}
