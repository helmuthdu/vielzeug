import { warn } from './_dev';
import { sanitizeDestination } from './_policy';
import { inlineText } from './_text';
import { ScribeLimitError } from './errors';
import type {
  ProseAlignment,
  ProseBlock,
  ProseCodeSpan,
  ProseDoc,
  ProseEmphasis,
  ProseHardBreak,
  ProseHeading,
  ProseHeadingLevel,
  ProseImage,
  ProseInline,
  ProseLink,
  ProseList,
  ProseListItem,
  ProseParagraph,
  ProseParseOptions,
  ProseSoftBreak,
  ProseStrikethrough,
  ProseStrong,
  ProseTable,
  ProseTableCell,
  ProseText,
  ProseThematicBreak,
} from './types';

/** Inputs beyond this size are rejected outright; prose documents never reach it. */
const MAX_INPUT_LENGTH = 200_000;
/** Block/inline nesting (blockquote in list in blockquote …) is bounded to keep recursion shallow. */
const MAX_DEPTH = 32;
const DEFAULT_PROTOCOLS: readonly string[] = ['http', 'https', 'mailto'];

interface Ctx {
  depth: number;
  readonly protocols: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// Block-level patterns (indentation is counted in expanded-tab columns)
// ---------------------------------------------------------------------------

const RE_BLANK = /^[ \t]*$/;
const RE_FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const RE_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RE_HR = /^(?: {0,3}(?:\*[ \t]*){3,}| {0,3}(?:-[ \t]*){3,}| {0,3}(?:_[ \t]*){3,})$/;
const RE_QUOTE = /^ {0,3}>[ \t]?(.*)$/;
const RE_UL = /^( {0,3})([-+*])([ \t]+)(.*)$/;
const RE_OL = /^( {0,3})(\d{1,9})([.)])([ \t]+)(.*)$/;
const RE_TABLE_DELIM = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const RE_LANG = /^[\p{L}\p{N}_-]+/u;

function indentOf(line: string): number {
  let column = 0;
  for (const char of line) {
    if (char === ' ') column += 1;
    else if (char === '\t') column += 4;
    else break;
  }
  return column;
}

function isTableStart(lines: readonly string[], index: number): boolean {
  return lines[index].includes('|') && lines[index + 1] !== undefined && RE_TABLE_DELIM.test(lines[index + 1]);
}

