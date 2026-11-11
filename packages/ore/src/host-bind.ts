/**
 * Host element binding API: reactive attr, class, style, and event bindings
 * applied directly to the component's host element or any target element.
 */

import { effect, isReactive, onCleanup } from '@vielzeug/ripple';

import { getHost, hasSetupContext } from './runtime';
import { normalizeHostAttrKey } from './utils/aria';
import {
  cssDeclarationName,
  cssDeclarationValue,
  listen,
  type MaybeReactive,
  resolveClassTokens,
  setAttr,
} from './utils/dom';

/**
 * Describes a reactive or static host binding value.
 */
export type HostBindingValue = MaybeReactive<string | number | boolean | null | undefined>;

/**
 * Configuration for host attribute bindings.
 */
export type AttributeBindings = Record<string, HostBindingValue>;

type HostClassBindingValue = MaybeReactive<boolean>;
// Bivariant callback allows consumers to use narrower event types.
type HostEventListener = { bivarianceHack(event: Event): void }['bivarianceHack'];

export type HostBindConfig = {
  attr?: AttributeBindings;
  class?: (() => Record<string, boolean>) | Record<string, HostClassBindingValue>;
  on?: Record<string, HostEventListener | undefined>;
  style?: Record<string, HostBindingValue>;
};

export type BindOptions = AddEventListenerOptions & {
  /**
   * Target element to bind to. Defaults to the host element when called
   * via `bind()`. Pass an explicit element to bind to any other element
   * (e.g. a slotted trigger or an internally-referenced child element).
   * With a target, `bind()` also works outside setup (e.g. from an event
   * handler); there, only the returned disposer stops it.
   */
  target?: Element;
};

/**
 * Apply reactive or static bindings to an element's attributes, classes, styles,
 * and events. Defaults to the current component's host element; pass
 * `options.target` to bind to any other element (e.g. a slotted trigger, an
 * internally-referenced child).
 */
export const bind = (config: HostBindConfig, options?: BindOptions): (() => void) => {
  const el = (options?.target as HTMLElement | undefined) ?? getHost();
  const disposers: Array<() => void> = [];

  if (config.attr) {
    for (const [key, value] of Object.entries(config.attr)) {
      const name = toHostAttr(key);
      const dispose = applyAttribute(el, name, value);

      if (dispose) disposers.push(dispose);
    }
  }

  if (config.class) {
    disposers.push(applyClassMap(el, config.class));
  }

  if (config.style) {
    for (const [key, value] of Object.entries(config.style)) {
      const dispose = applyStyle(el, key, value);

      if (dispose) disposers.push(dispose);
    }
  }

  if (config.on) {
    const { target: _t, ...listenerOptions } = options ?? {};

    for (const event of Object.keys(config.on) as Array<keyof typeof config.on>) {
      const listener = config.on[event];

      if (!listener) continue;

      disposers.push(listen(el, event as string, listener as EventListener, listenerOptions));
    }
  }

  const cleanup = (): void => {
    for (const dispose of disposers) dispose();
  };

  if (hasSetupContext()) onCleanup(cleanup);

  return cleanup;
};

const toHostAttr = normalizeHostAttrKey;

/** Run `fn` reactively; the returned disposer is the only owner callers need to track. */
const reactive = (fn: () => void): (() => void) => {
  const sub = effect(() => {
    fn();
    return undefined;
  });

  return () => sub.dispose();
};

const applyReactiveBinding = (
  value: HostBindingValue,
  updater: (next: string | number | boolean | null | undefined) => void,
): (() => void) | undefined => {
  if (typeof value === 'function') return reactive(() => updater(value()));
  if (isReactive(value)) return reactive(() => updater(value.value));

  updater(value);
};

function applyAttribute(host: HTMLElement, name: string, value: HostBindingValue): (() => void) | undefined {
  return applyReactiveBinding(value, (next) => setAttr(host, name, next));
}

function applyStyle(host: HTMLElement, name: string, value: HostBindingValue): (() => void) | undefined {
  const cssName = cssDeclarationName(name);

  if (!cssName) return;

  let owned = false;
  const setStyle = (v: string | number | boolean | null | undefined): void => {
    const declaration = cssDeclarationValue(v);

    if (declaration) {
      owned = true;
      host.style.setProperty(cssName, declaration);
    } else if (owned) host.style.removeProperty(cssName);
  };

  return applyReactiveBinding(value, setStyle);
}

function applyClassMap(
  host: HTMLElement,
  value: (() => Record<string, boolean>) | Record<string, HostClassBindingValue>,
): () => void {
  const getMap =
    typeof value === 'function'
      ? value
      : (): Record<string, boolean> => Object.fromEntries([...resolveClassTokens(value)].map((cls) => [cls, true]));

  let prev = new Set<string>();

  return reactive(() => {
    const next = new Set<string>();

    for (const [cls, active] of Object.entries(getMap())) {
      if (!active) continue;

      next.add(cls);

      if (!prev.has(cls)) host.classList.add(cls);
    }
    for (const cls of prev) {
      if (!next.has(cls)) host.classList.remove(cls);
    }
    prev = next;
  });
}
