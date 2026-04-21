import { computed, isSignal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import {
  CF_ID_ATTR,
  EACH_SIGNAL,
  createMarkerIdFactory,
  escapeHtml,
  htmlResult,
  isHtmlResult,
  rekeyHtmlResult,
  type Binding,
  type EventBinding,
  type HTMLResult,
  type Ref,
  type RefCallback,
} from './internal';
import { toReactiveBindingSource } from './runtime';
import { createAttrBinding, createPropBinding } from './template-bindings';

// Templates use the HTML as-is; no aggressive whitespace normalization

// Slot patterns applied in priority order; first match wins
const SLOT_PATTERNS = [
  { kind: 'event' as const, regex: /\s+@([a-zA-Z_][-a-zA-Z0-9_.]*)\s*=\s*["']?$/ },
  { kind: 'ref' as const, regex: /\s+ref\s*=\s*["']?$/ },
  { kind: 'boolAttr' as const, regex: /\s+\?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/ },
  { kind: 'prop' as const, regex: /\.([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/ },
  { kind: 'attr' as const, regex: /\s+:?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/ },
] as const;

type CompiledTemplateSlot = {
  kind: (typeof SLOT_PATTERNS)[number]['kind'] | 'node';
  mode?: 'attr' | 'bool';
  modifiers?: EventBinding['modifiers'];
  // For 'event' slots
  name?: string;
  prefix: string;
  raw: string;
};

type CompiledTemplatePlan = {
  slots: CompiledTemplateSlot[];
  tail: string;
};

type HtmlWrapperSignal = ReadonlySignal<{
  bindings: Binding[];
  html: string;
  items?: Array<{ bindings: Binding[]; html: string }>;
  keys?: (string | number)[];
}>;

const templatePlanCache = new WeakMap<TemplateStringsArray, CompiledTemplatePlan>();
const htmlGetterSignalCache = new WeakMap<() => unknown, HtmlWrapperSignal>();
const htmlSignalWrapperCache = new WeakMap<ReadonlySignal<unknown>, HtmlWrapperSignal>();

const parseEventDescriptor = (descriptor: string): { modifiers: EventBinding['modifiers']; name: string } => {
  const [name, ...rawModifiers] = descriptor.split('.');
  const modifiers: NonNullable<EventBinding['modifiers']> = {};

  for (const modifier of rawModifiers) {
    if (modifier === 'capture') modifiers.capture = true;
    else if (modifier === 'once') modifiers.once = true;
    else if (modifier === 'passive') modifiers.passive = true;
    else if (modifier === 'prevent') modifiers.prevent = true;
    else if (modifier === 'self') modifiers.self = true;
    else if (modifier === 'stop') modifiers.stop = true;
  }

  return { modifiers: Object.keys(modifiers).length ? modifiers : undefined, name };
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
        const parsed = parseEventDescriptor(m[1]);

        slots.push({ kind: 'event', modifiers: parsed.modifiers, name: parsed.name, prefix, raw: str });
      } else if (pattern.kind === 'ref') {
        slots.push({ kind: 'ref', prefix, raw: str });
      } else if (pattern.kind === 'boolAttr') {
        slots.push({ kind: 'boolAttr', mode: 'bool', name: m[1], prefix, raw: str });
      } else if (pattern.kind === 'prop') {
        slots.push({ kind: 'prop', name: m[1], prefix, raw: str });
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

const getEachSignalSource = (
  value: unknown,
): ReadonlySignal<{
  bindings: Binding[];
  html: string;
  items?: Array<{ bindings: Binding[]; html: string }>;
  keys?: (string | number)[];
}> | null => {
  if (typeof value !== 'object' || value === null || !(EACH_SIGNAL in value)) return null;

  return (value as { [EACH_SIGNAL]: ReadonlySignal<{ bindings: Binding[]; html: string }> })[EACH_SIGNAL];
};

const resolveDirectiveValue = (value: unknown): string => {
  if (typeof value === 'string') return escapeHtml(value);

  if (value == null) return '';

  if (isHtmlResult(value)) return value.__html;

  return escapeHtml(String(value));
};

const renderHtmlItems = (getter: () => unknown): { bindings: Binding[]; signal: ReadonlySignal<any> } => {
  let cached = { bindings: [] as Binding[], html: '' };
  const fnSignal = computed(() => {
    const res = getter();
    const items = Array.isArray(res) ? res : [res];
    const getNestedId = createMarkerIdFactory();
    let html = '';
    const nextBindings: Binding[] = [];

    for (const item of items) {
      if (isHtmlResult(item)) {
        const entry = rekeyHtmlResult(item, getNestedId);

        html += entry.html;
        nextBindings.push(...entry.bindings);
      } else {
        html += resolveDirectiveValue(item);
      }
    }

    const bindingsChanged =
      nextBindings.length !== cached.bindings.length || nextBindings.some((b, i) => b !== cached.bindings[i]);

    if (html !== cached.html || bindingsChanged) {
      cached = { bindings: nextBindings, html };
    }

    return cached;
  });

  return { bindings: [], signal: fnSignal };
};

const createHtmlWrapperSignal = (
  value: unknown,
): {
  keyed: boolean;
  signal: HtmlWrapperSignal;
} | null => {
  const eachSignal = getEachSignalSource(value);
  const source = toReactiveBindingSource(value);

  if (eachSignal) {
    return { keyed: true, signal: eachSignal };
  }

  if (typeof value === 'function' && source) {
    const getter = value as () => unknown;
    const cached = htmlGetterSignalCache.get(getter);

    if (cached) {
      return { keyed: false, signal: cached };
    }

    const { signal: sig } = renderHtmlItems(getter);

    htmlGetterSignalCache.set(getter, sig);

    return { keyed: false, signal: sig };
  }

  if (isSignal(value) && source && isHtmlResult(source.value)) {
    const htmlSignal = source;
    const cached = htmlSignalWrapperCache.get(htmlSignal);

    if (cached) {
      return { keyed: false, signal: cached };
    }

    const wrapped = computed(() => {
      const next = htmlSignal.value;

      if (!isHtmlResult(next)) {
        return { bindings: [], html: resolveDirectiveValue(next) };
      }

      const entry = rekeyHtmlResult(next, createMarkerIdFactory());

      return { bindings: entry.bindings, html: entry.html };
    });

    htmlSignalWrapperCache.set(htmlSignal, wrapped);

    return {
      keyed: false,
      signal: wrapped,
    };
  }

  return null;
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

        result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
        bindings.push({
          handler: value as (e: Event) => void,
          modifiers: slot.modifiers,
          name: slot.name!,
          type: 'event',
          uid: id,
        });
      } else if (isSignal(value)) {
        // If a signal is passed to an event binding, we assume its current value
        // is the intended handler.
        const id = getElementBindingId(slot.prefix);

        result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
        bindings.push({
          handler: (e: Event) => {
            const currentHandler = (value as ReadonlySignal<unknown>).value;

            if (typeof currentHandler === 'function') {
              (currentHandler as (e: Event) => void)(e);
            }
          },
          modifiers: slot.modifiers,
          name: slot.name!,
          type: 'event',
          uid: id,
        });
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

    if (slot.kind === 'prop') {
      const id = getElementBindingId(slot.prefix);

      result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createPropBinding(slot.name!, id, value));
      continue;
    }

    if (slot.kind === 'node') {
      resetElementBindingId();

      const htmlWrapper = createHtmlWrapperSignal(value);

      if (htmlWrapper) {
        const id = getNextId();

        result += `${slot.raw}<!--${id}-->`;
        bindings.push({ keyed: htmlWrapper.keyed, signal: htmlWrapper.signal, type: 'html', uid: id });
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
