// sandboxDoc.ts
//
// Builds the fragment HTML for the ComponentPreview sandbox.
//
// Returns a self-contained fragment (styles + scripts + user HTML) that is
// passed directly to sandbox.render(). The refine CSS is included inline so
// createSandbox() needs no special options — hot-patching is handled externally
// via sandbox.updateStyle('refine-css', newCss) from the HMR hook.
//
// Kept as a plain .ts file (not inside <script setup>) to avoid Vue's parser
// treating </script> inside template literals as block boundaries.

import refineCss from 'refine-preview:css';
import refineDeps from 'refine-preview:deps';
import refineJs from 'refine-preview:js';

// Exported so the HMR hook can reference the style id without a magic string.
export const REFINE_CSS_ID = 'refine-css';

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
  /** Self-contained HTML fragment to pass to sandbox.render(). */
  fragment: string;
}

const DEFAULT_SHADOW_BLEED = 32;

// The resize observer posts { type: 'resize', height } which routes through
// sandbox.onMessage() as a SandboxMessage of type 'resize'.
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

  const bodyDirection = vertical ? 'column' : 'row';
  const bodyBackground = background ?? 'transparent';
  const bodyMinHeight = height ?? 'auto';

  const overrideCss = [
    `*, *::before, *::after { box-sizing: border-box; }`,
    `html { color-scheme: ${dark ? 'dark' : 'light'}; height: fit-content; }`,
    `html, body { margin: 0; padding: 0; overflow: visible; background: transparent; font-family: var(--font-sans, system-ui, sans-serif); touch-action: manipulation; }`,
    `body { display: flex; flex-direction: ${bodyDirection}; flex-wrap: wrap; gap: 1rem; padding: 2rem; align-items: center; justify-content: center; min-height: ${bodyMinHeight}; background: ${bodyBackground}; }`,
  ].join(' ');

  // refine CSS gets an id so updateStyle('refine-css', newCss) can hot-patch it
  // without a full re-render. Scripts are prepended so they execute before
  // custom elements in the user HTML are parsed and upgraded by the browser.
  const fragment = `<style id="${REFINE_CSS_ID}">${refineCss}</style>
<style>${overrideCss}</style>
<script>${refineDeps}</script>
<script>${refineJs}</script>
${html}
<script>${makeResizeScript(shadowBleed)}</script>`;

  return { fragment };
}
