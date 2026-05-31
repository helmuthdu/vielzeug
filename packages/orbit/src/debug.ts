/**
 * @vielzeug/orbit — debug overlay for positioning visualisation.
 *
 * Import from the dedicated sub-path so it is tree-shaken from production bundles:
 * ```ts
 * import { debugFloat } from '@vielzeug/orbit/debug';
 * ```
 */

import type { FloatOptions } from './float';
import type { ComputePositionResult, FloatHandle, ReferenceElement } from './types';

import { float } from './float';

// ── Overlay helpers ───────────────────────────────────────────────────────────

function setStyles(el: HTMLElement, styles: Record<string, string>): void {
  for (const [key, val] of Object.entries(styles)) {
    el.style.setProperty(key, val);
  }
}

function createOverlay(): HTMLElement {
  const el = document.createElement('div');

  el.dataset['orbitDebug'] = '';
  setStyles(el, {
    'font-family': 'monospace',
    'font-size': '11px',
    left: '0',
    'pointer-events': 'none',
    position: 'fixed',
    top: '0',
    'z-index': '2147483647',
  });

  return el;
}

function createPlacementBadge(text: string, x: number, y: number): HTMLElement {
  const el = document.createElement('div');

  el.textContent = text;
  setStyles(el, {
    background: 'rgba(0,100,255,0.85)',
    'border-radius': '3px',
    color: '#fff',
    left: `${x}px`,
    padding: '1px 6px',
    position: 'fixed',
    top: `${Math.max(0, y)}px`,
    'white-space': 'nowrap',
  });

  return el;
}

function createOutlineBox(x: number, y: number, width: number, height: number, color: string): HTMLElement {
  const el = document.createElement('div');

  setStyles(el, {
    border: `1.5px dashed ${color}`,
    height: `${height}px`,
    left: `${x}px`,
    position: 'fixed',
    top: `${y}px`,
    width: `${width}px`,
  });

  return el;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Wraps `float()` and attaches a persistent visual debug overlay to the document.
 *
 * The overlay renders on every position update:
 * - **Blue dashed outline** — the viewport boundary used by overflow detection.
 * - **Orange dashed outline** — the reference element's bounding rect.
 * - **Blue label** — the active placement string (e.g. `"top-start"`).
 *
 * The overlay is automatically removed when `handle.cleanup()` is called.
 *
 * Use only in development. Tree-shaken from production bundles via the sub-path import.
 *
 * @example
 * ```ts
 * import { debugFloat } from '@vielzeug/orbit/debug';
 *
 * const handle = debugFloat(reference, tooltip, {
 *   placement: 'top',
 *   middleware: [offset(8), flip(), shift({ padding: 6 })],
 * });
 * // on teardown:
 * handle.cleanup();
 * ```
 */
export function debugFloat(
  reference: ReferenceElement,
  floating: HTMLElement,
  options: FloatOptions = {},
): FloatHandle {
  const overlay = createOverlay();

  document.body.appendChild(overlay);

  function renderOverlay(result: ComputePositionResult): void {
    overlay.innerHTML = '';

    // Viewport boundary.
    overlay.appendChild(createOutlineBox(1, 1, window.innerWidth - 2, window.innerHeight - 2, 'rgba(0,100,255,0.3)'));

    // Reference element.
    if (reference instanceof Element) {
      const r = reference.getBoundingClientRect();

      overlay.appendChild(createOutlineBox(r.left, r.top, r.width, r.height, 'rgba(255,120,0,0.7)'));
    }

    // Placement label — positioned just above the floating element.
    const fr = floating.getBoundingClientRect();

    overlay.appendChild(createPlacementBadge(result.placement, fr.left, fr.top - 22));
  }

  const userApply = options.apply;

  function wrappedApply(result: ComputePositionResult): void {
    if (userApply) {
      userApply(result);
    } else {
      floating.style.left = `${result.x}px`;
      floating.style.top = `${result.y}px`;
    }

    renderOverlay(result);
  }

  const handle = float(reference, floating, { ...options, apply: wrappedApply });

  return {
    cleanup(): void {
      handle.cleanup();
      overlay.remove();
    },
    cssAnchor: handle.cssAnchor,
    getPosition: () => handle.getPosition(),
    update: () => handle.update(),
  };
}
