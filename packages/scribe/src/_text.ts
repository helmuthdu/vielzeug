/**
 * Text machinery shared by the renderers and the outline: heading slugs and plain-text
 * extraction. Security policy lives in `_policy.ts`.
 */

import type { ProseBlock, ProseHeadingLevel, ProseInline, ProseOutlineEntry } from './types';

// ---------------------------------------------------------------------------
// Heading slugs
// ---------------------------------------------------------------------------

/** Stateful slug generator: the renderer and the outline must agree on heading ids. */
export interface ProseSlugger {
  slug(text: string): string;
}

export function createSlugger(): ProseSlugger {
  const used = new Map<string, number>();
  return {
    slug(text: string): string {
      const base =
        text
          .toLowerCase()
          .normalize('NFKC')
          .replace(/[^\p{L}\p{N}]+/gu, '-')
          .replace(/^-+|-+$/g, '') || 'section';
      const seen = used.get(base);
      if (seen === undefined) {
        used.set(base, 1);
        return base;
      }
      used.set(base, seen + 1);
      return `${base}-${seen + 1}`;
    },
  };
}

/**
 * Build outline entries from headings in document order. The traversal (and therefore the
 * slugger) is exactly the one `renderProse*` performs when `headingIds` is on — including
 * headings nested in blockquotes — so outline ids always match the rendered ids. Headings
 * deeper than `maxLevel` still consume their slug before being filtered out.
 */
export function collectOutline(
  blocks: readonly ProseBlock[],
  slugger: ProseSlugger,
  maxLevel: ProseHeadingLevel,
): ProseOutlineEntry[] {
  const entries: ProseOutlineEntry[] = [];
  const walk = (nodes: readonly ProseBlock[]): void => {
    for (const block of nodes) {
      switch (block.type) {
        case 'heading': {
          const text = inlineText(block.children);
          const id = slugger.slug(text);
          if (block.level <= maxLevel) entries.push({ id, level: block.level, text });
          break;
        }
        case 'blockquote':
          walk(block.children);
          break;
        case 'list':
          for (const item of block.items) walk(item.children);
          break;
        default:
          break;
      }
    }
  };
  walk(blocks);
  return entries;
}

/** Plain text of an inline node sequence; used by the outline and image alt extraction. */
export function inlineText(nodes: readonly ProseInline[]): string {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
      case 'codeSpan':
        out += node.text;
        break;
      case 'softBreak':
      case 'hardBreak':
        out += ' ';
        break;
      case 'image':
        out += node.alt;
        break;
      case 'strong':
      case 'emphasis':
      case 'strikethrough':
      case 'link':
        out += inlineText(node.children);
        break;
    }
  }
  return out;
}
