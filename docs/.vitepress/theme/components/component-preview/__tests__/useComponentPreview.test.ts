import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, h } from 'vue';

import { SHOW_CODE_STORAGE_KEY, useComponentPreview } from '../useComponentPreview';

vi.mock('vitepress', () => ({
  useData: () => ({ isDark: { value: false } }),
}));

function mountPreview() {
  let preview: ReturnType<typeof useComponentPreview> | undefined;
  const app = createApp({
    setup() {
      preview = useComponentPreview({}, [
        h('div', { class: 'language-html' }, [h('pre', [h('code', '<ore-button>Preview</ore-button>')])]),
      ]);

      return () => h('div');
    },
  });
  const host = document.createElement('div');

  document.body.append(host);
  app.mount(host);

  if (!preview) throw new Error('Component preview did not mount.');

  return {
    dispose() {
      app.unmount();
      host.remove();
    },
    preview,
  };
}

describe('useComponentPreview()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shares and persists the show-code preference across previews', () => {
    sessionStorage.setItem(SHOW_CODE_STORAGE_KEY, 'true');

    const first = mountPreview();
    const second = mountPreview();

    try {
      expect(first.preview.showCode.value).toBe(true);
      expect(second.preview.showCode.value).toBe(true);

      first.preview.toggleShowCode();

      expect(first.preview.showCode.value).toBe(false);
      expect(second.preview.showCode.value).toBe(false);
      expect(sessionStorage.getItem(SHOW_CODE_STORAGE_KEY)).toBe('false');
    } finally {
      second.dispose();
      first.dispose();
    }
  });

  it('updates the viewport selection and returns to full width', () => {
    const mounted = mountPreview();

    mounted.preview.updateExpandedWidth(1280);
    mounted.preview.handleViewportChange(new CustomEvent('change', { detail: { values: ['mobile'] } }));

    expect(mounted.preview.viewportSize.value).toBe('mobile');
    expect(mounted.preview.viewportWidth.value).toBe('375px');

    mounted.preview.handleViewportChange(new CustomEvent('change', { detail: { values: ['full'] } }));

    expect(mounted.preview.viewportSize.value).toBe('full');
    expect(mounted.preview.viewportWidth.value).toBe('100%');

    mounted.dispose();
  });

  it('keeps fixed viewport presets exact when they exceed the expanded stage', () => {
    const mounted = mountPreview();

    mounted.preview.updateExpandedWidth(700);

    mounted.preview.handleViewportChange(new CustomEvent('change', { detail: { values: ['desktop'] } }));
    expect(mounted.preview.viewportSize.value).toBe('desktop');
    expect(mounted.preview.viewportWidth.value).toBe('1280px');

    mounted.preview.updateExpandedWidth(600);
    expect(mounted.preview.viewportSize.value).toBe('desktop');
    expect(mounted.preview.viewportWidth.value).toBe('1280px');

    mounted.preview.handleViewportChange(new CustomEvent('change', { detail: { values: ['mobile'] } }));
    expect(mounted.preview.viewportSize.value).toBe('mobile');
    expect(mounted.preview.viewportWidth.value).toBe('375px');

    mounted.dispose();
  });

  it('ignores open-change events from nested overlays', () => {
    const mounted = mountPreview();
    const dialog = document.createElement('ore-dialog');
    const tooltip = document.createElement('ore-tooltip');

    dialog.append(tooltip);
    dialog.addEventListener('open-change', mounted.preview.handleExpandedOpenChange);
    dialog.dispatchEvent(new CustomEvent('open-change', { detail: { open: true, reason: 'programmatic' } }));
    tooltip.dispatchEvent(
      new CustomEvent('open-change', { bubbles: true, composed: true, detail: { open: false, reason: 'trigger' } }),
    );

    expect(mounted.preview.isExpanded.value).toBe(true);
    mounted.dispose();
  });

  it('reports clipboard rejection in the copy status', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const writeText = vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error('Permission denied'));
    const mounted = mountPreview();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    try {
      await mounted.preview.copyCode();

      expect(writeText).toHaveBeenCalledWith('<ore-button>Preview</ore-button>');
      expect(mounted.preview.copyStatus.value).toBe('Copy failed');
      expect(mounted.preview.isCopied.value).toBe(false);
    } finally {
      mounted.dispose();

      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });
});
