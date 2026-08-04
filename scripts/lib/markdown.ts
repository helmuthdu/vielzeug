/**
 * Shared constrained Markdown model for repository tooling. One parser keeps documentation
 * validation and Codex metadata extraction aligned without coupling either to VitePress internals.
 */
export type FrontmatterValue = string | string[];

export interface MarkdownHeading {
  depth: number;
  line: number;
  text: string;
}

export interface MarkdownLink {
  line: number;
  target: string;
}

export interface MarkdownDocument {
  components: ReadonlySet<string>;
  frontmatter: Readonly<Record<string, FrontmatterValue>>;
  headings: readonly MarkdownHeading[];
  links: readonly MarkdownLink[];
  path: string;
  toc: boolean;
}

const BLOCKED_FRONTMATTER_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function parseArray(raw: string): string[] {
  return raw
    .slice(raw.indexOf('[') + 1, raw.lastIndexOf(']'))
    .split(',')
    .map((value) => value.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter(Boolean);
}

function parseFrontmatterLines(lines: readonly string[]): Record<string, FrontmatterValue> {
  const frontmatter: Record<string, FrontmatterValue> = {};

  for (let index = 0; index < lines.length; ) {
    const line = lines[index] ?? '';
    if (!line || line.trimStart().startsWith('#')) {
      index++;
      continue;
    }

    const match = /^([\w-]+):\s*(.*)$/.exec(line);
    if (!match || BLOCKED_FRONTMATTER_KEYS.has(match[1])) {
      index++;
      continue;
    }

    const [, key, rest] = match;
    if (rest.startsWith('[')) {
      let raw = rest;
      index++;
      while (!raw.trimEnd().endsWith(']') && index < lines.length) raw += `,${(lines[index++] ?? '').trim()}`;
      if (raw.includes(']')) frontmatter[key] = parseArray(raw);
      continue;
    }

    if (rest === '') {
      const next = lines[index + 1]?.trim() ?? '';
      if (next.startsWith('[')) {
        let raw = '';
        index++;
        while (index < lines.length) {
          const value = (lines[index++] ?? '').trim();
          raw += `${raw ? ',' : ''}${value}`;
          if (value.endsWith(']')) break;
        }
        if (raw.includes(']')) frontmatter[key] = parseArray(raw);
        continue;
      }

      const values: string[] = [];
      index++;
      while (index < lines.length) {
        const item = /^\s*-\s+(.+)$/.exec(lines[index] ?? '');
        if (!item) break;
        values.push(item[1].trim().replace(/^['"`]|['"`]$/g, ''));
        index++;
      }
      if (values.length > 0) frontmatter[key] = values;
      continue;
    }

    frontmatter[key] = rest.replace(/^['"`]|['"`]$/g, '');
    index++;
  }

  return frontmatter;
}

function frontmatterRange(lines: readonly string[]): { bodyStart: number; values: Record<string, FrontmatterValue> } {
  if (lines[0] !== '---') return { bodyStart: 0, values: {} };

  const end = lines.findIndex((line, index) => index > 0 && line === '---');
  if (end === -1) return { bodyStart: 0, values: {} };

  return { bodyStart: end + 1, values: parseFrontmatterLines(lines.slice(1, end)) };
}

function linksInLine(line: string, lineNumber: number): MarkdownLink[] {
  const links: MarkdownLink[] = [];

  for (let index = 0; index < line.length; index++) {
    if (line[index] !== ']' || line[index + 1] !== '(') continue;

    let cursor = index + 2;
    let depth = 1;
    let escaped = false;
    while (cursor < line.length && depth > 0) {
      const character = line[cursor++];
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '(') {
        depth++;
      } else if (character === ')') {
        depth--;
      }
    }
    if (depth !== 0) continue;

    const raw = line.slice(index + 2, cursor - 1).trim();
    const target = raw.startsWith('<') ? raw.slice(1, raw.indexOf('>')) : (raw.match(/^\S+/)?.[0] ?? '');
    if (target) links.push({ line: lineNumber, target });
    index = cursor - 1;
  }

  return links;
}

export function parseMarkdownDocument(path: string, source: string): MarkdownDocument {
  const lines = source.split(/\r?\n/);
  const { bodyStart, values } = frontmatterRange(lines);
  const components = new Set<string>();
  const headings: MarkdownHeading[] = [];
  const links: MarkdownLink[] = [];
  let toc = false;
  let fence: { character: '`' | '~'; length: number } | null = null;

  for (let index = bodyStart; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const character = fenceMatch[1][0] as '`' | '~';
      if (!fence) fence = { character, length: fenceMatch[1].length };
      else if (fence.character === character && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    if (line.trim() === '[[toc]]') toc = true;

    const heading = /^(#{1,6})[ \t]+(.+?)\s*#*\s*$/.exec(line);
    if (heading) headings.push({ depth: heading[1].length, line: index + 1, text: heading[2].trim() });

    for (const component of line.matchAll(/<([A-Z][\w.-]*)\b/g)) components.add(component[1]);
    links.push(...linksInLine(line, index + 1));
  }

  return { components, frontmatter: values, headings, links, path, toc };
}

export function parseFrontmatter(source: string): Record<string, FrontmatterValue> {
  return { ...parseMarkdownDocument('', source).frontmatter };
}
