// useComponentPreview.ts
//
// Encapsulates all state, derived values, actions, and lifecycle logic for
// ComponentPreview. The Vue component becomes a thin template shell that owns
// only props/slots and delegates everything else here.

import type { VNode } from 'vue';

import { createSandbox } from '@vielzeug/sandbox';
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

  // ── Sandbox ─────────────────────────────────────────────────────────────────

  const sandboxContainerRef = ref<HTMLDivElement | null>(null);

  let sandbox: ReturnType<typeof createSandbox> | null = null;

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
    // HMR: when refine's CSS is rebuilt, hot-patch all live sandboxes on the
    // page without a full reload — no page state or scroll position is lost.
    useRefineHmr((css) => sandbox?.updateStyle(REFINE_CSS_ID, css));

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

        if (!sandbox) {
          sandbox = createSandbox(sandboxContainerRef.value);

          // Route iframe auto-resize through sandbox.onMessage so we don't need
          // to maintain a manual window listener or a cached iframe reference.
          sandbox.onMessage((msg) => {
            if (msg.type === 'resize') {
              const iframe = sandboxContainerRef.value?.querySelector('iframe') as HTMLIFrameElement | null;

              if (iframe) iframe.style.height = `${msg.height}px`;
            }
          });
        }

        sandbox.render(fragment).then(() => {
          // iframe is created lazily by render() — configure it after first render.
          const iframe = sandboxContainerRef.value?.querySelector('iframe') as HTMLIFrameElement | null;

          if (iframe && !iframe.hasAttribute('allowtransparency')) {
            iframe.setAttribute('allowtransparency', 'true');

            if (props.height) {
              iframe.style.minHeight = props.height;
            }
          }
        });
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

    sandbox?.dispose();
    sandbox = null;
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