/** Split a GFM table row on unescaped pipes, dropping one optional leading/trailing pipe. */
function splitCells(row: string): string[] {
  let text = row.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1);
  const cells: string[] = [];
  let cell = '';
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '\\' && text[i + 1] === '|') {
      cell += '|';
      i += 1;
    } else if (char === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseDelimAlignments(delimiterRow: string): ProseAlignment[] {
  return splitCells(delimiterRow).map((cell) => {
    if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
    if (cell.endsWith(':')) return 'right';
    return 'left';
  });
}

// ---------------------------------------------------------------------------
// Block parser
// ---------------------------------------------------------------------------

function parseBlocks(lines: readonly string[], ctx: Ctx): ProseBlock[] {
  ctx.depth += 1;
  if (ctx.depth > MAX_DEPTH) {
    throw new ScribeLimitError(`block nesting exceeds the ${MAX_DEPTH}-level limit`);
  }
  const blocks: ProseBlock[] = [];
  let paragraph: string[] = [];
  let i = 0;

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return;
    const node: ProseParagraph = { children: parseInline(paragraph.join('\n'), ctx), type: 'paragraph' };
    blocks.push(node);
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (RE_BLANK.test(line)) {
      flushParagraph();
      i += 1;
      continue;
    }

    const fence = RE_FENCE.exec(line);
    if (fence) {
      flushParagraph();
      const marker = fence[1];
      const fenceIndent = fence[0].indexOf(marker[0]);
      const lang = RE_LANG.exec(fence[2].trim())?.[0];
      const closeRe = new RegExp(`^ {0,3}\\${marker[0]}{${marker.length},}[ \\t]*$`);
      const content: string[] = [];
      i += 1;
      while (i < lines.length && !closeRe.test(lines[i])) {
        content.push(lines[i].slice(Math.min(indentOf(lines[i]), fenceIndent)));
        i += 1;
      }
      i += 1; // closing fence (or EOF)
      blocks.push(
        lang === undefined
          ? { text: content.join('\n'), type: 'codeBlock' }
          : { language: lang, text: content.join('\n'), type: 'codeBlock' },
      );
      continue;
    }

    const heading = RE_HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        children: parseInline(heading[2] ?? '', ctx),
        level: heading[1].length as ProseHeadingLevel,
        type: 'heading',
      } satisfies ProseHeading);
      i += 1;
      continue;
    }

    if (RE_HR.test(line)) {
      flushParagraph();
      blocks.push({ type: 'thematicBreak' } satisfies ProseThematicBreak);
      i += 1;
      continue;
    }

    if (RE_QUOTE.test(line)) {
      flushParagraph();
      const quoted: string[] = [];
      while (i < lines.length) {
        const quote = RE_QUOTE.exec(lines[i]);
        if (quote === null) break;
        quoted.push(quote[1]);
        i += 1;
      }
      blocks.push({ children: parseBlocks(quoted, ctx), type: 'blockquote' });
      continue;
    }

    const marker = matchListMarker(line);
    // A bullet list, or an ordered list starting at 1, may start (and interrupt a paragraph);
    // a line like `2. more` right below a paragraph is a paragraph continuation.
    if (marker !== null && (!marker.ordered || marker.start === 1 || paragraph.length === 0)) {
      flushParagraph();
      const list = parseList(lines, i, ctx, marker);
      blocks.push(list.block);
      i = list.next;
      continue;
    }

    if (paragraph.length === 0 && indentOf(line) >= 4) {
      const content: string[] = [];
      while (i < lines.length && (RE_BLANK.test(lines[i]) || indentOf(lines[i]) >= 4)) {
        if (RE_BLANK.test(lines[i]) && !(i + 1 < lines.length && indentOf(lines[i + 1]) >= 4)) break;
        content.push(lines[i].slice(4));
        i += 1;
      }
      blocks.push({ text: content.join('\n'), type: 'codeBlock' });
      continue;
    }

    if (paragraph.length === 0 && isTableStart(lines, i)) {
      const header = splitCells(lines[i]);
      const alignments = parseDelimAlignments(lines[i + 1]);
      i += 2;
      const rows: ProseTableCell[][] = [];
      while (i < lines.length && !RE_BLANK.test(lines[i]) && lines[i].includes('|')) {
        const cells = splitCells(lines[i]);
        while (cells.length < alignments.length) cells.push('');
        rows.push(cells.slice(0, alignments.length).map((cell) => [...parseInline(cell, ctx)]));
        i += 1;
      }
      blocks.push({
        alignments,
        header: header
          .slice(0, alignments.length)
          .map((cell) => [...parseInline(cell, ctx)]) satisfies ProseTableCell[],
        rows,
        type: 'table',
      } satisfies ProseTable);
      continue;
    }

    paragraph.push(line);
    i += 1;
  }

  flushParagraph();
  ctx.depth -= 1;
  return blocks;
}

interface ListMarker {
  /** Leading spaces before the marker, in expanded columns. */
  readonly indent: number;
  /** The bullet char (`-`, `+`, `*`) or the ordered delimiter (`.` or `)`). */
  readonly kind: string;
  readonly ordered: boolean;
  /** Spaces between marker and content. */
  readonly spaces: number;
  readonly start: number;
  /** Total marker width (`-` = 1, `12.` = 3). */
  readonly width: number;
}

function matchListMarker(line: string): ListMarker | null {
  const ul = RE_UL.exec(line);
  if (ul !== null) {
    return { indent: ul[1].length, kind: ul[2], ordered: false, spaces: ul[3].length, start: 1, width: 1 };
  }
  const ol = RE_OL.exec(line);
  if (ol !== null) {
    return {
      indent: ol[1].length,
      kind: ol[3],
      ordered: true,
      spaces: ol[4].length,
      start: Number(ol[2]),
      width: ol[2].length + 1,
    };
  }
  return null;
}

function sameMarker(a: ListMarker, b: ListMarker): boolean {
  return a.ordered === b.ordered && a.kind === b.kind;
}

