// useComponentPreview.ts
//
// Encapsulates all state, derived values, actions, and lifecycle logic for
// ComponentPreview. The Vue component becomes a thin template shell that owns
// only props/slots and delegates everything else here.

import type { VNode } from 'vue';

import { useData } from 'vitepress';
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';

import { buildSandboxDoc, REFINE_CSS_ID } from './sandboxDoc';
import { useRefineHmr } from './useRefineHmr';
import { extractCodeFromSlot } from './vnode';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'full';

export interface ComponentPreviewProps {
  title?: string;
  vertical?: boolean;
  background?: string;
  colorful?: boolean;
  height?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '1280px',
  full: '100%',
  mobile: '375px',
  tablet: '768px',
};

// ── Composable ────────────────────────────────────────────────────────────────

export function useComponentPreview(props: ComponentPreviewProps, slotVNodes: VNode[] | undefined) {
  const { isDark } = useData();

  // ── UI state ────────────────────────────────────────────────────────────────

  const isMaximized = ref(false);
  const viewportSize = ref<ViewportSize>('full');
  const isCopied = ref(false);
  const isRtl = ref(false);

  let savedBodyOverflow = '';
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Code extraction ─────────────────────────────────────────────────────────

  const codeBlock = ref<{ html: string; vnode: VNode } | null>(null);

  // ── Iframe ──────────────────────────────────────────────────────────────────

  const sandboxContainerRef = ref<HTMLDivElement | null>(null);
  let iframe: HTMLIFrameElement | null = null;

  // ── Derived values ──────────────────────────────────────────────────────────

  const viewportWidth = computed(() => VIEWPORT_WIDTHS[viewportSize.value]);

  const backgroundStyle = computed(() =>
    props.background
      ? { backgroundImage: `url(${props.background})`, backgroundPosition: 'center', backgroundSize: 'cover' }
      : {},
  );

  // ── Actions ─────────────────────────────────────────────────────────────────

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(codeBlock.value?.html.trim() ?? '');
      isCopied.value = true;
      copyTimer = setTimeout(() => {
        isCopied.value = false;
      }, 2000);
    } catch (e) {
      console.warn('[ComponentPreview] Copy failed:', e);
    }
  };

  const toggleDirection = () => {
    isRtl.value = !isRtl.value;
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') toggleMaximize();
  };

  const toggleMaximize = () => {
    if (!isMaximized.value) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      isMaximized.value = true;
      document.addEventListener('keydown', handleKeydown);
    } else {
      document.body.style.overflow = savedBodyOverflow;
      isMaximized.value = false;

      if (viewportSize.value === 'desktop') viewportSize.value = 'full';

      document.removeEventListener('keydown', handleKeydown);
    }
  };

  const setViewportSize = (size: ViewportSize) => {
    viewportSize.value = viewportSize.value === size ? 'full' : size;
  };

  // ── Iframe helpers ──────────────────────────────────────────────────────────

  function ensureIframe(container: HTMLDivElement): HTMLIFrameElement {
    if (iframe) return iframe;

    iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.style.width = '100%';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.background = 'transparent';

    if (props.height) iframe.style.minHeight = props.height;

    container.appendChild(iframe);

    // Auto-resize: the fragment inlines a ResizeObserver that posts { type: 'resize', height }.
    window.addEventListener('message', onMessage);

    return iframe;
  }

  function onMessage(event: MessageEvent): void {
    if (!iframe || event.source !== iframe.contentWindow) return;

    const msg = event.data as { height?: number; type?: string };

    if (msg?.type === 'resize' && typeof msg.height === 'number') {
      iframe.style.height = `${msg.height}px`;
    }
  }

  function render(fragment: string): void {
    if (!sandboxContainerRef.value) return;

    ensureIframe(sandboxContainerRef.value).srcdoc = fragment;
  }

  // Hot-patch the refine CSS <style id="refine-css"> without a full re-render.
  function patchCss(css: string): void {
    iframe?.contentWindow?.postMessage({ css, id: REFINE_CSS_ID, type: 'style-patch' }, '*');
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  if (slotVNodes?.length) {
    const found = extractCodeFromSlot(slotVNodes);

    if (found) {
      const html = found.text
        .trim()
        .replace(/<script\b[^>]*\btype=["']module["'][^>]*>[\s\S]*?<\/script>/gi, '')
        .trim();

      codeBlock.value = { html, vnode: found.vnode };
    }
  }

  onMounted(() => {
    useRefineHmr(patchCss);

    watchEffect(
      () => {
        if (!sandboxContainerRef.value || !codeBlock.value) return;

        const { fragment } = buildSandboxDoc({
          background: props.background,
          dark: isDark.value,
          dir: isRtl.value ? 'rtl' : 'ltr',
          height: props.height,
          html: codeBlock.value.html,
          vertical: !!props.vertical,
        });

        render(fragment);
      },
      { flush: 'post' },
    );
  });

  onUnmounted(() => {
    if (copyTimer) clearTimeout(copyTimer);

    if (isMaximized.value) {
      document.body.style.overflow = savedBodyOverflow;
      document.removeEventListener('keydown', handleKeydown);
    }

    window.removeEventListener('message', onMessage);

    if (iframe) {
      iframe.remove();
      iframe = null;
    }
  });

  return {
    backgroundStyle,
    codeBlock,
    copyCode,
    isCopied,
    isMaximized,
    isRtl,
    sandboxContainerRef,
    setViewportSize,
    toggleDirection,
    toggleMaximize,
    viewportSize,
    viewportWidth,
  };
}
