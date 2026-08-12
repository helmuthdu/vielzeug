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

const previewRuntime = `
const nativeShowModal = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function () {
  try { nativeShowModal.call(this); } catch {}
  if (!this.open) this.setAttribute('open', '');
};
const overlayTags = new Set(['ORE-COMMAND-PALETTE', 'ORE-DIALOG', 'ORE-DRAWER']);
const overlayFromPath = (path) => path.find((node) => node instanceof HTMLElement && overlayTags.has(node.tagName));
const syncOverlay = (overlay) => {
  const dialog = overlay.shadowRoot?.querySelector('dialog');
  if (!dialog) return;
  dialog.toggleAttribute('open', overlay.hasAttribute('open'));
  dialog.addEventListener('close', () => overlay.removeAttribute('open'), { once: true });
};
const syncAllOverlays = () => document.querySelectorAll([...overlayTags].map((tag) => tag.toLowerCase()).join(',')).forEach(syncOverlay);
new MutationObserver((records) => {
  for (const { target } of records) {
    if (target instanceof HTMLElement && overlayTags.has(target.tagName)) syncOverlay(target);
  }
}).observe(document, { attributes: true, attributeFilter: ['open'], subtree: true });
document.addEventListener('click', (event) => {
  const overlay = overlayFromPath(event.composedPath());
  const closeButton = event.composedPath().find((node) => node instanceof HTMLElement && /^(Close|Close dialog)$/.test(node.getAttribute('aria-label') ?? ''));
  if (overlay && closeButton) overlay.removeAttribute('open');
}, { capture: true });
document.addEventListener('pointerup', (event) => {
  const overlay = overlayFromPath(event.composedPath());
  const dragHandle = event.composedPath().find((node) => node instanceof HTMLElement && node.getAttribute('part') === 'drag-handle');
  if (overlay?.tagName === 'ORE-DRAWER' && dragHandle) overlay.removeAttribute('open');
}, { capture: true });
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  document.querySelectorAll([...overlayTags].map((tag) => tag.toLowerCase() + '[open]').join(',')).forEach((overlay) => overlay.removeAttribute('open'));
}, { capture: true });
document.addEventListener('select', (event) => {
  const overlay = event.target instanceof HTMLElement && overlayTags.has(event.target.tagName) ? event.target : null;
  if (overlay?.tagName === 'ORE-COMMAND-PALETTE') overlay.removeAttribute('open');
});
queueMicrotask(syncAllOverlays);
`;

export interface SandboxDocOptions {
  align?: 'center' | 'end' | 'start' | 'stretch';
  justify?: 'center' | 'end' | 'start';
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
  const { align = 'center', background, dark, dir, height, html, justify = 'start', vertical } = options;
  const previewHtml = html.replace(/^\s*import\s+['"]@vielzeug\/refine\/[^'"]+['"];?\s*$/gm, '');

  const flexDirection = vertical ? 'column' : 'row';
  const bodyBackground = background ?? 'transparent';
  const bodyMinHeight = height ?? 'auto';

  const overrideCss = [
    `*, *::before, *::after { box-sizing: border-box; }`,
    `html { color-scheme: ${dark ? 'dark' : 'light'}; height: fit-content; }`,
    `html, body { margin: 0; padding: 0; overflow: visible; background: transparent; font-family: var(--font-sans, system-ui, sans-serif); touch-action: manipulation; }`,
    // Symmetric padding on all sides — the sandbox iframe auto-resizes to
    // document.body's border-box height (see @vielzeug/sandbox's bridge
    // ResizeObserver), which never includes box-shadow spread. A halo/glow
    // effect (e.g. ore-button's hover/active box-shadow, which is offset
    // downward) that reaches past body's own layout box gets hard-clipped at
    // the iframe's edge with no room below to render into — this used to be
    // `padding-bottom: 0`, which is exactly why those effects showed outside
    // the preview (real page, natural space below) but not inside it.
    `body { display: flex; flex-direction: ${flexDirection}; flex-wrap: wrap; gap: 1rem; padding: 2rem; align-items: ${align}; justify-content: ${justify}; min-height: ${bodyMinHeight}; background: ${bodyBackground}; }`,
  ].join(' ');

  // `buildDocument()` (from @vielzeug/sandbox) only supports `<html lang="...">` — it has no
  // `dir` option, and the sandbox is created once (see useComponentPreview.ts) while `dir` can
  // toggle per render, so it can't be threaded through as a fixed sandbox-creation option
  // anyway. Applying it here via a `display: contents` wrapper instead: it establishes `dir`
  // (and the inherited `direction` CSS property) for every descendant exactly like `<html
  // dir="...">` would, without introducing an extra flex item that would break the `body`
  // flex-centering layout above (`display: contents` removes the wrapper's own box, so its
  // children are laid out as if they were direct children of `body`).
  //
  // Scripts follow user HTML so custom elements upgrade after their light-DOM
  // slots are available to lifecycle hooks.
  const fragment = `<style>${overrideCss}</style>
<div dir="${dir}" style="display: contents">${previewHtml}</div>
<script>${previewRuntime}</script>
<script>${refineDeps}</script>
<script>${refineJs}</script>`;

  return { fragment };
}
