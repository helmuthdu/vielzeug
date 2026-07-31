/**
 * template/compiler.ts — HTML template string parser and static template cache.
 *
 * Responsibilities:
 * - Parse TemplateStringsArray into slot metadata (slot detection).
 * - Build a cached HTMLTemplateElement with path indices for efficient node lookup.
 * - Expose `getStaticTemplate()` for use by the instantiator.
 */

import { OreApiError, ORE_ERRORS } from '../errors';

// ─── Slot kinds ───────────────────────────────────────────────────────────────
// Const object + derived union, same pattern as `ComponentPhase`/`LIFECYCLE_EVENTS`
// in types.ts — used here (rather than plain string literals) because the kind
// crosses a module boundary (compiler.ts produces it, instantiator.ts consumes
// it): importing `SlotKind` gives autocomplete and a single rename point at the
// consuming site, where a bare string literal wouldn't.

export const SlotKind = {
  ATTR: 'attr',
  BOOL_ATTR: 'boolAttr',
  CLOSE_TAG: 'closeTag',
  EVENT: 'event',
  NODE: 'node',
  REF: 'ref',
  SPREAD: 'spread',
  TAG_NAME: 'tagname',
} as const;

export type DetectedSlotKind = (typeof SlotKind)[keyof typeof SlotKind];

type DetectedSlot = {
  kind: DetectedSlotKind;
  modifiers?: string[];
  name?: string;
  prefix: string;
};

// ─── Static template types ────────────────────────────────────────────────────

export type NodePath = readonly number[];

export type SlotMeta = {
  commentId?: number;
  elementId?: number;
  kind: DetectedSlotKind;
  mode?: 'attr' | 'bool';
  modifiers?: string[];
  name?: string;
};

export type CompiledStaticTemplate = {
  commentPaths: ReadonlyMap<number, NodePath>;
  element: HTMLTemplateElement;
  elementPaths: ReadonlyMap<number, NodePath>;
  slots: SlotMeta[];
};

// ─── Slot detection regexes ───────────────────────────────────────────────────

