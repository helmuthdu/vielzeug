import '@vielzeug/refine/dialog';
import '@vielzeug/refine/copy-command';
import '@vielzeug/refine/button';

import { define, html, onCleanup, ref } from '@vielzeug/ore';
import { effect, signal } from '@vielzeug/ripple';
import type { SandboxHandle } from '@vielzeug/sandbox';
import { createBuildPreview, renderBuildPreview } from '../../core/embed-preview';
import { t } from '../../core/i18n';
import type { Model, PriceBreakdown } from '../../core/types';

export interface ShareBuildPayload {
  breakdown: PriceBreakdown;
  model: Model;
  selections: { color: string; packages: string[]; trim: string; wheels: string };
  url: string;
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

    function onClose(): void {
      requestSignal.value = null;
    }

    function onOpenChange(event: CustomEvent<{ open: boolean }>): void {
      if (!event.detail.open) onClose();
    }

    effect(() => {
      const payload = requestSignal.value;
      const container = containerRef.value;

      if (!payload || !container) return;

      sandbox?.dispose();
      sandbox = createBuildPreview(container);
      void renderBuildPreview(sandbox, payload.model, payload.selections, payload.breakdown).catch(console.error);
    });

    onCleanup(() => sandbox?.dispose());

    const buildUrl = (): string => requestSignal.value?.url ?? '';

    function embedSnippet(): string {
      const url = buildUrl().replaceAll('&', '&amp;');
      return url ? `<iframe src="${url}" width="360" height="220"></iframe>` : '';
    }

    return html`
      <ore-dialog
        size="md"
        dismissible
        label=${() => t('confirmation.shareBuild')}
        ?open=${() => requestSignal.value !== null}
        @open-change=${onOpenChange}>
        <div class="share-build__preview" ref=${containerRef}></div>
        <div class="share-build__commands">
          <span class="share-build__label">${() => t('confirmation.copyBuildLink')}</span>
          <ore-copy-command value=${buildUrl} size="sm"></ore-copy-command>
          <details>
            <summary class="share-build__label">${() => t('confirmation.embedBuild')}</summary>
            <ore-copy-command value=${embedSnippet} size="sm"></ore-copy-command>
          </details>
        </div>
        <div slot="footer">
          <ore-button rounded variant="bordered" @click=${onClose}>${() => t('common.close')}</ore-button>
        </div>
      </ore-dialog>
    `;
  },
  shadow: false,
});
