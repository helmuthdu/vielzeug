// sandboxDoc.ts
//
// Builds the sandbox content for the ComponentPreview iframe.
//
// The sandbox's render() expects an HTML body fragment, not a full document —
// buildDocument() inside @vielzeug/sandbox wraps it with <head>/<body>.
// CSS is returned separately to be passed via SandboxOptions.styles.
// JS is prepended to the fragment as inline <script> tags so it executes
// before custom elements in the user HTML are parsed and upgraded.
//
// Kept in a plain .ts file (not inside <script setup>) to avoid Vue's parser
// treating </script> inside template literals as block boundaries.

import sigilCss from 'sigil-preview:css';
import sigilDeps from 'sigil-preview:deps';
import sigilJs from 'sigil-preview:js';

export interface SandboxDocOptions {
  html: string;
  dir: 'ltr' | 'rtl';
  dark: boolean;
  center: boolean;
  vertical: boolean;
  /** Extra px added to reported height so shadows/blurs aren't clipped. Default: 32. */
  shadowBleed?: number;
  /** When set, the sandbox body background is transparent so the host container's background image shows through. */
  background?: string;
}

export interface SandboxDocResult {
  /** HTML body fragment to pass to sandbox.render(). Includes inline <style> and <script> tags. */
  fragment: string;
}

// Default extra pixels ensuring box-shadows and blur effects that overflow
// the layout box are not clipped by the iframe edge.
const DEFAULT_SHADOW_BLEED = 32;

// Builds the resize-observer script with the configured bleed value.
// Minification happens naturally at build time via Vite.
function makeResizeScript(bleed: number): string {
  return `
new ResizeObserver(() => {
  const h = document.documentElement.scrollHeight;
  parent.postMessage({ type: 'resize', height: Math.ceil(h) + ${bleed} }, '*');
}).observe(document.documentElement);
`.trim();
}

export function buildSandboxDoc(options: SandboxDocOptions): SandboxDocResult {
  const { background, center, dark, dir, html, shadowBleed = DEFAULT_SHADOW_BLEED, vertical } = options;

  const bodyAlign = center ? 'center' : 'flex-start';
  const bodyDirection = vertical ? 'column' : 'row';
  const bodyBackground = background ? background : 'transparent';

  // sigil CSS first, then overrides — order matters so our resets win.
  const overrideCss = [
    `*, *::before, *::after { box-sizing: border-box; }`,
    `html { color-scheme: ${dark ? 'dark' : 'light'}; }`,
    `html, body { margin: 0; padding: 0; overflow: visible; background: transparent; font-family: var(--font-sans, system-ui, sans-serif); }`,
    `body { display: flex; flex-direction: ${bodyDirection}; flex-wrap: wrap; gap: 1rem; padding: 2rem 2rem 0; align-items: ${bodyAlign}; justify-content: ${bodyAlign}; background: ${bodyBackground}; }`,
  ].join(' ');

  // Scripts are prepended to the fragment so they execute before custom
  // elements in the user HTML are parsed and upgraded by the browser.
  const fragment = `<style>${sigilCss}</style>
<style>${overrideCss}</style>
<script>${sigilDeps}</script>
<script>${sigilJs}</script>
${html}
<script>${makeResizeScript(shadowBleed)}</script>`;

  return { fragment };
}