function parseList(
  lines: readonly string[],
  start: number,
  ctx: Ctx,
  initial: ListMarker,
): { block: ProseList; next: number } {
  // Content column after the marker; >=5 spaces after the marker keep an extra indent so the
  // first line can still be an indented code block, matching CommonMark's tab rule.
  const contentIndent = initial.indent + initial.width + (initial.spaces >= 5 ? 1 : initial.spaces);

  const items: ProseListItem[] = [];
  let loose = false;
  let pendingBlanks = 0;
  let current: string[] | null = null;
  let i = start;

  while (i < lines.length) {
    const line = lines[i];

    if (RE_BLANK.test(line)) {
      if (current !== null) pendingBlanks += 1;
      i += 1;
      continue;
    }

    // A marker strictly left of the content column is a sibling item; one at or beyond the
    // content column is item content (a nested list).
    const marker = indentOf(line) < contentIndent ? matchListMarker(line) : null;
    const isItemStart = marker !== null && sameMarker(marker, initial) && (current === null || i > start);

    if (isItemStart && current !== null) {
      if (pendingBlanks > 0) loose = true;
      items.push({ children: parseBlocks(current, ctx), type: 'listItem' });
      current = null;
    }

    if (isItemStart) {
      current = [line.slice(contentIndent)];
      pendingBlanks = 0;
      i += 1;
      continue;
    }

    if (current !== null && indentOf(line) >= contentIndent) {
      if (pendingBlanks > 0) loose = true;
      pendingBlanks = 0;
      current.push(line.slice(contentIndent));
      i += 1;
      continue;
    }

    break; // no lazy continuation: the list ends here
  }

  if (current !== null) {
    items.push({ children: parseBlocks(current, ctx), type: 'listItem' });
  }

  return {
    block: {
      items,
      ordered: initial.ordered,
      start: initial.start,
      tight: !loose,
      type: 'list',
    } satisfies ProseList,
    next: i,
  };
}

// ---------------------------------------------------------------------------
// Inline parser
// ---------------------------------------------------------------------------

interface DelimTok {
  readonly canClose: boolean;
  readonly canOpen: boolean;
  readonly char: '*' | '_' | '~';
  count: number;
  readonly kind: 'delim';
}

type Tok = ProseInline | DelimTok;

const isDelim = (token: Tok): token is DelimTok => 'kind' in token;
const RE_PUNCT = /[\p{P}\p{S}]/u;

