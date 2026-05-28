import { computed, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

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
import { CF_ID_ATTR, createMarkerIdFactory, rekeyHtmlResult } from './utils/id';

// Templates use the HTML as-is; no aggressive whitespace normalization

// Slot patterns applied in priority order; first match wins
const SLOT_PATTERNS = [
  { kind: 'event' as const, regex: /\s+@([a-zA-Z_][-a-zA-Z0-9_.-]*)\s*=\s*["']?$/ },
  { kind: 'ref' as const, regex: /\s+ref\s*=\s*["']?$/ },
  { kind: 'boolAttr' as const, regex: /\s+\?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/ },
  { kind: 'attr' as const, regex: /\s+:?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/ },
] as const;

type CompiledTemplateSlot = {
  kind: (typeof SLOT_PATTERNS)[number]['kind'] | 'node';
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

/**
 * Apply event listener modifiers (prevent, stop, self, capture, once, passive).
 * Inlined for clarity rather than using wrapper function dict.
 */
const applyModifiers = (
  handler: (e: Event) => void,
  modifiers: string[],
): { handler: (e: Event) => void; options?: AddEventListenerOptions } => {
  let wrappedHandler = handler;

  for (const modifier of modifiers) {
    switch (modifier) {
      case 'prevent':
        wrappedHandler = ((h) => (e) => {
          e.preventDefault();
          h(e);
        })(wrappedHandler);
        break;
      case 'stop':
        wrappedHandler = ((h) => (e) => {
          e.stopPropagation();
          h(e);
        })(wrappedHandler);
        break;
      case 'self':
        wrappedHandler = ((h) => (e) => {
          if (e.target === e.currentTarget) h(e);
        })(wrappedHandler);
        break;
    }
  }

  const options: AddEventListenerOptions = {};

  if (modifiers.includes('capture')) options.capture = true;
  if (modifiers.includes('once')) options.once = true;
  if (modifiers.includes('passive')) options.passive = true;

  return { handler: wrappedHandler, ...(Object.keys(options).length ? { options } : {}) };
};

const resolveDirectiveValue = (value: unknown): string => {
  if (typeof value === 'string') return escapeHtml(value);

  if (value == null) return '';

  if (isHtmlResult(value)) return value.__html;

  return escapeHtml(String(value));
};

/**
 * Render HTML items (array or single) into html + bindings via a computed signal.
 * Used when a function getter returns HTML content that needs to be wrapped in a signal.
 */
const renderHtmlItems = (getter: () => unknown): ReadonlySignal<{ bindings: Binding[]; html: string }> => {
  return computed(() => {
    const res = getter();
    const items = Array.isArray(res) ? res : [res];
    const getNestedId = createMarkerIdFactory();
    let html = '';
    const bindings: Binding[] = [];

    for (const item of items) {
      if (isHtmlResult(item)) {
        const entry = rekeyHtmlResult(item, getNestedId);

        html += entry.html;
        bindings.push(...entry.bindings);
      } else {
        html += resolveDirectiveValue(item);
      }
    }

    return { bindings, html };
  });
};

/**
 * Create a wrapped signal for HTML rendering that handles both function getters and signals.
 * No caching of intermediate signals—let stateit handle all signal optimization.
 */
const createHtmlWrapperSignal = (
  value: unknown,
): {
  signal: ReadonlySignal<{ bindings: Binding[]; html: string }>;
} | null => {
  if (typeof value === 'function') {
    return { signal: renderHtmlItems(value as () => unknown) };
  }

  if (isSignal(value) && isHtmlResult((value as ReadonlySignal<unknown>).value)) {
    const htmlSignal = value as ReadonlySignal<unknown>;

    return {
      signal: computed(() => {
        const next = htmlSignal.value;

        if (!isHtmlResult(next)) {
          return { bindings: [], html: resolveDirectiveValue(next) };
        }

        const entry = rekeyHtmlResult(next, createMarkerIdFactory());

        return { bindings: entry.bindings, html: entry.html };
      }),
    };
  }

  return null;
};

const buildTemplatePlan = (strings: TemplateStringsArray): CompiledTemplatePlan => {
  const slots: CompiledTemplateSlot[] = [];

  for (let i = 0; i < strings.length - 1; i++) {
    const str = strings[i];
    let matched = false;

    for (const pattern of SLOT_PATTERNS) {
      const m = pattern.regex.exec(str);

      if (!m) continue;

      const prefix = str.slice(0, -m[0].length);

      matched = true;

      if (pattern.kind === 'event') {
        const parts = m[1].split('.');
        const eventName = parts[0];
        const modifiers = parts.slice(1);

        slots.push({ kind: 'event', modifiers, name: eventName, prefix, raw: str });
      } else if (pattern.kind === 'ref') {
        slots.push({ kind: 'ref', prefix, raw: str });
      } else if (pattern.kind === 'boolAttr') {
        slots.push({ kind: 'boolAttr', mode: 'bool', name: m[1], prefix, raw: str });
      } else if (pattern.kind === 'attr') {
        slots.push({ kind: 'attr', mode: 'attr', name: m[1], prefix, raw: str });
      }

      break;
    }

    if (!matched) {
      slots.push({ kind: 'node', prefix: str, raw: str });
    }
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

      const htmlWrapper = createHtmlWrapperSignal(value);

      if (htmlWrapper) {
        const id = getNextId();

        result += `${slot.raw}<!--${id}-->`;
        bindings.push({ signal: htmlWrapper.signal, type: 'html', uid: id });
        continue;
      }

      if (Array.isArray(value)) {
        let combinedHtml = '';

        for (const item of value) {
          if (isHtmlResult(item)) {
            const entry = rekeyHtmlResult(item, getNextId);

            combinedHtml += entry.html;
            bindings.push(...entry.bindings);
          } else {
            combinedHtml += resolveDirectiveValue(item);
          }
        }
        result += slot.raw + combinedHtml;
        continue;
      }

      if (isSignal(value)) {
        const id = getNextId();

        result += `${slot.raw}<!--${id}-->`;
        bindings.push({ signal: value as Signal<unknown>, type: 'text', uid: id });
      } else if (isHtmlResult(value)) {
        const entry = rekeyHtmlResult(value, getNextId);

        result += slot.raw + entry.html;
        bindings.push(...entry.bindings);
      } else {
        result += slot.raw + resolveDirectiveValue(value);
      }

      continue;
    }
  }

  result += plan.tail;

  return htmlResult(result, bindings);
};

export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult =>
  compileTemplate(strings, values);
