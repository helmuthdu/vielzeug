import { effect, handle } from './runtime';
import { setAttr } from './utils';

/**
 * Describes a reactive or static host binding (attribute, event, class).
 */
export type HostBindingValue =
  | (() => string | number | boolean | null | undefined)
  | string
  | number
  | boolean
  | null
  | undefined;

type HostEventBindingValue = (e: Event) => void;

/**
 * Configuration for `reflect()`.
 */
export type ReflectConfig = {
  [key: string]: HostBindingValue | HostEventBindingValue;
  classMap?: () => Record<string, boolean>;
};

/**
 * Reflect reactive attributes, events, and classes to a host element.
 * Must be called within a component setup context.
 *
 * @example
 * setup({ host, reflect }) {
 *   reflect({
 *     role: 'checkbox',
 *     tabindex: () => disabled ? undefined : 0,
 *     checked: () => checked.value,
 *     classMap: () => ({ 'is-checked': checked.value }),
 *     onClick: handleToggle,
 *   });
 * }
 */
export function reflect(host: HTMLElement, config: ReflectConfig): void {
  for (const [key, value] of Object.entries(config)) {
    if (key === 'classMap' && typeof value === 'function') {
      applyClassMap(host, value as () => Record<string, boolean>);
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Event binding: onClick, onKeydown, etc.
      const eventName = key.slice(2).toLowerCase();

      handle(host, eventName, value as HostEventBindingValue);
    } else {
      // Attribute binding
      applyAttribute(host, key, value as HostBindingValue);
    }
  }
}

function applyAttribute(host: HTMLElement, name: string, value: HostBindingValue): void {
  const isReactive = typeof value === 'function';

  if (isReactive) {
    // Re-run whenever the getter changes
    effect(() => {
      const resolved = (value as () => HostBindingValue)();

      setAttr(host, name, resolved);
    });
  } else {
    // Static value set once
    setAttr(host, name, value);
  }
}

function applyClassMap(host: HTMLElement, getter: () => Record<string, boolean>): void {
  let lastClasses = new Set<string>();

  effect(() => {
    const classes = getter();
    const nextClasses = new Set<string>();

    for (const [name, shouldAdd] of Object.entries(classes)) {
      if (shouldAdd) {
        nextClasses.add(name);

        if (!lastClasses.has(name)) {
          host.classList.add(name);
        }
      } else {
        if (lastClasses.has(name)) {
          host.classList.remove(name);
        }
      }
    }

    // Remove classes that are no longer in the map
    for (const removed of lastClasses) {
      if (!nextClasses.has(removed)) {
        host.classList.remove(removed);
      }
    }

    lastClasses = nextClasses;
  });
}