const EVENT_RE = /\s+@([a-zA-Z_][-a-zA-Z0-9_.-]*)\s*=\s*["']?$/;
const REF_RE = /\s+ref\s*=\s*["']?$/;
const BOOL_ATTR_RE = /\s+\?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const ATTR_RE = /\s+:?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;

const isInsideStartTag = (str: string): boolean => {
  const lastOpen = str.lastIndexOf('<');
  const lastClose = str.lastIndexOf('>');

  if (lastOpen <= lastClose) return false;

  // Must not be a closing tag (</...)
  return str[lastOpen + 1] !== '/';
};

const detectSlot = (str: string): DetectedSlot => {
  let m: RegExpExecArray | null;
  const trimmed = str.trimEnd();

  // Dynamic closing tag: interpolation is the closing tag name, e.g. strings[i] = "</"
  if (trimmed.endsWith('</')) {
    return { kind: SlotKind.CLOSE_TAG, prefix: str };
  }

  // Dynamic opening tag name: interpolation is the tag name itself, e.g. strings[i] = "<"
  if (trimmed.endsWith('<')) {
    return { kind: SlotKind.TAG_NAME, prefix: str };
  }

  if ((m = EVENT_RE.exec(str))) {
    const prefix = str.slice(0, -m[0].length);
    const parts = m[1].split('.');

    return { kind: SlotKind.EVENT, modifiers: parts.slice(1), name: parts[0], prefix };
  }

  if ((m = REF_RE.exec(str))) {
    return { kind: SlotKind.REF, prefix: str.slice(0, -m[0].length) };
  }

  if ((m = BOOL_ATTR_RE.exec(str))) {
    return { kind: SlotKind.BOOL_ATTR, name: m[1], prefix: str.slice(0, -m[0].length) };
  }

  if ((m = ATTR_RE.exec(str))) {
    return { kind: SlotKind.ATTR, name: m[1], prefix: str.slice(0, -m[0].length) };
  }

  if (isInsideStartTag(str)) {
    return { kind: SlotKind.SPREAD, prefix: str.trimEnd() };
  }

  return { kind: SlotKind.NODE, prefix: str };
};

// ─── Static template cache ────────────────────────────────────────────────────

const templateCache = new WeakMap<TemplateStringsArray, CompiledStaticTemplate>();

/**
 * Matches a string that ends in an attribute-assignment context, e.g. `...attr=`,
 * `...:value=`, `...@click=`, `...?disabled=`. Used together with tag-context
 * tracking (see below) to decide whether a quote immediately before an
 * interpolation is an attribute-value quote (strip it) or a literal text quote
 * (keep it) — previously every adjacent quote was stripped, so both
 * `` html`"${value}"` `` and prose like `area = "${area}"` lost their quotes.
 */
const ATTR_VALUE_CONTEXT_RE = /[@?:]?[a-zA-Z_][-a-zA-Z0-9_.]*\s*=\s*$/;

/**
 * Pre-process template strings to strip surrounding attribute quotes and the
 * closing `>` that follows a dynamic tag-name slot. This lets the main loop
 * operate on clean strings with no per-iteration state flags.
 *
 * Quote stripping requires BOTH an attr-assignment tail AND start-tag context
 * (tracked by replaying the raw strings): `class = "${c}"` inside a tag is
 * stripped; `area = "${a}"` in prose is not.
 */
const normalizeTemplateStrings = (strings: TemplateStringsArray): string[] => {
  const out = Array.from(strings);
  let insideTag = false;

  for (let i = 0; i < out.length - 1; i++) {
    const s = out[i];
    const lastChar = s[s.length - 1];

    // Tag context at the interpolation boundary is determined by all raw string
    // content up to it — including this string's own text before its final quote
    // (same naive heuristic as isInsideStartTag: last angle bracket wins; attribute
    // values containing '<'/'>' are outside the supported syntax either way).
    for (const ch of s) {
      if (ch === '<') insideTag = true;
      else if (ch === '>') insideTag = false;
    }

    // Strip wrapping attribute quotes: attr="${value}" → attr=${value}
    if ((lastChar === '"' || lastChar === "'") && insideTag && ATTR_VALUE_CONTEXT_RE.test(s.slice(0, -1))) {
      out[i] = s.slice(0, -1);

      const next = out[i + 1];

      if (next.startsWith(lastChar)) out[i + 1] = next.slice(1);
    }

    // Strip leading `>` from the string that follows a dynamic closing tag:
    // </${tagName}> — the `>` is the first character of strings[i+1]
    const cur = out[i];

    if (cur.trimEnd().endsWith('</')) {
      const next = out[i + 1];

      if (next.startsWith('>')) out[i + 1] = next.slice(1);
    }
  }

  return out;
};

/**
 * Attribute names that mark a binding target element, and the comment prefix for
 * node-slot anchors. Namespaced (`data-ore-*` / `ore:N`) so user-authored markup in
 * static template regions can never collide with them — a plain `u` attribute or a
 * numeric comment was previously hijacked as a binding marker and stripped.
 */
const ELEMENT_MARKER_ATTR = 'data-ore-b';
const COMMENT_MARKER_RE = /^ore:(\d+)$/;

const walkNode = (
  node: Node,
  path: number[],
  elementPaths: Map<number, NodePath>,
  commentPaths: Map<number, NodePath>,
): void => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const marker = el.getAttribute(ELEMENT_MARKER_ATTR);

    if (marker !== null) {
      elementPaths.set(Number(marker), [...path]);
      el.removeAttribute(ELEMENT_MARKER_ATTR);
    }
  } else if (node.nodeType === Node.COMMENT_NODE) {
    const content = (node as Comment).nodeValue;
    const m = content !== null ? COMMENT_MARKER_RE.exec(content) : null;

    if (m) {
      commentPaths.set(Number(m[1]), [...path]);
    }
  }

  const children = node.childNodes;

  for (let i = 0; i < children.length; i++) walkNode(children[i], [...path, i], elementPaths, commentPaths);
};

