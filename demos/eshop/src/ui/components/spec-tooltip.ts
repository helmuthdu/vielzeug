import { float, type FloatHandle } from '@vielzeug/orbit';
import { tooltip as tooltipPreset } from '@vielzeug/orbit/presets';
import { define, getHost, html, onCleanup, onMounted, prop, ref } from '@vielzeug/ore';

/**
 * A spec/package explainer tooltip, positioned directly with `@vielzeug/orbit`'s `float()` +
 * `tooltip` preset — used instead of `<ore-tooltip>` (refine's own wrapper around the same
 * primitive) specifically to exercise orbit's positioning API at the app layer, as requested.
 * Wraps arbitrary trigger content via a real `<slot>`, so it needs shadow DOM (the default for
 * `define()` — unlike the rest of this app's light-DOM view/dialog components).
 */
define<{ text: string }>('spec-tooltip', {
  props: {
    text: prop.string<string>(''),
  },
  setup(props) {
    const host = getHost();
    const panelRef = ref<HTMLElement>();

    // Links the trigger to its explainer text via `aria-describedby` so screen-reader users get
    // the same context sighted users get from hover/focus — without this id, the tooltip panel
    // is DOM-adjacent but programmatically invisible to assistive tech.
    const panelId = `spec-tooltip-${Math.random().toString(36).slice(2, 9)}`;

    let floatHandle: FloatHandle | null = null;

    function show(): void {
      const panel = panelRef.value;

      if (!panel) return;

      panel.classList.add('visible');
      floatHandle?.dispose();
      floatHandle = float(host, panel, tooltipPreset({ offset: 8 }));
    }

    function hide(): void {
      floatHandle?.dispose();
      floatHandle = null;
      panelRef.value?.classList.remove('visible');
    }

    onMounted(() => {
      host.addEventListener('pointerenter', show);
      host.addEventListener('pointerleave', hide);
      host.addEventListener('focusin', show);
      host.addEventListener('focusout', hide);

      onCleanup(() => {
        host.removeEventListener('pointerenter', show);
        host.removeEventListener('pointerleave', hide);
        host.removeEventListener('focusin', show);
        host.removeEventListener('focusout', hide);
        floatHandle?.dispose();
      });
    });

    return html`
      <span class="trigger" tabindex="0" aria-describedby=${panelId}><slot></slot></span>
      <div class="panel" ref=${panelRef} id=${panelId} role="tooltip">${() => props.text.value}</div>
      <style>
        :host {
          display: inline-flex;
        }

        .trigger {
          display: inline-flex;
          align-items: center;
          cursor: help;
        }

        .panel {
          position: fixed;
          top: 0;
          left: 0;
          z-index: var(--z-tooltip, 1100);
          max-width: 220px;
          padding: var(--size-2, 0.5rem) var(--size-3, 0.75rem);
          font-size: var(--text-xs, 0.75rem);
          line-height: 1.4;
          color: var(--color-contrast-contrast, #fff);
          pointer-events: none;
          visibility: hidden;
          background: var(--color-contrast-900, #111);
          border-radius: var(--rounded-md, 6px);
          opacity: 0;
          transition: opacity 0.1s ease;
        }

        .panel.visible {
          visibility: visible;
          opacity: 1;
        }
      </style>
    `;
  },
});
