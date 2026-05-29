import { computed, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/ripple';

import { createAttrBinding } from './template-bindings';
import {
  htmlResult,
  isDirectiveResult,
  isHtmlResult,
  type Binding,
  type HTMLResult,
  type Ref,
  type RefCallback,
} from './types/bindings';
import { escapeHtml } from './utils/dom';
import { applyModifiers } from './utils/event-modifiers';
import { CF_ID_ATTR, createMarkerIdFactory, rekeyHtmlResult } from './utils/id';

// Templates use the HTML as-is; no aggressive whitespace normalization

// Slot patterns applied in priority order; first match wins
const EVENT_RE = /\s+@([a-zA-Z_][-a-zA-Z0-9_.-]*)\s*=\s*["']?$/;
const REF_RE = /\s+ref\s*=\s*["']?$/;
const BOOL_ATTR_RE = /\s+\?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const ATTR_RE = /\s+:?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;

type CompiledTemplateSlot = {
  kind: 'event' | 'ref' | 'boolAttr' | 'attr' | 'node';
  mode?: 'attr' | 'bool';
  modifiers?: string[];
  // For 'event' and attribute slots
  name?: string;
  prefix: string;
  raw: string;
};

type CompiledTemplatePlan = {
  slots: CompiledTemplateSlot[];
  tail: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Template caching and compilation
// ─────────────────────────────────────────────────────────────────────────────

// We cache only the template parsing plan (CompiledTemplatePlan) because it's stable
// and parsing is relatively expensive. Signal wrapping and computed derivation is
// cheap enough that caching provides negligible benefit and adds complexity.
const templatePlanCache = new WeakMap<TemplateStringsArray, CompiledTemplatePlan>();

const detectSlot = (str: string): CompiledTemplateSlot => {
  let m: RegExpExecArray | null;

  if ((m = EVENT_RE.exec(str))) {
    const prefix = str.slice(0, -m[0].length);
    const parts = m[1].split('.');

    return { kind: 'event', modifiers: parts.slice(1), name: parts[0], prefix, raw: str };
  }

  if ((m = REF_RE.exec(str))) {
    return { kind: 'ref', prefix: str.slice(0, -m[0].length), raw: str };
  }

  if ((m = BOOL_ATTR_RE.exec(str))) {
    return { kind: 'boolAttr', mode: 'bool', name: m[1], prefix: str.slice(0, -m[0].length), raw: str };
  }

  if ((m = ATTR_RE.exec(str))) {
    return { kind: 'attr', mode: 'attr', name: m[1], prefix: str.slice(0, -m[0].length), raw: str };
  }

  return { kind: 'node', prefix: str, raw: str };
};

const resolveDirectiveValue = (value: unknown): string => {
  if (typeof value === 'string') return escapeHtml(value);

  if (value == null) return '';

  if (isHtmlResult(value)) return value.html;

  return escapeHtml(String(value));
};

/**
 * Collect html and bindings from a list of items (array or single value).
 */
const collectHtmlItems = (items: unknown[], getNextId: () => string): { bindings: Binding[]; html: string } => {
  let html = '';
  const bindings: Binding[] = [];

  for (const item of items) {
    if (isHtmlResult(item)) {
      const entry = rekeyHtmlResult(item, getNextId);

      html += entry.html;
      bindings.push(...entry.bindings);
    } else {
      html += resolveDirectiveValue(item);
    }
  }

  return { bindings, html };
};

/**
 * Create a reactive signal that renders HTML items, for use with HtmlBinding.
 */
const createReactiveHtmlSignal = (value: unknown): ReadonlySignal<{ bindings: Binding[]; html: string }> | null => {
  if (typeof value === 'function') {
    return computed(() => {
      const res = (value as () => unknown)();
      const items = Array.isArray(res) ? res : [res];

      return collectHtmlItems(items, createMarkerIdFactory());
    });
  }

  if (isSignal(value) && isHtmlResult((value as ReadonlySignal<unknown>).value)) {
    const htmlSignal = value as ReadonlySignal<unknown>;

    return computed(() => {
      const next = htmlSignal.value;

      if (!isHtmlResult(next)) {
        return { bindings: [], html: resolveDirectiveValue(next) };
      }

      const entry = rekeyHtmlResult(next, createMarkerIdFactory());

      return { bindings: entry.bindings, html: entry.html };
    });
  }

  return null;
};

type NodeSlotResult =
  | { bindings: Binding[]; html: string; kind: 'static' }
  | { binding: Binding; html: string; kind: 'reactive' };

/**
 * Resolve a node-slot value into either static html+bindings or a reactive binding.
 */
const resolveNodeSlot = (value: unknown, getNextId: () => string): NodeSlotResult => {
  // Reactive HTML (functions returning templates, signals of templates)
  const reactiveSignal = createReactiveHtmlSignal(value);

  if (reactiveSignal) {
    const id = getNextId();

    return { binding: { signal: reactiveSignal, type: 'html', uid: id }, html: `<!--${id}-->`, kind: 'reactive' };
  }

  // Plain signal → text binding
  if (isSignal(value)) {
    const id = getNextId();

    return {
      binding: { signal: value as Signal<unknown>, type: 'text', uid: id },
      html: `<!--${id}-->`,
      kind: 'reactive',
    };
  }

  // Static array of items
  if (Array.isArray(value)) {
    const { bindings, html } = collectHtmlItems(value, getNextId);

    return { bindings, html, kind: 'static' };
  }

  // Single static HTMLResult
  if (isHtmlResult(value)) {
    const entry = rekeyHtmlResult(value, getNextId);

    return { bindings: entry.bindings, html: entry.html, kind: 'static' };
  }

  // Primitive static value
  return { bindings: [], html: resolveDirectiveValue(value), kind: 'static' };
};

const buildTemplatePlan = (strings: TemplateStringsArray): CompiledTemplatePlan => {
  const slots: CompiledTemplateSlot[] = [];

  for (let i = 0; i < strings.length - 1; i++) {
    slots.push(detectSlot(strings[i]));
  }

  return { slots, tail: strings[strings.length - 1] ?? '' };
};

const getCompiledTemplatePlan = (strings: TemplateStringsArray): CompiledTemplatePlan => {
  let plan = templatePlanCache.get(strings);

  if (!plan) {
    plan = buildTemplatePlan(strings);
    templatePlanCache.set(strings, plan);
  }

  return plan;
};

export const compileTemplate = (strings: TemplateStringsArray, values: unknown[]): HTMLResult => {
  const plan = getCompiledTemplatePlan(strings);
  let result = '';
  const bindings: Binding[] = [];
  let activeElementId: string | null = null;

  const getNextId = createMarkerIdFactory();
  const isInsideStartTag = (prefix: string) => prefix.lastIndexOf('<') > prefix.lastIndexOf('>');
  const getElementBindingId = (prefix: string): string => {
    if (!activeElementId || isInsideStartTag(prefix)) {
      activeElementId = getNextId();
    }

    return activeElementId;
  };
  const resetElementBindingId = (): void => {
    activeElementId = null;
  };

  for (let i = 0; i < plan.slots.length; i++) {
    const slot = plan.slots[i];
    const value = values[i];

    if (slot.kind === 'event') {
      if (typeof value === 'function') {
        const id = getElementBindingId(slot.prefix);
        const { handler, options } = applyModifiers(value as (e: Event) => void, slot.modifiers ?? []);

        result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
        bindings.push({ handler, name: slot.name!, options, type: 'event', uid: id });
      } else if (isSignal(value)) {
        // If a signal is passed to an event binding, we assume its current value
        // is the intended handler.
        const id = getElementBindingId(slot.prefix);
        const signalHandler = (e: Event) => {
          const currentHandler = (value as ReadonlySignal<unknown>).value;

          if (typeof currentHandler === 'function') {
            (currentHandler as (e: Event) => void)(e);
          }
        };
        const { handler, options } = applyModifiers(signalHandler, slot.modifiers ?? []);

        result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
        bindings.push({ handler, name: slot.name!, options, type: 'event', uid: id });
      } else result += slot.raw;

      continue;
    }

    if (slot.kind === 'ref') {
      if (value) {
        const id = getElementBindingId(slot.prefix);

        result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
        bindings.push({
          ref: value as Ref<Element> | RefCallback<Element>,
          type: 'ref',
          uid: id,
        });
      } else result += slot.raw;

      continue;
    }

    if (slot.kind === 'boolAttr' || slot.kind === 'attr') {
      const id = getElementBindingId(slot.prefix);

      result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createAttrBinding(slot.mode!, slot.name!, id, value));
      continue;
    }

    if (slot.kind === 'node') {
      resetElementBindingId();

      if (isDirectiveResult(value)) {
        const id = getNextId();

        result += `${slot.raw}<!--${id}-->`;
        bindings.push({ directive: value, type: 'directive', uid: id });
        continue;
      }

      const resolved = resolveNodeSlot(value, getNextId);

      result += slot.raw + resolved.html;

      if (resolved.kind === 'reactive') {
        bindings.push(resolved.binding);
      } else {
        bindings.push(...resolved.bindings);
      }

      continue;
    }
  }

  result += plan.tail;

  return htmlResult(result, bindings);
};

export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult =>
  compileTemplate(strings, values);
