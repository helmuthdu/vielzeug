import { computed, isSignal, type ReadonlySignal } from '@vielzeug/ripple';

import { isLiveSignal } from './directives/live';
import { propRegistry } from './props';
import { applyBinding } from './template-bindings';
import {
  type AttrBinding,
  type AttrPropMeta,
  type Binding,
  createHtmlResult,
  type HtmlBindingValue,
  type HTMLResult,
  isDirectiveResult,
  isHtmlResult,
  isSpreadObject,
  type Ref,
  type RefCallback,
} from './types/bindings';
import { applyModifiers } from './utils/event-modifiers';

// ─── Slot detection ───────────────────────────────────────────────────────────

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

type DetectedSlotKind = 'event' | 'ref' | 'boolAttr' | 'attr' | 'spread' | 'node' | 'tagname' | 'closeTag';

type DetectedSlot = {
  kind: DetectedSlotKind;
  modifiers?: string[];
  name?: string;
  prefix: string;
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

// ─── Static template cache ───────────────────────────────────────────────────

type NodePath = readonly number[];

type SlotMeta = {
  commentId?: number;
  elementId?: number;
  kind: DetectedSlotKind;
  mode?: 'attr' | 'bool';
  modifiers?: string[];
  name?: string;
};

type CompiledStaticTemplate = {
  commentPaths: ReadonlyMap<number, NodePath>;
  element: HTMLTemplateElement;
  elementPaths: ReadonlyMap<number, NodePath>;
  slots: SlotMeta[];
};

const templateCache = new WeakMap<TemplateStringsArray, CompiledStaticTemplate>();

/**
 * Pre-process template strings to strip surrounding attribute quotes and the
 * closing `>` that follows a dynamic tag-name slot. This lets the main loop
 * operate on clean strings with no per-iteration state flags (R5).
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

const getStaticTemplate = (strings: TemplateStringsArray): CompiledStaticTemplate => {
  let tpl = templateCache.get(strings);

  if (!tpl) {
    tpl = buildStaticTemplate(strings);
    templateCache.set(strings, tpl);
  }

  return tpl;
};

// ─── Path navigation ─────────────────────────────────────────────────────────

const followPath = (root: Node, path: NodePath): Node => {
  let node: Node = root;

  for (const i of path) node = node.childNodes[i];

  return node;
};

// ─── Attr binding helpers ─────────────────────────────────────────────────────

const createAttrBindingFromValue = (
  el: HTMLElement,
  mode: 'attr' | 'bool',
  name: string,
  value: unknown,
): AttrBinding => {
  const propMeta = propRegistry.get(el)?.get(name) as AttrPropMeta | undefined;

  if (isLiveSignal(value)) {
    return { el, live: true, mode, name, propMeta, signal: value as ReadonlySignal<unknown>, type: 'attr' };
  }

  if (typeof value === 'function') {
    return { el, mode, name, propMeta, signal: computed(value as () => unknown), type: 'attr' };
  }

  if (isSignal(value)) {
    return { el, mode, name, propMeta, signal: value as ReadonlySignal<unknown>, type: 'attr' };
  }

  return { el, mode, name, propMeta, type: 'attr', value };
};

const resolveStaticText = (value: unknown): string => {
  if (value == null) return '';

  return String(value);
};

// ─── Template instantiation ──────────────────────────────────────────────────

/**
 * Instantiate a compiled template: clone the cached DOM template, navigate
 * to each binding target using pre-recorded paths, and build bindings with
 * direct node references. Returns an HTMLResult whose fragment is ready to insert.
 */
export const compileTemplate = (strings: TemplateStringsArray, values: unknown[]): HTMLResult => {
  const compiled = getStaticTemplate(strings);
  const fragment = compiled.element.content.cloneNode(true) as DocumentFragment;
  const bindings: Binding[] = [];
  // For static HTMLResult embeds: chain their apply calls
  const chainedApplies: Array<(rc: (fn: () => void) => void) => void> = [];

  // Phase 1: Resolve all binding targets BEFORE any DOM modifications
  type BoundSlot = { comment?: Comment; el?: HTMLElement; slot: SlotMeta; value: unknown };

  const boundSlots: BoundSlot[] = compiled.slots.map((slot, i) => {
    const value = values[i];

    if (slot.kind === 'closeTag') {
      return { slot, value };
    }

    if (slot.kind === 'node') {
      const comment = followPath(fragment, compiled.commentPaths.get(slot.commentId!)!) as Comment;

      return { comment, slot, value };
    }

    const el = followPath(fragment, compiled.elementPaths.get(slot.elementId!)!) as HTMLElement;

    return { el, slot, value };
  });

  // Phase 2a: Process tagname slots first — replace placeholders with real elements
  const tagReplacements = new Map<HTMLElement, HTMLElement>();

  for (const { el, slot, value } of boundSlots) {
    if (slot.kind !== 'tagname') continue;

    const tagName = String(value);
    const realEl = document.createElement(tagName);

    for (const attr of Array.from(el!.attributes)) realEl.setAttribute(attr.name, attr.value);

    while (el!.firstChild) realEl.appendChild(el!.firstChild);

    el!.replaceWith(realEl);
    tagReplacements.set(el!, realEl);
  }

  // Phase 2b: Build bindings (may modify DOM for static content)
  for (const { comment, el: rawEl, slot, value } of boundSlots) {
    if (slot.kind === 'tagname' || slot.kind === 'closeTag') continue;

    // Resolve element through tagname replacements
    const el = rawEl ? (tagReplacements.get(rawEl) ?? rawEl) : rawEl;

    if (slot.kind === 'node') {
      const anchor = comment!;

      if (isDirectiveResult(value)) {
        bindings.push({ anchor, directive: value, type: 'directive' });
        continue;
      }

      if (isHtmlResult(value)) {
        // Static embed: move fragment children into place, chain apply
        const parent = anchor.parentNode!;

        while (value.fragment.firstChild) parent.insertBefore(value.fragment.firstChild, anchor);

        anchor.remove();
        chainedApplies.push(value.apply.bind(value));
        continue;
      }

      if (typeof value === 'function') {
        const sig = computed(() => {
          const res = (value as () => unknown)();

          return Array.isArray(res) ? (res as HtmlBindingValue[]) : (res as HtmlBindingValue);
        });

        bindings.push({ anchor, signal: sig, type: 'html' });
        continue;
      }

      if (isSignal(value)) {
        // Always use the html binding for signals — it handles both text values and
        // HTMLResult values, preventing silent "[object Object]" corruption when a
        // signal's runtime type changes from null/string to HTMLResult.
        bindings.push({ anchor, signal: value as ReadonlySignal<HtmlBindingValue>, type: 'html' });
        continue;
      }

      if (Array.isArray(value)) {
        const parent = anchor.parentNode!;

        for (const item of value) {
          if (isHtmlResult(item)) {
            while (item.fragment.firstChild) parent.insertBefore(item.fragment.firstChild, anchor);

            chainedApplies.push(item.apply.bind(item));
          } else {
            parent.insertBefore(document.createTextNode(resolveStaticText(item)), anchor);
          }
        }
        anchor.remove();
        continue;
      }

      // Static primitive: replace with text node, no binding
      anchor.replaceWith(document.createTextNode(resolveStaticText(value)));
      continue;
    }

    // Element slot
    const target = el!;

    if (slot.kind === 'event') {
      if (typeof value === 'function') {
        const { handler, options } = applyModifiers(value as (e: Event) => void, slot.modifiers ?? []);

        bindings.push({ el: target, handler, name: slot.name!, options, type: 'event' });
      } else if (isSignal(value)) {
        const signalValue = value as ReadonlySignal<unknown>;
        const handler = (e: Event) => {
          const h = signalValue.value;

          if (typeof h === 'function') (h as (e: Event) => void)(e);
        };
        const { handler: wrapped, options } = applyModifiers(handler, slot.modifiers ?? []);

        bindings.push({ el: target, handler: wrapped, name: slot.name!, options, type: 'event' });
      }

      continue;
    }

    if (slot.kind === 'ref') {
      if (value) {
        bindings.push({ el: target, ref: value as Ref<Element> | RefCallback<Element>, type: 'ref' });
      }

      continue;
    }

    if (slot.kind === 'spread') {
      if (isSpreadObject(value)) {
        bindings.push({ el: target, spread: value, type: 'spread' });
      }

      continue;
    }

    // attr / boolAttr
    bindings.push(createAttrBindingFromValue(target, slot.mode ?? 'attr', slot.name!, value));
  }

  return createHtmlResult(fragment, (registerCleanup) => {
    for (const binding of bindings) applyBinding(binding, registerCleanup);
    for (const chainedApply of chainedApplies) chainedApply(registerCleanup);
  });
};

export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult =>
  compileTemplate(strings, values);
