import axe from 'axe-core';

// ── Axe-core a11y helper ──────────────────────────────────────────────────────
// Usage in any test:
//   const results = await axeCheck(svgOrContainer);
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

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
