// @vitest-environment node
// The shipped stylesheet's dark-mode contract is asserted against the CSS text itself:
// jsdom neither applies stylesheets nor evaluates selectors, so only source inspection
// can pin the trigger set that JS-themed hosts (MUI/Backstage palette toggles) rely on.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../theme/prism.css', import.meta.url), 'utf8');

describe('theme.css dark mode', () => {
  it('offers [data-prism-theme=dark] alongside html.dark as a subtree trigger', () => {
    expect(css).toMatch(/html\.dark,\s*\[data-prism-theme='dark'\]\s*\{[^}]*color-scheme:\s*dark;/);
  });

  it('offers a light override mirroring the dark trigger', () => {
    expect(css).toMatch(/html\.light,\s*\[data-prism-theme='light'\]\s*\{[^}]*color-scheme:\s*light;/);
  });

  it('drives the lightningcss light-dark() switches from the class triggers', () => {
    // Bundlers that lower light-dark() emit switches keyed only to
    // prefers-color-scheme; these definitions keep html.dark/[data-prism-theme] working there.
    expect(css).toMatch(
      /html\.dark,\s*\[data-prism-theme='dark'\]\s*\{[^}]*--lightningcss-light:\s*;\s*--lightningcss-dark:\s*initial;/,
    );
    expect(css).toMatch(
      /html\.light,\s*\[data-prism-theme='light'\]\s*\{[^}]*--lightningcss-light:\s*initial;\s*--lightningcss-dark:\s*;/,
    );
  });

  it('enables both schemes on :root so the OS preference drives light-dark()', () => {
    expect(css).toMatch(/:root\s*\{[^}]*color-scheme:\s*light dark;/);
  });

  it('never uses prefers-color-scheme as the dark-mode mechanism', () => {
    expect(css).not.toContain('@media (prefers-color-scheme');
  });

  it('themes divergent tokens with light-dark() pairs', () => {
    expect(css).toContain('--prism-color-8: light-dark(#000, #fff);');
    expect(css).toContain('--prism-text-color: light-dark(');
    expect(css).toContain('--prism-grid-color: light-dark(');
  });
});
