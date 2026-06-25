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

import refineCss from 'refine-preview:css';
import refineDeps from 'refine-preview:deps';
import refineJs from 'refine-preview:js';

export interface SandboxDocOptions {
  html: string;
  dir: 'ltr' | 'rtl';
  dark: boolean;
  vertical: boolean;
  /** Extra px added to reported height so shadows/blurs aren't clipped. Default: 32. Ignored when height is set. */
  shadowBleed?: number;
  /** When set, the sandbox body background is transparent so the host container's background image shows through. */
  background?: string;
  /** When set, applied as min-height on the sandbox body so flex centering has vertical free space. */
  height?: string;
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
  const h = document.body.getBoundingClientRect().height;
  parent.postMessage({ type: 'resize', height: Math.ceil(h) + ${bleed} }, '*');
}).observe(document.body);
`.trim();
}

export function buildSandboxDoc(options: SandboxDocOptions): SandboxDocResult {
  const { background, dark, height, html, shadowBleed = height ? 0 : DEFAULT_SHADOW_BLEED, vertical } = options;

  const bodyAlign = 'center';
  const bodyDirection = vertical ? 'column' : 'row';
  const bodyBackground = background ? background : 'transparent';
  const bodyMinHeight = height ? height : 'auto';

  // refine CSS first, then overrides — order matters so our resets win.
  const overrideCss = [
    `*, *::before, *::after { box-sizing: border-box; }`,
    `html { color-scheme: ${dark ? 'dark' : 'light'}; height: fit-content; }`,
    `html, body { margin: 0; padding: 0; overflow: visible; background: transparent; font-family: var(--font-sans, system-ui, sans-serif); touch-action: manipulation; }`,
    `body { display: flex; flex-direction: ${bodyDirection}; flex-wrap: wrap; gap: 1rem; padding: 2rem; align-items: ${bodyAlign}; justify-content: ${bodyAlign}; min-height: ${bodyMinHeight}; background: ${bodyBackground}; }`,
  ].join(' ');

  // Scripts are prepended to the fragment so they execute before custom
  // elements in the user HTML are parsed and upgraded by the browser.
  const fragment = `<style>${refineCss}</style>
<style>${overrideCss}</style>
<script>${refineDeps}</script>
<script>${refineJs}</script>
${html}
<script>${makeResizeScript(shadowBleed)}</script>`;

  return { fragment };
}
