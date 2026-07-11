import { install } from '@vielzeug/ore/testing';
import axe from 'axe-core';

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

// ElementInternals/FormData/`<form>.reset()` jsdom gaps — including the light/shadow boundary
// `<ore-form>`'s slotted fields cross, which needs the flat-tree walk instead of a plain
// `querySelectorAll` — are polyfilled by `install()` below, via `@vielzeug/ore/testing`'s
// `installFormInternalsPolyfill()`. This used to be a second, package-local copy of that same
// polyfill; the gap it works around is in `ore`'s own form-association feature, not anything
// refine-specific, so it now lives with the feature instead of being duplicated here.

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
  args.some((arg) => typeof arg === 'string' && arg.includes('[ore:E7] inject key missing: Symbol(FormContext)'));

// ore-async intentionally renders no named slots when status="idle" — the E10
// warning is expected and harmless in that state.
const isKnownAsyncSlotWarning = (args: unknown[]) =>
  args.some((arg) => typeof arg === 'string' && arg.includes('[ore:E10]') && arg.includes('<ore-async>'));

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

// jsdom defines TouchEvent but not the Touch constructor — add a minimal polyfill
if (typeof Touch === 'undefined') {
  (globalThis as any).Touch = class Touch {
    identifier: number;
    target: EventTarget;
    clientX: number;
    clientY: number;
    screenX: number;
    screenY: number;
    pageX: number;
    pageY: number;
    radiusX: number;
    radiusY: number;
    rotationAngle: number;
    force: number;

    constructor(init: {
      clientX?: number;
      clientY?: number;
      force?: number;
      identifier: number;
      pageX?: number;
      pageY?: number;
      radiusX?: number;
      radiusY?: number;
      rotationAngle?: number;
      screenX?: number;
      screenY?: number;
      target: EventTarget;
    }) {
      this.identifier = init.identifier;
      this.target = init.target;
      this.clientX = init.clientX ?? 0;
      this.clientY = init.clientY ?? 0;
      this.screenX = init.screenX ?? 0;
      this.screenY = init.screenY ?? 0;
      this.pageX = init.pageX ?? 0;
      this.pageY = init.pageY ?? 0;
      this.radiusX = init.radiusX ?? 0;
      this.radiusY = init.radiusY ?? 0;
      this.rotationAngle = init.rotationAngle ?? 0;
      this.force = init.force ?? 1;
    }
  };
}

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
globalThis.window.URL.revokeObjectURL = vi.fn();

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