function parseInline(src: string, ctx: Ctx): ProseInline[] {
  ctx.depth += 1;
  if (ctx.depth > MAX_DEPTH) {
    throw new ScribeLimitError(`inline nesting exceeds the ${MAX_DEPTH}-level limit`);
  }
  const tokens: Tok[] = [];
  let buffer = '';

  const flush = (): void => {
    if (buffer === '') return;
    tokens.push({ text: buffer, type: 'text' } satisfies ProseText);
    buffer = '';
  };

  const linkLike = (at: number): { label: string; dest: string; title?: string; end: number } | null => {
    if (src[at] !== '[') return null;
    let depth = 0;
    let close = -1;
    for (let k = at; k < src.length; k += 1) {
      if (src[k] === '\\') k += 1;
      else if (src[k] === '[') depth += 1;
      else if (src[k] === ']') {
        depth -= 1;
        if (depth === 0) {
          close = k;
          break;
        }
      }
    }
    if (close === -1 || src[close + 1] !== '(') return null;
    let j = close + 2;
    let dest = '';
    let title: string | undefined;
    if (src[j] === '<') {
      const angleEnd = src.indexOf('>', j + 1);
      if (angleEnd === -1) return null;
      dest = src.slice(j + 1, angleEnd);
      j = angleEnd + 1;
    } else {
      let parenDepth = 0;
      while (j < src.length && !/\s/.test(src[j])) {
        if (src[j] === ')' && parenDepth === 0) break;
        if (src[j] === '(') parenDepth += 1;
        else if (src[j] === ')') parenDepth -= 1;
        dest += src[j];
        j += 1;
      }
    }
    const quoted = /^\s+(['"])(.*?)\1\s*\)/.exec(src.slice(j));
    if (quoted !== null) {
      title = quoted[2];
      j += quoted[0].length;
    } else {
      const bare = /^\s*\)/.exec(src.slice(j));
      if (bare === null) return null;
      j += bare[0].length;
    }
    return { dest, end: j, label: src.slice(at + 1, close), title };
  };

  let i = 0;
  while (i < src.length) {
    const char = src[i];

    if (char === '\\' && RE_PUNCT.test(src[i + 1] ?? '')) {
      buffer += src[i + 1];
      i += 2;
      continue;
    }
    if (char === '\\' && src[i + 1] === '\n') {
      flush();
      tokens.push({ type: 'hardBreak' } satisfies ProseHardBreak);
      i += 2;
      continue;
    }

    if (char === '`') {
      let run = 0;
      while (src[i + run] === '`') run += 1;
      const rest = src.slice(i + run);
      const closeRe = new RegExp(`(?<!\`)\`{${run}}(?!\`)`);
      const found = closeRe.exec(rest);
      if (found !== null) {
        let content = rest.slice(0, found.index);
        if (content.length >= 2 && content.startsWith(' ') && content.endsWith(' ') && !/^ +$/.test(content)) {
          content = content.slice(1, -1);
        }
        flush();
        tokens.push({ text: content, type: 'codeSpan' } satisfies ProseCodeSpan);
        i += run + found.index + run;
        continue;
      }
      buffer += '`'.repeat(run);
      i += run;
      continue;
    }

    if (char === '<') {
      const email = /^<([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>/.exec(src.slice(i));
      if (email !== null) {
        const mailto = `mailto:${email[1]}`;
        if (sanitizeDestination(mailto, ctx.protocols) !== null) {
          flush();
          tokens.push({
            children: [{ text: email[1], type: 'text' }],
            href: mailto,
            type: 'link',
          } satisfies ProseLink);
          i += email[0].length;
          continue;
        }
        warn(`rejected autolink destination "${mailto}"`);
      }
      const autolink = /^<([A-Za-z][A-Za-z0-9+.-]*:[^<>\n]*)>/.exec(src.slice(i));
      if (autolink !== null) {
        const href = sanitizeDestination(autolink[1], ctx.protocols);
        if (href !== null) {
          flush();
          tokens.push({
            children: [{ text: autolink[1], type: 'text' }],
            href,
            type: 'link',
          } satisfies ProseLink);
          i += autolink[0].length;
          continue;
        }
        warn(`rejected autolink destination "${autolink[1]}"`);
        buffer += '<';
        i += 1;
        continue;
      }
      buffer += '<';
      i += 1;
      continue;
    }

    if ((char === '!' && src[i + 1] === '[') || char === '[') {
      const at = char === '!' ? i + 1 : i;
      const parsed = linkLike(at);
      if (parsed !== null) {
        const href = sanitizeDestination(parsed.dest, ctx.protocols);
        flush();
        if (href !== null) {
          if (char === '!') {
            const image: ProseImage = { alt: inlineText(parseInline(parsed.label, ctx)), src: href, type: 'image' };
            tokens.push(parsed.title === undefined ? image : { ...image, title: parsed.title });
          } else {
            const link: ProseLink = { children: parseInline(parsed.label, ctx), href, type: 'link' };
            tokens.push(parsed.title === undefined ? link : { ...link, title: parsed.title });
          }
        } else {
          warn(`rejected link destination "${parsed.dest}"`);
          if (char === '!') {
            tokens.push({ text: inlineText(parseInline(parsed.label, ctx)), type: 'text' } satisfies ProseText);
          } else {
            tokens.push(...parseInline(parsed.label, ctx));
          }
        }
        i = parsed.end;
        continue;
      }
      buffer += char;
      i += 1;
      continue;
    }

    if (char === '*' || char === '_' || char === '~') {
      let run = 0;
      while (src[i + run] === char) run += 1;
      if (char !== '~' || run === 2) {
        const prev = i === 0 ? ' ' : src[i - 1];
        const next = src[i + run] ?? ' ';
        const leftFlanking = !/\s/.test(next) && (!RE_PUNCT.test(next) || /\s/.test(prev) || RE_PUNCT.test(prev));
        const rightFlanking = !/\s/.test(prev) && (!RE_PUNCT.test(prev) || /\s/.test(next) || RE_PUNCT.test(next));
        const canOpen = char === '_' ? leftFlanking && (!rightFlanking || RE_PUNCT.test(prev)) : leftFlanking;
        const canClose = char === '_' ? rightFlanking && (!leftFlanking || RE_PUNCT.test(next)) : rightFlanking;
        if (canOpen || canClose) {
          flush();
          tokens.push({ canClose, canOpen, char, count: run, kind: 'delim' });
          i += run;
          continue;
        }
      }
      buffer += char.repeat(run);
      i += run;
      continue;
    }

    if ((char === 'h' || char === 'H') && (i === 0 || /[\s_([{]/.test(src[i - 1]))) {
      const bare = /^https?:\/\/\S+/.exec(src.slice(i));
      if (bare !== null) {
        let url = bare[0].replace(/[.,;:!?]+$/, '');
        if (url.endsWith(')') && !url.includes('(')) url = url.slice(0, -1);
        const href = sanitizeDestination(url, ctx.protocols);
        if (href !== null) {
          flush();
          tokens.push({ children: [{ text: url, type: 'text' }], href, type: 'link' } satisfies ProseLink);
          i += url.length;
          continue;
        }
      }
    }

    if (char === '\n') {
      const trailing = /[ \t]*$/.exec(buffer)?.[0] ?? '';
      if (trailing !== '') buffer = buffer.slice(0, -trailing.length);
      flush();
      tokens.push(
        (trailing.length >= 2 ? { type: 'hardBreak' } : { type: 'softBreak' }) satisfies
          | ProseHardBreak
          | ProseSoftBreak,
      );
      i += 1;
      continue;
    }

    buffer += char;
    i += 1;
  }

  flush();
  const resolved = resolveEmphasis(tokens);
  ctx.depth -= 1;
  return mergeText(resolved);
}

/** Match delimiter runs left-to-right; leftover delimiters become literal text. */
function resolveEmphasis(tokens: Tok[]): ProseInline[] {
  for (let ci = 0; ci < tokens.length; ci += 1) {
    const closer = tokens[ci];
    if (!isDelim(closer) || !closer.canClose || closer.count === 0) continue;
    for (let oi = ci - 1; oi >= 0; oi -= 1) {
      const opener = tokens[oi];
      if (!isDelim(opener) || !opener.canOpen || opener.count === 0 || opener.char !== closer.char) continue;
      if (closer.char === '~' && (opener.count !== 2 || closer.count !== 2)) continue;
      const strong = closer.char !== '~' && opener.count >= 2 && closer.count >= 2;
      const consumed = closer.char === '~' ? 2 : strong ? 2 : 1;
      const inner = resolveRemainder(tokens.slice(oi + 1, ci));
      const wrapped: ProseStrong | ProseEmphasis | ProseStrikethrough = strong
        ? { children: inner, type: 'strong' }
        : closer.char === '~'
          ? { children: inner, type: 'strikethrough' }
          : { children: inner, type: 'emphasis' };
      const replacement: Tok[] = [];
      if (opener.count > consumed) {
        replacement.push({
          canClose: false,
          canOpen: true,
          char: opener.char,
          count: opener.count - consumed,
          kind: 'delim',
        });
      }
      replacement.push(wrapped);
      if (closer.count > consumed) {
        replacement.push({
          canClose: true,
          canOpen: false,
          char: closer.char,
          count: closer.count - consumed,
          kind: 'delim',
        });
      }
      tokens.splice(oi, ci - oi + 1, ...replacement);
      ci = oi - 1;
      break;
    }
  }
  return resolveRemainder(tokens);
}

function resolveRemainder(tokens: readonly Tok[]): ProseInline[] {
  const out: ProseInline[] = [];
  for (const token of tokens) {
    if (isDelim(token)) {
      if (token.count > 0) out.push({ text: token.char.repeat(token.count), type: 'text' });
      continue;
    }
    out.push(token);
  }
  return mergeText(out);
}

function mergeText(nodes: readonly ProseInline[]): ProseInline[] {
  const out: ProseInline[] = [];
  for (const node of nodes) {
    const last = out[out.length - 1];
    if (node.type === 'text' && last !== undefined && last.type === 'text') {
      out[out.length - 1] = { text: last.text + node.text, type: 'text' };
    } else {
      out.push(node);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

/**
 * Parse `markdown` into a frozen {@link ProseDoc}.
 *
 * The profile is a fixed GFM-flavored subset: ATX headings, paragraphs, fenced and indented
 * code, blockquotes, ordered/unordered lists, GFM pipe tables, thematic breaks, code spans,
 * emphasis/strong, strikethrough, inline links and images, autolinks (angle-bracket URIs, angle-bracket emails as `mailto:`, and bare `http(s)`),
 * and hard/soft breaks. Raw HTML, reference links, setext headings, HTML entities, footnotes,
 * and task lists are **not** part of the profile: they render as literal text. Tabs are
 * expanded to four spaces. Blockquotes and list items require every line to carry its marker
 * or content indent (no lazy paragraph continuation), and a GFM table must start on its own
 * line after a blank line.
 *
 * Link and image destinations are policy-checked here: relative URLs are always allowed,
 * `data:` is always rejected, and other schemes must appear in `options.linkProtocols`
 * (default `http`, `https`, `mailto`). A rejected destination degrades to the link's label
 * text (or the image's alt text) and logs a dev-only warning; it never throws.
 *
 * @throws {ScribeLimitError} when the input exceeds 200,000 characters or nests beyond
 * 32 block/inline levels.
 */
export function parseProse(markdown: string, options: ProseParseOptions = {}): ProseDoc {
  if (markdown.length > MAX_INPUT_LENGTH) {
    throw new ScribeLimitError(`input exceeds the ${MAX_INPUT_LENGTH}-character limit`);
  }
  const ctx: Ctx = {
    depth: 0,
    protocols: new Set((options.linkProtocols ?? DEFAULT_PROTOCOLS).map((protocol) => protocol.toLowerCase())),
  };
  const lines = markdown.replace(/\r\n?/g, '\n').replaceAll('\t', '    ').split('\n');
  return deepFreeze({ blocks: parseBlocks(lines, ctx) });
}
