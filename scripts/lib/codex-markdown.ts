/**
 * Markdown parsing shared by the Codex snapshot generator and the VitePress
 * `llms.txt` build. Kept under `scripts/lib/` because both the package script
 * and the docs site import it; the runtime package must not reach into it.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { parseFrontmatter } from './markdown.ts';

/**
 * Every `.md` file under `directory` as paths relative to it without the extension
 * (`index`, `components/button`). Files and folders starting with `_` or `.` are
 * private and never shipped.
 */
export function walkMarkdown(directory: string): string[] {
  if (!existsSync(directory)) return [];

  const pages: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;

    if (entry.isDirectory())
      pages.push(...walkMarkdown(join(directory, entry.name)).map((page) => `${entry.name}/${page}`));
    else if (entry.name.endsWith('.md')) pages.push(entry.name.slice(0, -3));
  }

  return pages.sort();
}

export interface DocFrontmatter {
  title: string;
  description: string;
  category: string;
  keywords: string[];
  related: string[];
}

export interface DocSection {
  /** Character offset (inclusive) into the page markdown as shipped. */
  start: number;
  /** Character offset (exclusive). */
  end: number;
  heading: string;
  level: number;
}

/**
 * Split markdown into `##`/`###` sections with character offsets into the
 * exact string that is shipped. Intro text before the first heading becomes a
 * section named after the page title.
 */
export function splitDocSections(markdown: string, fallbackTitle: string): DocSection[] {
  const lines = markdown.split('\n');
  const marks: { level: number; heading: string; start: number }[] = [];
  let offset = 0;
  let inFence = false;

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) inFence = !inFence;
    if (!inFence) {
      const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
      if (match) marks.push({ heading: match[2].trim(), level: match[1].length, start: offset });
    }
    offset += line.length + 1;
  }

  if (marks.length === 0) return [{ start: 0, end: markdown.length, heading: fallbackTitle, level: 2 }];

  const sections: DocSection[] = [];
  if (marks[0].start > 0) {
    sections.push({ start: 0, end: marks[0].start, heading: fallbackTitle, level: 2 });
  }
  for (let i = 0; i < marks.length; i += 1) {
    const end = i + 1 < marks.length ? marks[i + 1].start : markdown.length;
    sections.push({ start: marks[i].start, end, heading: marks[i].heading, level: marks[i].level });
  }
  return sections;
}

/** Frontmatter fields the snapshot keeps, with defaults for pages that omit them. */
export function readDocFrontmatter(markdown: string, fallbackTitle: string): DocFrontmatter {
  const data = parseFrontmatter(markdown);
  const list = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

  return {
    category: typeof data.category === 'string' ? data.category : '',
    description: typeof data.description === 'string' ? data.description : '',
    keywords: list(data.keywords),
    related: list(data.related),
    title: typeof data.title === 'string' && data.title.length > 0 ? data.title : fallbackTitle,
  };
}

/**
 * Convert a docs page into publishable text: frontmatter becomes a title and
 * blockquote, VitePress containers become headings, and the remaining markup
 * tokens are stripped.
 */
export function stripDocMarkup(markdown: string, pagePath = ''): string {
  const data = parseFrontmatter(markdown);
  const title = typeof data.title === 'string' ? data.title : '';
  const description = typeof data.description === 'string' ? data.description : '';
  let body = stripFrontmatterBlock(markdown);

  body = body.replace(/<script\b[\s\S]*?<\/script>/g, '');
  body = body.replace(/<style\b[\s\S]*?<\/style>/g, '');
  body = body.replace(/<ClientOnly\b[^>]*>/g, '').replace(/<\/ClientOnly>/g, '');
  body = body.replace(/<Badge\b[^>]*>([\s\S]*?)<\/Badge>/g, '$1');
  body = body.replace(/<CodeGroup\b[^>]*>/g, '').replace(/<\/CodeGroup>/g, '');
  body = body.replace(/<Steps\b[^>]*>/g, '').replace(/<\/Steps>/g, '');
  body = body.replace(/<Step\b[^>]*>([\s\S]*?)<\/Step>/g, (_m, inner: string) => `\n${inner.trim()}\n`);
  body = body.replace(/<Toc\b[^>]*\/?>(?:<\/Toc>)?/g, '');
  body = body.replace(/<Link\b[^>]*>([\s\S]*?)<\/Link>/g, '$1');

  // VitePress containers become headings with their title.
  body = body.replace(/^:::(\w+)(?:\s+(.*))?$/gm, (_m, name: string, titleArg: string | undefined) => {
    const label = titleArg?.trim();

    return label ? `#### ${name}: ${label}` : `#### ${name}`;
  });

  body = body.replace(/<!--[\s\S]*?-->/g, '');
  body = body.replace(/\{\{#[^}]*\}\}/g, '');
  body = body.replace(/\{\{|\}\}/g, '');
  body = body.replace(/^:::\s*$/gm, '');
  body = body.replace(/\[\[TOC\]\]/gi, '');

  // Markdown links keep their text and resolve relative docs links to GitHub.
  body = body.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_whole: string, text: string, href: string) => {
    if (/^[a-z]+:\/\//i.test(href) || href.startsWith('#')) return text ? `[${text}](${href})` : href;
    if (!pagePath) return text;
    const resolved = resolveDocsHref(pagePath, href);

    return resolved ? `[${text}](${resolved})` : text;
  });

  const header = [title ? `# ${title}` : '', description ? `> ${description}` : ''].filter(Boolean).join('\n\n');

  return `${header ? `${header}\n\n` : ''}${body.trim()}\n`;
}

const DOCS_BLOB_BASE = 'https://github.com/helmuthdu/vielzeug/blob/main';

/** Resolve a link found on `pagePath` (relative to the docs root) to a GitHub URL. */
export function resolveDocsHref(pagePath: string, href: string): string | null {
  const clean = href.split('#')[0].split('?')[0];

  if (!clean) return null;
  if (/^[a-z]+:\/\//i.test(clean)) return clean;
  if (clean.startsWith('/')) return `${DOCS_BLOB_BASE}${clean}`;

  const fromDir = pagePath.includes('/') ? pagePath.slice(0, pagePath.lastIndexOf('/')) : '';
  const parts = fromDir ? `${fromDir}/${clean}`.split('/') : clean.split('/');
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return `${DOCS_BLOB_BASE}/${stack.join('/')}`;
}

function stripFrontmatterBlock(markdown: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(markdown);

  return match ? markdown.slice(match[0].length) : markdown;
}
