/**
 * template/compiler.ts — HTML template string parser and static template cache.
 *
 * Responsibilities:
 * - Parse TemplateStringsArray into slot metadata (slot detection).
 * - Build a cached HTMLTemplateElement with path indices for efficient node lookup.
 * - Expose `getStaticTemplate()` for use by the instantiator.
 */

// ─── Slot kinds ───────────────────────────────────────────────────────────────

export type DetectedSlotKind = 'event' | 'ref' | 'boolAttr' | 'attr' | 'spread' | 'node' | 'tagname' | 'closeTag';

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
    return { kind: 'closeTag', prefix: str };
  }

  // Dynamic opening tag name: interpolation is the tag name itself, e.g. strings[i] = "<"
  if (trimmed.endsWith('<')) {
    return { kind: 'tagname', prefix: str };
  }

  if ((m = EVENT_RE.exec(str))) {
    const prefix = str.slice(0, -m[0].length);
    const parts = m[1].split('.');

    return { kind: 'event', modifiers: parts.slice(1), name: parts[0], prefix };
  }

  if ((m = REF_RE.exec(str))) {
    return { kind: 'ref', prefix: str.slice(0, -m[0].length) };
  }

  if ((m = BOOL_ATTR_RE.exec(str))) {
    return { kind: 'boolAttr', name: m[1], prefix: str.slice(0, -m[0].length) };
  }

  if ((m = ATTR_RE.exec(str))) {
    return { kind: 'attr', name: m[1], prefix: str.slice(0, -m[0].length) };
  }

  if (isInsideStartTag(str)) {
    return { kind: 'spread', prefix: str.trimEnd() };
  }

  return { kind: 'node', prefix: str };
};

// ─── Static template cache ────────────────────────────────────────────────────

const templateCache = new WeakMap<TemplateStringsArray, CompiledStaticTemplate>();

/**
 * Pre-process template strings to strip surrounding attribute quotes and the
 * closing `>` that follows a dynamic tag-name slot. This lets the main loop
 * operate on clean strings with no per-iteration state flags.
 */
const normalizeTemplateStrings = (strings: TemplateStringsArray): string[] => {
  const out = Array.from(strings);

  for (let i = 0; i < out.length - 1; i++) {
    const s = out[i];
    const lastChar = s[s.length - 1];

    // Strip wrapping attribute quotes: attr="${value}" → attr=${value}
    if (lastChar === '"' || lastChar === "'") {
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

const walkNode = (
  node: Node,
  path: number[],
  elementPaths: Map<number, NodePath>,
  commentPaths: Map<number, NodePath>,
): void => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const marker = el.getAttribute('u');

    if (marker !== null) {
      elementPaths.set(Number(marker), [...path]);
      el.removeAttribute('u');
    }
  } else if (node.nodeType === Node.COMMENT_NODE) {
    const content = (node as Comment).nodeValue;

    if (content !== null && /^\d+$/.test(content)) {
      commentPaths.set(Number(content), [...path]);
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

    if (slot.kind === 'tagname') {
      // Dynamic opening tag name: emit a placeholder custom element
      const id = elementCounter++;

      activeElementId = id;
      tagNameStack.push(id);

      // Remove trailing '<' from prefix and open placeholder element
      const prefixWithoutAngle = raw.replace(/<\s*$/, '');

      html += prefixWithoutAngle + `<craft-dyn-${id} u="${id}"`;
      slots.push({ elementId: id, kind: 'tagname' });
    } else if (slot.kind === 'closeTag') {
      // Dynamic closing tag: close the matching placeholder element
      const id = tagNameStack.pop() ?? 0;
      const prefixWithoutClose = raw.replace(/<\/\s*$/, '');

      html += prefixWithoutClose + `</craft-dyn-${id}>`;
      slots.push({ kind: 'closeTag' });
      activeElementId = undefined;
    } else if (slot.kind === 'node') {
      html += slot.prefix + `<!--${commentCounter}-->`;
      slots.push({ commentId: commentCounter, kind: 'node' });
      commentCounter++;
      activeElementId = undefined;
    } else {
      const needsNewMarker =
        activeElementId === undefined || slot.prefix.lastIndexOf('<') > slot.prefix.lastIndexOf('>');

      if (needsNewMarker) {
        activeElementId = elementCounter++;
        html += `${slot.prefix} u="${activeElementId}"`;
      } else {
        html += slot.prefix;
      }

      const mode: 'attr' | 'bool' | undefined =
        slot.kind === 'boolAttr' ? 'bool' : slot.kind === 'attr' ? 'attr' : undefined;

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
