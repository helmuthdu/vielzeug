/**
 * template/compiler.ts: HTML template string parser and static template cache.
 *
 * Responsibilities:
 * - Parse TemplateStringsArray into slot metadata (slot detection).
 * - Build a cached HTMLTemplateElement with path indices for efficient node lookup.
 * - Expose `getStaticTemplate()` for use by the instantiator.
 */

import { ORE_ERRORS, OreApiError } from '../errors';

// ─── Slot kinds ───────────────────────────────────────────────────────────────
// Const object + derived union, same pattern as `ComponentPhase`
// in base-element.ts: used here (rather than plain string literals) because the kind
// crosses a module boundary (compiler.ts produces it, instantiator.ts consumes
// it): importing `SlotKind` gives autocomplete and a single rename point at the
// consuming site, where a bare string literal wouldn't.

export const SlotKind = {
  ATTR: 'attr',
  BOOL_ATTR: 'boolAttr',
  EVENT: 'event',
  NODE: 'node',
  PROP: 'prop',
  REF: 'ref',
} as const;

export type DetectedSlotKind = (typeof SlotKind)[keyof typeof SlotKind];

/**
 * Event modifiers accepted after `@event.` in a template: `@click.stop.prevent`.
 * `stop`/`prevent` wrap the handler (stopPropagation/preventDefault); `once`/`capture`
 * map to the native addEventListener options of the same name.
 */
export type EventModifiers = {
  capture?: boolean;
  once?: boolean;
  prevent?: boolean;
  stop?: boolean;
};

const EVENT_MODIFIERS: EventModifiers = { capture: true, once: true, prevent: true, stop: true };

const parseEventModifiers = (name: string, modifiers: string[]): EventModifiers | undefined => {
  if (modifiers.length === 0) return undefined;

  const parsed: EventModifiers = {};

  for (const modifier of modifiers) {
    if (!(modifier in EVENT_MODIFIERS)) throw new OreApiError(ORE_ERRORS.eventModifierUnknown(name, modifier));

    parsed[modifier as keyof EventModifiers] = true;
  }

  return parsed;
};

type DetectedSlot = {
  eventModifiers?: EventModifiers;
  kind: DetectedSlotKind;
  name?: string;
  prefix: string;
};

// ─── Static template types ────────────────────────────────────────────────────

export type NodePath = readonly number[];

export type SlotMeta = {
  commentId?: number;
  elementId?: number;
  eventModifiers?: EventModifiers;
  kind: DetectedSlotKind;
  mode?: 'attr' | 'bool';
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
const PROP_RE = /\s+\.([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const ATTR_RE = /\s+([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;

// Element properties that parse their assigned value as raw HTML. Binding these
// through `.prop=` would be an unlabeled HTML-injection sink; the named
// unsafeHtml() directive is the only supported raw-HTML path. (innerText/textContent
// are plain-text sinks and stay allowed.)
const HTML_INJECTION_PROPS = new Set(['innerhtml', 'outerhtml', 'srcdoc']);

const detectSlot = (str: string): DetectedSlot => {
  let m: RegExpExecArray | null;

  if ((m = EVENT_RE.exec(str))) {
    const prefix = str.slice(0, -m[0].length);
    const [name, ...modifiers] = m[1].split('.');

    return { eventModifiers: parseEventModifiers(name, modifiers), kind: SlotKind.EVENT, name, prefix };
  }

  if ((m = REF_RE.exec(str))) {
    return { kind: SlotKind.REF, prefix: str.slice(0, -m[0].length) };
  }

  if ((m = BOOL_ATTR_RE.exec(str))) {
    return { kind: SlotKind.BOOL_ATTR, name: m[1], prefix: str.slice(0, -m[0].length) };
  }

  if ((m = PROP_RE.exec(str))) {
    const name = m[1];

    // Prototype-polluting property names are rejected at compile time: `.prop=`
    // writes the element property directly, so these names must never be writable.
    if (name === '__proto__' || name === 'constructor' || name === 'prototype') {
      throw new OreApiError(ORE_ERRORS.propBindingForbiddenName(name));
    }

    // HTML-parsing properties are rejected for the same reason `srcdoc` and `on*`
    // attributes are blocked in setAttr(): `.prop=` writes the property directly,
    // so `.innerHTML=` would be an unlabeled raw-HTML sink that bypasses the
    // named unsafeHtml() escape hatch. Sanitized HTML injection must go through it.
    if (HTML_INJECTION_PROPS.has(name.toLowerCase())) {
      throw new OreApiError(ORE_ERRORS.propBindingHtmlInjectionName(name));
    }

    return { kind: SlotKind.PROP, name, prefix: str.slice(0, -m[0].length) };
  }

  if ((m = ATTR_RE.exec(str))) {
    return { kind: SlotKind.ATTR, name: m[1], prefix: str.slice(0, -m[0].length) };
  }

  const lastOpen = str.lastIndexOf('<');
  const lastClose = str.lastIndexOf('>');

  if (lastOpen > lastClose && str[lastOpen + 1] !== '/') {
    throw new OreApiError(ORE_ERRORS.templateInterpolationInTag);
  }

  return { kind: SlotKind.NODE, prefix: str };
};

// ─── Static template cache ────────────────────────────────────────────────────

const templateCache = new WeakMap<TemplateStringsArray, CompiledStaticTemplate>();

/**
 * Matches a string that ends in an attribute-assignment context, e.g. `...attr=`,
 * `...@click=`, `...?disabled=`. Used together with tag-context
 * tracking (see below) to decide whether a quote immediately before an
 * interpolation is an attribute-value quote (strip it) or a literal text quote
 * (keep it): previously every adjacent quote was stripped, so both
 * `` html`"${value}"` `` and prose like `area = "${area}"` lost their quotes.
 */
const ATTR_VALUE_CONTEXT_RE = /[@?]?[a-zA-Z_][-a-zA-Z0-9_.]*\s*=\s*$/;

/**
 * Pre-process template strings to strip surrounding attribute quotes. This lets
 * the main loop operate on clean strings with no per-iteration state flags.
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
    // content up to it: including this string's own text before its final quote
    // (last angle bracket wins; attribute values containing '<'/'>' are outside
    // the supported syntax either way).
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
  }

  return out;
};

/**
 * Attribute names that mark a binding target element, and the comment prefix for
 * node-slot anchors. Namespaced (`data-ore-*` / `ore:N`) so user-authored markup in
 * static template regions can never collide with them: a plain `u` attribute or a
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

  for (let i = 0; i < normalized.length - 1; i++) {
    const raw = normalized[i];
    const slot = detectSlot(raw);

    if (slot.kind === SlotKind.NODE) {
      html += `${slot.prefix}<!--ore:${commentCounter}-->`;
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

      slots.push({
        elementId: activeElementId,
        eventModifiers: slot.eventModifiers,
        kind: slot.kind,
        mode,
        name: slot.name,
      });
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
