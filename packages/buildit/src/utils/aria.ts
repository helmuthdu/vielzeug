import { effect } from '@vielzeug/craftit';

type AriaValue = string | number | boolean | null | undefined | (() => string | number | boolean | null | undefined);

type AriaConfig = Record<string, AriaValue>;

const normalizeAriaKey = (key: string): string => {
  if (key === 'role' || key.startsWith('aria-')) return key;

  return key.startsWith('aria') ? `aria-${key.slice(4).toLowerCase()}` : `aria-${key}`;
};

const setA11yAttr = (target: Element, key: string, value: string | number | boolean | null | undefined): void => {
  if (value == null || value === false) {
    target.removeAttribute(key);

    return;
  }

  target.setAttribute(key, value === true ? 'true' : String(value));
};

export const syncAria = (target: Element, config: AriaConfig): (() => void) => {
  const disposers: Array<() => void> = [];

  for (const [rawKey, rawValue] of Object.entries(config)) {
    const key = normalizeAriaKey(rawKey);

    if (typeof rawValue === 'function') {
      disposers.push(effect(() => setA11yAttr(target, key, rawValue())));
    } else {
      setA11yAttr(target, key, rawValue);
    }
  }

  return () => {
    while (disposers.length > 0) disposers.pop()?.();
  };
};
