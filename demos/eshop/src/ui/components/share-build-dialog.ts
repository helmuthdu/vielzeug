import '@vielzeug/refine/dialog';
import '@vielzeug/refine/copy-command';
import '@vielzeug/refine/button';

import type { SandboxHandle } from '@vielzeug/sandbox';

import { define, html, onCleanup, ref } from '@vielzeug/ore';
import { effect, signal } from '@vielzeug/ripple';

import type { Model, PriceBreakdown } from '../../core/types';

import { createBuildPreview, renderBuildPreview } from '../../core/embed-preview';
import { t } from '../../core/i18n';

export interface ShareBuildPayload {
  breakdown: PriceBreakdown;
  model: Model;
  selections: { color: string; trim: string; wheels: string };
}

const requestSignal = signal<ShareBuildPayload | null>(null);

export function openShareBuildDialog(payload: ShareBuildPayload): void {
  requestSignal.value = payload;
}

/**
 * Renders the shopper's build inside a sandboxed iframe (`@vielzeug/sandbox`) so the
 * "embed this build" snippet previews exactly what a third-party page would render, fully
 * isolated from this app's own styles/scripts — the same isolation a real dealership site
 * would want before trusting a shopper-generated share link.
 */
define('share-build-dialog', {
  setup() {
    const containerRef = ref<HTMLElement>();

    let sandbox: SandboxHandle | null = null;

    function onClose(e?: Event): void {
      if (e && e.target !== e.currentTarget) return;

      requestSignal.value = null;
    }

    effect(() => {
      const payload = requestSignal.value;
      const container = containerRef.value;

      if (!payload || !container) return;

      sandbox?.dispose();
      sandbox = createBuildPreview(container);
      void renderBuildPreview(sandbox, payload.model, payload.selections, payload.breakdown);
    });

    onCleanup(() => sandbox?.dispose());

    function embedSnippet(): string {
      const payload = requestSignal.value;

      if (!payload) return '';

      return `<iframe src="https://vielzeug-motors.example/embed/${payload.model.slug}" width="360" height="220"></iframe>`;
    }

    return html`
      <ore-dialog
        size="md"
        dismissible
        :label=${() => t('confirmation.shareBuild')}
        ?open=${() => requestSignal.value !== null}
        @close=${onClose}>
        <div class="share-build__preview" ref=${containerRef}></div>
        <ore-copy-command :value=${embedSnippet} size="sm"></ore-copy-command>
        <div slot="footer">
          <ore-button rounded variant="bordered" @click=${onClose}>${() => t('common.close')}</ore-button>
        </div>
      </ore-dialog>
    `;
  },
  shadow: false,
});