const buildStaticTemplate = (strings: TemplateStringsArray): CompiledStaticTemplate => {
  const normalized = normalizeTemplateStrings(strings);
  let html = '';
  let activeElementId: number | undefined;
  let elementCounter = 0;
  let commentCounter = 0;
  const slots: SlotMeta[] = [];
  const tagNameStack: number[] = [];

  for (let i = 0; i < normalized.length - 1; i++) {
    const raw = normalized[i];
    const slot = detectSlot(raw);

    if (slot.kind === SlotKind.TAG_NAME) {
      // Dynamic opening tag name: emit a placeholder custom element
      const id = elementCounter++;

      activeElementId = id;
      tagNameStack.push(id);

      // Remove trailing '<' from prefix and open placeholder element
      const prefixWithoutAngle = raw.replace(/<\s*$/, '');

      html += prefixWithoutAngle + `<ore-dyn-${id} ${ELEMENT_MARKER_ATTR}="${id}"`;
      slots.push({ elementId: id, kind: SlotKind.TAG_NAME });
    } else if (slot.kind === SlotKind.CLOSE_TAG) {
      // Dynamic closing tag: close the matching placeholder element. An empty
      // stack means this closing interpolation has no matching dynamic opener
      // (malformed template) — fail fast instead of silently closing the
      // wrong (or a nonexistent) placeholder element.
      if (tagNameStack.length === 0) {
        throw new OreApiError(ORE_ERRORS.mismatchedDynamicCloseTag);
      }

      const id = tagNameStack.pop()!;
      const prefixWithoutClose = raw.replace(/<\/\s*$/, '');

      html += prefixWithoutClose + `</ore-dyn-${id}>`;
      slots.push({ kind: SlotKind.CLOSE_TAG });
      activeElementId = undefined;
    } else if (slot.kind === SlotKind.NODE) {
      html += slot.prefix + `<!--ore:${commentCounter}-->`;
      slots.push({ commentId: commentCounter, kind: SlotKind.NODE });
      commentCounter++;
      activeElementId = undefined;
    } else {
      const needsNewMarker =
        activeElementId === undefined || slot.prefix.lastIndexOf('<') > slot.prefix.lastIndexOf('>');

      if (needsNewMarker) {
        activeElementId = elementCounter++;
        html += `${slot.prefix} ${ELEMENT_MARKER_ATTR}="${activeElementId}"`;
      } else {
        html += slot.prefix;
      }

      const mode: 'attr' | 'bool' | undefined =
        slot.kind === SlotKind.BOOL_ATTR ? 'bool' : slot.kind === SlotKind.ATTR ? 'attr' : undefined;

      slots.push({ elementId: activeElementId, kind: slot.kind, mode, modifiers: slot.modifiers, name: slot.name });
    }
  }

  html += normalized[normalized.length - 1] ?? '';

  const tpl = document.createElement('template');

  tpl.innerHTML = html;

  const elementPaths = new Map<number, NodePath>();
  const commentPaths = new Map<number, NodePath>();
  const topChildren = tpl.content.childNodes;

  for (let i = 0; i < topChildren.length; i++) walkNode(topChildren[i], [i], elementPaths, commentPaths);

  return { commentPaths, element: tpl, elementPaths, slots };
};

export const getStaticTemplate = (strings: TemplateStringsArray): CompiledStaticTemplate => {
  let tpl = templateCache.get(strings);

  if (!tpl) {
    tpl = buildStaticTemplate(strings);
    templateCache.set(strings, tpl);
  }

  return tpl;
};

// ─── Path navigation (used by instantiator) ───────────────────────────────────

export const followPath = (root: Node, path: NodePath): Node => {
  let node: Node = root;

  for (const i of path) node = node.childNodes[i];

  return node;
};
