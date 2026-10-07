// @vitest-environment node
// The shipped stylesheet's dark-mode contract is asserted against the CSS text itself:
// jsdom neither applies stylesheets nor evaluates selectors, so only source inspection
// can pin the trigger set that JS-themed hosts (MUI/Backstage palette toggles) rely on.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../theme/prism.css', import.meta.url), 'utf8');

describe('theme.css dark mode', () => {
  it('offers [data-prism-theme=dark] alongside html.dark as a subtree trigger', () => {
    expect(css).toMatch(/html\.dark,\s*\[data-prism-theme='dark'\]\s*\{/);
  });

  it('keeps the OS-preference trigger', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });
});
