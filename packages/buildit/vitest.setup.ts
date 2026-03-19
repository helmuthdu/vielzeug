import { install } from '@vielzeug/craftit/test';

// Polyfill ElementInternals for jsdom — jsdom does not implement form-associated
// custom element APIs like setFormValue, setValidity, states, etc.
if (typeof ElementInternals !== 'undefined') {
  const proto = ElementInternals.prototype as any;

  if (!proto.setFormValue) proto.setFormValue = () => {};

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
  args.some((arg) => typeof arg === 'string' && arg.includes('[craftit:E7] inject key missing: Symbol(FormContext)'));

globalThis.console.error = (...args: unknown[]) => {
  if (isKnownFormContextInjectWarning(args)) return;

  consoleError(...args);
};

globalThis.console.warn = (...args: unknown[]) => {
  if (isKnownFormContextInjectWarning(args)) return;

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
