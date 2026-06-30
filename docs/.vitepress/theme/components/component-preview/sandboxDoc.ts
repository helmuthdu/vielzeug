// sandboxDoc.ts
//
// Builds the fragment HTML for the ComponentPreview sandbox.
//
// Returns the user-facing fragment (override styles + scripts + user HTML) to
// pass to sandbox.render(). Refine CSS is injected via createSandbox()
// namedStyles so sandbox.updateStyle() can hot-patch it without a full
// re-render. Resize reporting is handled by the sandbox bridge automatically.
//
// Kept as a plain .ts file (not inside <script setup>) to avoid Vue's parser
// treating </script> inside template literals as block boundaries.

import refineCss from 'refine-preview:css';
import refineDeps from 'refine-preview:deps';
import refineJs from 'refine-preview:js';

// Exported so callers can pass this as a namedStyles key and reference it for
// updateStyle() calls without a magic string.
export const REFINE_CSS_ID = 'refine-css';

// Exported so createSandbox() can receive the initial refine CSS in namedStyles.
export { refineCss };

export interface SandboxDocOptions {
  html: string;
  dir: 'ltr' | 'rtl';
  dark: boolean;
  vertical: boolean;
  /** When set, the sandbox body background is transparent so the host container's background image shows through. */
  background?: string;
  /** When set, applied as min-height on the sandbox body so flex centering has vertical free space. */
  height?: string;
}

export interface SandboxDocResult {
  /** Fragment to pass to sandbox.render(). Does not include refine CSS — pass that via namedStyles. */
  fragment: string;
}

export function buildSandboxDoc(options: SandboxDocOptions): SandboxDocResult {
  const { background, dark, height, html, vertical } = options;

  const bodyDirection = vertical ? 'column' : 'row';
  const bodyBackground = background ?? 'transparent';
  const bodyMinHeight = height ?? 'auto';

  const overrideCss = [
    `*, *::before, *::after { box-sizing: border-box; }`,
    `html { color-scheme: ${dark ? 'dark' : 'light'}; height: fit-content; }`,
    `html, body { margin: 0; padding: 0; overflow: visible; background: transparent; font-family: var(--font-sans, system-ui, sans-serif); touch-action: manipulation; }`,
    `body { display: flex; flex-direction: ${bodyDirection}; flex-wrap: wrap; gap: 1rem; padding: 2rem; padding-bottom: 0; align-items: center; justify-content: center; min-height: ${bodyMinHeight}; background: ${bodyBackground}; }`,
  ].join(' ');

  // Scripts are prepended so they execute before custom elements in the user
  // HTML are parsed and upgraded by the browser.
  const fragment = `<style>${overrideCss}</style>
<script>${refineDeps}</script>
<script>${refineJs}</script>
${html}`;

  return { fragment };
}
