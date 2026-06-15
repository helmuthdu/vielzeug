import { install } from '@vielzeug/craft/testing';
import axe from 'axe-core';

const FORM_VALUE_SYMBOL = Symbol.for('vielzeug.test.formValue');
const ATTACH_INTERNALS_PATCHED = Symbol.for('vielzeug.test.attachInternalsPatched');

// ── Axe-core a11y helper ──────────────────────────────────────────────────────
// Usage in any test:
//   const results = await axeCheck(fixture.element);
//   expect(results.violations).toHaveLength(0);
//
// axe-core targets real browsers. Under jsdom there is no CSS box model and
// `getComputedStyle` is a stub, so rules that depend on layout, geometry, or
// computed colour produce false positives/negatives. We disable those here so
// the structural/ARIA/name/role checks that jsdom CAN evaluate stay reliable.
// The disabled rules (colour contrast, target size, …) must be verified in a
// real browser or by manual/visual review — not asserted in these tests.
const JSDOM_UNRELIABLE_RULES: Record<string, { enabled: false }> = {
  'color-contrast': { enabled: false },
  'color-contrast-enhanced': { enabled: false },
  'scrollable-region-focusable': { enabled: false },
  'target-size': { enabled: false },
};

export async function axeCheck(node: Element, options: axe.RunOptions = {}): Promise<axe.AxeResults> {
  return axe.run(node, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
    ...options,
    rules: { ...JSDOM_UNRELIABLE_RULES, ...options.rules },
  });
}

// Make it globally available without imports in each test file
(globalThis as any).axeCheck = axeCheck;

declare global {
  var axeCheck: (node: Element, options?: axe.RunOptions) => Promise<axe.AxeResults>;
}

// Polyfill ElementInternals for jsdom — jsdom does not implement form-associated
// custom element APIs like setFormValue, setValidity, states, etc.
if (typeof ElementInternals !== 'undefined') {
  const proto = ElementInternals.prototype as any;
  const originalAttachInternals = HTMLElement.prototype.attachInternals;
  const originalSetFormValue = proto.setFormValue;
  const internalsHostMap = new WeakMap<ElementInternals, HTMLElement>();

  if (originalAttachInternals && !(HTMLElement.prototype as any)[ATTACH_INTERNALS_PATCHED]) {
    Object.defineProperty(HTMLElement.prototype, ATTACH_INTERNALS_PATCHED, {
      configurable: true,
      value: true,
    });

    HTMLElement.prototype.attachInternals = function (...args: []): ElementInternals {
      const internals = originalAttachInternals.apply(this, args);

      internalsHostMap.set(internals, this);

      return internals;
    };
  }

  proto.setFormValue = function (value: File | FormData | string | null) {
    const host = internalsHostMap.get(this);

    if (host) {
      (host as unknown as Record<symbol, File | FormData | string | null>)[FORM_VALUE_SYMBOL] = value;
    }

    originalSetFormValue?.call(this, value);
  };

  if (!proto.setValidity) proto.setValidity = () => {};

  if (!proto.checkValidity) proto.checkValidity = () => true;

  if (!proto.reportValidity) proto.reportValidity = () => true;

  if (!proto.states) {
    Object.defineProperty(proto, 'states', {
      get() {
        if (!this._states) {
          const s = new Set<string>();

          this._states = {
            add: (v: string) => s.add(v),
            delete: (v: string) => s.delete(v),
            has: (v: string) => s.has(v),
          };
        }

        return this._states;
      },
    });
  }
}

const NativeFormData = globalThis.FormData;

const appendFormValue = (formData: FormData, name: string, value: File | FormData | string) => {
  if (value instanceof FormData) {
    for (const [entryName, entryValue] of value.entries()) {
      formData.append(entryName, entryValue);
    }

    return;
  }

  formData.append(name, value);
};

globalThis.FormData = class FormDataWithCustomElementSupport extends NativeFormData {
  constructor(form?: HTMLFormElement, submitter?: HTMLElement | null) {
    super(form as HTMLFormElement | undefined, submitter as HTMLElement | null | undefined);

    if (!(form instanceof HTMLFormElement)) return;

    for (const element of Array.from(form.querySelectorAll<HTMLElement>('[name]'))) {
      const host = element as HTMLElement & Record<symbol, File | FormData | string | null>;
      const name = host.getAttribute('name');
      const value = host[FORM_VALUE_SYMBOL];

      if (!name || value == null) continue;

      appendFormValue(this, name, value);
    }
  }
};

// Polyfill ClipboardEvent for jsdom
if (typeof ClipboardEvent === 'undefined') {
  (globalThis as any).ClipboardEvent = class ClipboardEvent extends Event {
    clipboardData: DataTransfer | null;
    constructor(type: string, init?: ClipboardEventInit) {
      super(type, init);
      this.clipboardData = (init as any)?.clipboardData ?? null;
    }
  };
}

install(afterEach);

const consoleError = globalThis.console.error;
const consoleWarn = globalThis.console.warn;
const isKnownFormContextInjectWarning = (args: unknown[]) =>
  args.some((arg) => typeof arg === 'string' && arg.includes('[craft:E7] inject key missing: Symbol(FormContext)'));

// sg-async intentionally renders no named slots when status="idle" — the E10
// warning is expected and harmless in that state.
const isKnownAsyncSlotWarning = (args: unknown[]) =>
  args.some((arg) => typeof arg === 'string' && arg.includes('[craft:E10]') && arg.includes('<sg-async>'));

globalThis.console.error = (...args: unknown[]) => {
  if (isKnownFormContextInjectWarning(args)) return;

  if (isKnownAsyncSlotWarning(args)) return;

  consoleError(...args);
};

globalThis.console.warn = (...args: unknown[]) => {
  if (isKnownFormContextInjectWarning(args)) return;

  if (isKnownAsyncSlotWarning(args)) return;

  consoleWarn(...args);
};

// jsdom does not implement scrollIntoView — stub it to avoid unhandled errors
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom does not implement scrollTo on Element in all environments
if (!Element.prototype.scrollTo) {
  (Element.prototype as any).scrollTo = () => {};
}

// jsdom does not implement ResizeObserver — stub it so layout components can load
if (typeof ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

globalThis.window.URL.createObjectURL = vi.fn();

// jsdom does not implement IntersectionObserver — stub it
if (typeof IntersectionObserver === 'undefined') {
  (globalThis as any).IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}
