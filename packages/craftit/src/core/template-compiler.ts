import { computed, isSignal, signal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import {
  CF_ID_ATTR,
  EACH_SIGNAL,
  htmlResult,
  type Binding,
  type Directive,
  type EventBinding,
  type HTMLResult,
  type Ref,
  type RefCallback,
} from './internal';
import { createAttrBinding, createPropBinding } from './template-bindings';
import { escapeHtml } from './utilities';

const RE_EVENT = /\s+@([a-zA-Z_][-a-zA-Z0-9_.]*)\s*=\s*["']?$/;
const RE_REF = /\s+ref\s*=\s*["']?$/;
const RE_SPECIAL_ATTR = /\s+([:?])([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const RE_PROP = /\.([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const RE_PLAIN_ATTR = /\s+([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const ATTR_ID_RE = new RegExp(`${CF_ID_ATTR}="([^"]+)"`, 'g');

const isHtmlResult = (value: unknown): value is HTMLResult => typeof value === 'object' && !!value && '__html' in value;
const hasKey = (obj: unknown, key: string): boolean => typeof obj === 'object' && !!obj && key in obj;
const normalizeCompiledHtml = (html: string): string => html.replace(/>\s+</g, '><').trim();

type CompiledEventSlot = {
  kind: 'event';
  modifiers: EventBinding['modifiers'];
  name: string;
  prefix: string;
  raw: string;
};

type CompiledRefSlot = {
  kind: 'ref';
  prefix: string;
  raw: string;
};

type CompiledSpecialAttrSlot = {
  kind: 'specialAttr';
  mode: 'attr' | 'bool';
  name: string;
  prefix: string;
};

type CompiledPropSlot = {
  kind: 'prop';
  name: string;
  prefix: string;
};

type CompiledPlainAttrSlot = {
  kind: 'plainAttr';
  name: string;
  prefix: string;
};

type CompiledNodeSlot = {
  kind: 'node';
  raw: string;
};

type CompiledTemplateSlot =
  | CompiledEventSlot
  | CompiledRefSlot
  | CompiledSpecialAttrSlot
  | CompiledPropSlot
  | CompiledPlainAttrSlot
  | CompiledNodeSlot;

type CompiledTemplatePlan = {
  slots: CompiledTemplateSlot[];
  tail: string;
};

const templatePlanCache = new WeakMap<TemplateStringsArray, CompiledTemplatePlan>();

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
    const eventMatch = RE_EVENT.exec(str);

    if (eventMatch) {
      const parsed = parseEventDescriptor(eventMatch[1]);

      slots.push({
        kind: 'event',
        modifiers: parsed.modifiers,
        name: parsed.name,
        prefix: str.slice(0, -eventMatch[0].length),
        raw: str,
      });
      continue;
    }

    const refMatch = RE_REF.exec(str);

    if (refMatch) {
      slots.push({ kind: 'ref', prefix: str.slice(0, -refMatch[0].length), raw: str });
      continue;
    }

    const specialAttrMatch = RE_SPECIAL_ATTR.exec(str);

    if (specialAttrMatch) {
      const [, prefix, name] = specialAttrMatch;

      slots.push({
        kind: 'specialAttr',
        mode: prefix === '?' ? 'bool' : 'attr',
        name,
        prefix: str.slice(0, -specialAttrMatch[0].length),
      });
      continue;
    }

    const propMatch = RE_PROP.exec(str);

    if (propMatch) {
      slots.push({ kind: 'prop', name: propMatch[1], prefix: str.slice(0, -propMatch[0].length) });
      continue;
    }

    const plainAttrMatch = RE_PLAIN_ATTR.exec(str);

    if (plainAttrMatch) {
      slots.push({ kind: 'plainAttr', name: plainAttrMatch[1], prefix: str.slice(0, -plainAttrMatch[0].length) });
      continue;
    }

    slots.push({ kind: 'node', raw: str });
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

const createMarkerIdFactory = (): (() => string) => {
  let markerIndex = 0;

  return () => String(markerIndex++);
};

const rekeyHtmlResult = (
  result: HTMLResult,
  getNextId: () => string,
): {
  bindings: Binding[];
  html: string;
} => {
  const idMap = new Map<string, string>();
  const getMappedId = (id: string): string => {
    const mapped = idMap.get(id);

    if (mapped) return mapped;

    const next = getNextId();

    idMap.set(id, next);

    return next;
  };

  return {
    bindings: result.__bindings.map((binding) => ({ ...binding, uid: getMappedId(binding.uid) }) as Binding),
    html: result.__html
      .replace(ATTR_ID_RE, (_, id: string) => `${CF_ID_ATTR}="${getMappedId(id)}"`)
      .replace(/<!--(\d+)-->/g, (_, id: string) => `<!--${getMappedId(id)}-->`),
  };
};

const getEachSignalSource = (
  value: unknown,
): ReadonlySignal<{
  bindings: Binding[];
  html: string;
  items?: Array<{ bindings: Binding[]; html: string }>;
  keys?: (string | number)[];
}> | null => {
  if (typeof value !== 'object' || value === null) return null;

  if (EACH_SIGNAL in value) {
    return (value as { [EACH_SIGNAL]: ReadonlySignal<{ bindings: Binding[]; html: string }> })[EACH_SIGNAL];
  }

  // Support duplicate module instances by matching symbol descriptions.
  for (const sym of Object.getOwnPropertySymbols(value)) {
    if (sym.description !== EACH_SIGNAL.description) continue;

    const candidate = (value as Record<symbol, unknown>)[sym];

    if (candidate && typeof candidate === 'object' && 'value' in (candidate as object)) {
      return candidate as ReadonlySignal<{
        bindings: Binding[];
        html: string;
        items?: Array<{ bindings: Binding[]; html: string }>;
        keys?: (string | number)[];
      }>;
    }
  }

  return null;
};

const resolveDirectiveValue = (value: unknown): string => {
  if (typeof value === 'string') return escapeHtml(value);

  if (value == null) return '';

  if (isHtmlResult(value)) return value.__html;

  return escapeHtml(String(value));
};

const createHtmlWrapperSignal = (
  value: unknown,
  effect: (fn: () => void) => void,
): {
  keyed: boolean;
  signal: ReadonlySignal<{
    bindings: Binding[];
    html: string;
    items?: Array<{ bindings: Binding[]; html: string }>;
    keys?: (string | number)[];
  }>;
} | null => {
  const eachSignal = getEachSignalSource(value);

  if (eachSignal) {
    return {
      keyed: true,
      signal: eachSignal,
    };
  }

  if (typeof value === 'function' && !isSignal(value)) {
    let cached = { bindings: [] as Binding[], html: '' };
    const fnSignal = signal(cached);

    const computeValue = value as () => unknown;

    const update = () => {
      const res = computeValue();
      const items = Array.isArray(res) ? res : [res];
      const getNextId = createMarkerIdFactory();
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

      const bindingsChanged =
        bindings.length !== cached.bindings.length || bindings.some((b, i) => b !== cached.bindings[i]);

      if (html !== cached.html || bindingsChanged) {
        cached = { bindings, html };
        fnSignal.value = cached;
      }
    };

    effect(update);

    return { keyed: false, signal: fnSignal };
  }

  if (isSignal(value) && isHtmlResult(value.value)) {
    return {
      keyed: false,
      signal: computed(() => {
        const next = (value as ReadonlySignal<unknown>).value;

        if (!isHtmlResult(next)) {
          return { bindings: [], html: String(next) };
        }

        const entry = rekeyHtmlResult(next, createMarkerIdFactory());

        return { bindings: entry.bindings, html: entry.html };
      }),
    };
  }

  return null;
};

export const resetTemplateCompilerState = (): void => {
  // Marker IDs are deterministic per compiled template; no global state to reset.
};

export const compileTemplate = (
  strings: TemplateStringsArray,
  values: unknown[],
  effect: (fn: () => void) => void,
): HTMLResult => {
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
          name: slot.name,
          type: 'event',
          uid: id,
        });
      } else {
        result += slot.raw;
      }

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
      } else {
        result += slot.raw;
      }

      continue;
    }

    if (slot.kind === 'specialAttr') {
      const id = getElementBindingId(slot.prefix);

      result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createAttrBinding(slot.mode, slot.name, id, value));
      continue;
    }

    if (slot.kind === 'prop') {
      const id = getElementBindingId(slot.prefix);

      result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createPropBinding(slot.name, id, value));
      continue;
    }

    if (slot.kind === 'plainAttr') {
      const id = getElementBindingId(slot.prefix);

      result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createAttrBinding('attr', slot.name, id, value));
      continue;
    }

    if (hasKey(value, 'mount') || hasKey(value, 'render')) {
      const isInterpolation = hasKey(value, 'render');
      const id = isInterpolation ? getNextId() : getElementBindingId(slot.raw);

      if (isInterpolation) result += `${slot.raw}<!--${id}-->`;
      else result += `${slot.raw} ${CF_ID_ATTR}="${id}"`;

      const apply = (value as Directive).mount?.bind(value);

      if (apply) {
        bindings.push({
          apply: (el: HTMLElement, registerCleanup: (fn: () => void) => void) => {
            apply(el, { registerCleanup });
          },
          type: 'callback',
          uid: id,
        });
      }

      if (isInterpolation) {
        const render = (value as Directive).render!.bind(value);
        let cached = { bindings: [] as Binding[], html: '' };
        const fnSignal = signal(cached);

        effect(() => {
          const res = render();
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
            fnSignal.value = cached;
          }
        });

        bindings.push({ keyed: false, signal: fnSignal, type: 'html', uid: id });
      }

      continue;
    }

    resetElementBindingId();

    const htmlWrapper = createHtmlWrapperSignal(value, effect);

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
  }

  result += plan.tail;

  return htmlResult(normalizeCompiledHtml(result), bindings);
};
