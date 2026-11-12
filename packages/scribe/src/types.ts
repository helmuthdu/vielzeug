/**
 * The public AST of {@link parseProse}. Every node is a frozen plain object, so a parsed
 * document is safe to share, cache, and render repeatedly. Nodes are fully serializable:
 * nothing here references the source string.
 */

/** Heading depth, 1–6. */
export type ProseHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Horizontal alignment of a GFM table column. */
export type ProseAlignment = 'center' | 'left' | 'right';

// ---------------------------------------------------------------------------
// Inline nodes
// ---------------------------------------------------------------------------

/** Literal text. Never contains markup: the parser resolved everything else. */
export interface ProseText {
  readonly text: string;
  readonly type: 'text';
}

/** `` `code` `` span. `text` is the span content with CommonMark space-trimming applied. */
export interface ProseCodeSpan {
  readonly text: string;
  readonly type: 'codeSpan';
}

/** `**strong**` */
export interface ProseStrong {
  readonly children: readonly ProseInline[];
  readonly type: 'strong';
}

/** `*emphasis*` */
export interface ProseEmphasis {
  readonly children: readonly ProseInline[];
  readonly type: 'emphasis';
}

/** `~~strikethrough~~` (GFM) */
export interface ProseStrikethrough {
  readonly children: readonly ProseInline[];
  readonly type: 'strikethrough';
}

/**
 * An inline link. `href` already passed the protocol policy at parse time; a
 * disallowed destination never produces this node (its label renders as plain text).
 */
export interface ProseLink {
  readonly children: readonly ProseInline[];
  readonly href: string;
  readonly title?: string;
  readonly type: 'link';
}

/** An image. `src` already passed the protocol policy; `alt` is the label's plain text. */
export interface ProseImage {
  readonly alt: string;
  readonly src: string;
  readonly title?: string;
  readonly type: 'image';
}

/** A soft line break inside a paragraph: newline in HTML, space in plain text. */
export interface ProseSoftBreak {
  readonly type: 'softBreak';
}

/** A hard line break (trailing double space or trailing backslash). */
export interface ProseHardBreak {
  readonly type: 'hardBreak';
}

/** Any inline node. */
export type ProseInline =
  | ProseCodeSpan
  | ProseEmphasis
  | ProseHardBreak
  | ProseImage
  | ProseLink
  | ProseSoftBreak
  | ProseStrikethrough
  | ProseStrong
  | ProseText;

// ---------------------------------------------------------------------------
// Block nodes
// ---------------------------------------------------------------------------

/** A paragraph of inline content. */
export interface ProseParagraph {
  readonly children: readonly ProseInline[];
  readonly type: 'paragraph';
}

/** An ATX heading (`#` .. `######`). Setext headings are not part of the profile. */
export interface ProseHeading {
  readonly children: readonly ProseInline[];
  readonly level: ProseHeadingLevel;
  readonly type: 'heading';
}

/** A fenced or indented code block. `text` excludes the fence lines and trailing newline. */
export interface ProseCodeBlock {
  readonly language?: string;
  readonly text: string;
  readonly type: 'codeBlock';
}

/** A blockquote. Nested blockquotes are bounded by the parser's depth limit. */
export interface ProseBlockquote {
  readonly children: readonly ProseBlock[];
  readonly type: 'blockquote';
}

/** One list item: a block sequence parsed at the item's content indent. */
export interface ProseListItem {
  readonly children: readonly ProseBlock[];
  readonly type: 'listItem';
}

/** An ordered or unordered list. `tight` lists carry item paragraphs to be unwrapped. */
export interface ProseList {
  readonly items: readonly ProseListItem[];
  readonly ordered: boolean;
  /** Starting number for ordered lists (1 for unordered). */
  readonly start: number;
  readonly tight: boolean;
  readonly type: 'list';
}

/** `---`, `***`, or `___` on its own line. */
export interface ProseThematicBreak {
  readonly type: 'thematicBreak';
}

/** The inline content of one GFM table cell. */
export type ProseTableCell = readonly ProseInline[];

/** A GFM pipe table. Every row has exactly `alignments.length` cells. */
export interface ProseTable {
  readonly alignments: readonly ProseAlignment[];
  readonly header: readonly ProseTableCell[];
  readonly rows: readonly (readonly ProseTableCell[])[];
  readonly type: 'table';
}

/** Any block node. */
export type ProseBlock =
  | ProseBlockquote
  | ProseCodeBlock
  | ProseHeading
  | ProseList
  | ProseParagraph
  | ProseTable
  | ProseThematicBreak;

/** A parsed document: the top-level block sequence. */
export interface ProseDoc {
  readonly blocks: readonly ProseBlock[];
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/** Options for {@link parseProse}. */
export interface ProseParseOptions {
  /**
   * Lowercase URL schemes accepted for link and image destinations. Relative URLs
   * (anything without a scheme) are always accepted; `data:` is always rejected.
   * Default: `['http', 'https', 'mailto']`.
   */
  readonly linkProtocols?: readonly string[];
}

/** Options shared by {@link renderProseHtml} and {@link renderProseDom}. */
export interface ProseRenderOptions {
  /**
   * Emit unique slug `id` attributes on headings (matching {@link proseOutline}).
   * Default false: no attributes are sourced from document content unless asked for.
   */
  readonly headingIds?: boolean;
}

/** Options for {@link proseOutline}. */
export interface ProseOutlineOptions {
  /** Ignore headings deeper than this level. Default 6. */
  readonly maxLevel?: ProseHeadingLevel;
}

/** One entry of {@link proseOutline}: a heading with a renderer-matching slug id. */
export interface ProseOutlineEntry {
  /** The unique slug, identical to the `id` `renderProse*` emits with `headingIds`. */
  readonly id: string;
  readonly level: ProseHeadingLevel;
  /** The heading's plain text. */
  readonly text: string;
}
