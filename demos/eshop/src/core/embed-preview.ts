import { createSandbox, type SandboxHandle } from '@vielzeug/sandbox';

import type { Model, PriceBreakdown } from './types';

import { formatPrice } from './currency';

/**
 * Renders a shareable "build summary" card inside a sandboxed iframe (`@vielzeug/sandbox`) — the
 * same isolation a real dealership site would want for embeddable/exportable content it doesn't
 * fully control the styling of. Used by `ui/components/share-build-dialog.ts`'s live preview.
 */
export function createBuildPreview(container: HTMLElement): SandboxHandle {
  return createSandbox(container, {
    lang: 'en',
    namedStyles: {
      base: `
      :root { color-scheme: light; }
      body { margin: 0; font-family: system-ui, sans-serif; background: #0b0c10; color: #f5f6f8; }
      .card { padding: 24px; }
      .eyebrow { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9aa3ad; margin: 0 0 4px; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      .tagline { color: #c7ccd1; margin: 0 0 16px; font-size: 13px; }
      dl { display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; margin: 0 0 16px; font-size: 13px; }
      dt { color: #9aa3ad; }
      dd { margin: 0; text-align: right; }
      .total { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #2a2d33; font-weight: 700; }
      `,
    },
    title: 'Vielzeug Motors — My Build',
  });
}

export function renderBuildPreview(
  handle: SandboxHandle,
  model: Model,
  selections: { color: string; trim: string; wheels: string },
  breakdown: PriceBreakdown,
): Promise<void> {
  return handle.render(`
    <div class="card">
      <p class="eyebrow">Vielzeug Motors — My Build</p>
      <h1>${model.name}</h1>
      <p class="tagline">${model.tagline}</p>
      <dl>
        <dt>Trim</dt><dd>${selections.trim}</dd>
        <dt>Paint</dt><dd>${selections.color}</dd>
        <dt>Wheels</dt><dd>${selections.wheels}</dd>
      </dl>
      <div class="total"><span>Estimated total</span><span>${formatPrice(breakdown.total)}</span></div>
    </div>
  `);
}
