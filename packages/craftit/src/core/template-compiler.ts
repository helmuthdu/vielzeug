import { computed, isSignal, signal, type ReadonlySignal, type Signal } from '@vielzeug/stateit';

import {
  CF_ID_ATTR,
  EACH_SIGNAL,
  htmlResult,
  isHtmlResult,
  type Binding,
  type Directive,
  type EventBinding,
  type HTMLResult,
  type Ref,
  type RefCallback,
} from './internal';
import { createAttrBinding, createPropBinding } from './template-bindings';
import { escapeHtml } from './utilities';

const ATTR_ID_RE = new RegExp(`${CF_ID_ATTR}="([^"]+)"`, 'g');

const normalizeCompiledHtml = (html: string): string => html.replace(/>\s+</g, '><').trim();

// Slot patterns applied in priority order; first match wins
const SLOT_PATTERNS = [
  { kind: 'event' as const, regex: /\s+@([a-zA-Z_][-a-zA-Z0-9_.]*)\s*=\s*["']?$/ },
  { kind: 'ref' as const, regex: /\s+ref\s*=\s*["']?$/ },
  { kind: 'specialAttr' as const, regex: /\s+([:?])([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/ },
  { kind: 'prop' as const, regex: /\.([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/ },
  { kind: 'plainAttr' as const, regex: /\s+([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/ },
] as const;

type CompiledTemplateSlot = {
  kind: (typeof SLOT_PATTERNS)[number]['kind'] | 'node';
  // For 'specialAttr' slots
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

const templatePlanCache = new WeakMap<TemplateStringsArray, CompiledTemplatePlan>();

/**
 * Parses event descriptor string into name and modifiers.
 * @example
 * parseEventDescriptor('click.stop.prevent') → { name: 'click', modifiers: { stop, prevent } }
 */
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
      } else if (pattern.kind === 'specialAttr') {
        slots.push({ kind: 'specialAttr', mode: m[1] === '?' ? 'bool' : 'attr', name: m[2], prefix, raw: str });
      } else if (pattern.kind === 'prop') {
        slots.push({ kind: 'prop', name: m[1], prefix, raw: str });
      } else if (pattern.kind === 'plainAttr') {
        slots.push({ kind: 'plainAttr', name: m[1], prefix, raw: str });
      }

      break; // first match wins
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
  if (typeof value !== 'object' || value === null || !(EACH_SIGNAL in value)) return null;

  return (value as { [EACH_SIGNAL]: ReadonlySignal<{ bindings: Binding[]; html: string }> })[EACH_SIGNAL];
};

const resolveDirectiveValue = (value: unknown): string => {
  if (typeof value === 'string') return escapeHtml(value);

  if (value == null) return '';

  if (isHtmlResult(value)) return value.__html;

  return escapeHtml(String(value));
};

const renderHtmlItems = (
  getter: () => unknown,
  effect: (fn: () => void) => void,
): { bindings: Binding[]; signal: Signal<any> } => {
  let cached = { bindings: [] as Binding[], html: '' };
  const fnSignal = signal(cached);

  effect(() => {
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
      fnSignal.value = cached;
    }
  });

  return { bindings: [], signal: fnSignal };
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
    return { keyed: true, signal: eachSignal };
  }

  if (typeof value === 'function' && !isSignal(value)) {
    const { signal: sig } = renderHtmlItems(value as () => unknown, effect);

    return { keyed: false, signal: sig };
  }

  if (isSignal(value) && isHtmlResult(value.value)) {
    return {
      keyed: false,
      signal: computed(() => {
        const next = (value as ReadonlySignal<unknown>).value;

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

export const resetTemplateCompilerState = (): void => {
  // Marker IDs are deterministic per compiled template; no global state to reset.
};

/**
 * Compiles a tagged template into an HTMLResult with reactive bindings.
 *
 * Detects interpolation slots using regex patterns:
 * - `@event-name` → event listener binding
 * - `ref` → ref binding
 * - `:prop` or `?bool` → special attributes
 * - `.prop` → property binding
 * - plain attributes → attribute binding
 *
 * Rekeys nested HTMLResult bindings to avoid ID collisions.
 *
 * @param strings - Template string parts
 * @param values - Interpolated values (signals, functions, directives, primitives)
 * @param effect - Effect hook for reactive bindings
 * @returns HTMLResult with compiled HTML and bindings array
 *
 * @example
 * const name = signal('Alice');
 * const html = compileTemplate`<h1>${() => name.value}</h1>`;
 */
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
          name: slot.name!,
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
      bindings.push(createAttrBinding(slot.mode!, slot.name!, id, value));
      continue;
    }

    if (slot.kind === 'prop') {
      const id = getElementBindingId(slot.prefix);

      result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createPropBinding(slot.name!, id, value));
      continue;
    }

    if (slot.kind === 'plainAttr') {
      const id = getElementBindingId(slot.prefix);

      result += `${slot.prefix} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createAttrBinding('attr', slot.name!, id, value));
      continue;
    }

    if (typeof value === 'object' && value !== null && ('mount' in value || 'render' in value)) {
      const isInterpolation = 'render' in value;
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
