// useComponentPreview.ts
//
// Encapsulates all state, derived values, actions, and lifecycle logic for
// ComponentPreview. The Vue component becomes a thin template shell that owns
// only props/slots and delegates everything else here.

import type { VNode } from 'vue';

import { createSandbox } from '@vielzeug/sandbox';
import { useData } from 'vitepress';
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue';

import { buildSandboxDoc } from './sandboxDoc';
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

// Viewport breakpoint widths — plain pixel values; internal sandbox padding
// is owned by the sandbox body, not the wrapper element.
export const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '1280px',
  full: '100%',
  mobile: '375px',
  tablet: '768px',
};

// Inline SVG path data for toolbar icons. Defined here so the template stays
// readable and icon changes require editing one place, not hunting through markup.
export const ICONS = {
  copied: `<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 6 9 17l-5-5"/>`,
  copy: `<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></g>`,
  desktop: `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></g>`,
  maximize: `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/></g>`,
  minimize: `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 10 21 3"/><path d="M20 10H14V4"/><path d="m3 21 7-7"/><path d="m4 14h6v6"/></g>`,
  mobile: `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="m12 18h.01"/></g>`,
  tablet: `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="17.56" height="20" x="3.22" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/></g>`,
} as const;

// ── Composable ────────────────────────────────────────────────────────────────

export function useComponentPreview(props: ComponentPreviewProps, slotVNodes: VNode[] | undefined) {
  const { isDark } = useData();

  // ── UI state ────────────────────────────────────────────────────────────────

  const isMaximized = ref(false);
  const viewportSize = ref<ViewportSize>('full');
  const isCopied = ref(false);
  const isRtl = ref(false);

  // Not reactive — side-effect bookkeeping only, never drives the template.
  let savedBodyOverflow = '';
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Code extraction ─────────────────────────────────────────────────────────
  //
  // VitePress renders fenced code blocks at build time into a div.language-* VNode.
  // extractCodeFromSlot walks the slot tree to find it, returning both the raw text
  // (sent to the sandbox) and the processed VNode (rendered in the Code tab).
  // The text is stripped of <script> tags once at extraction time.

  const codeBlock = ref<{ html: string; vnode: VNode } | null>(null);

  // ── Sandbox ─────────────────────────────────────────────────────────────────

  const sandboxContainerRef = ref<HTMLDivElement | null>(null);

  // Cached after first createSandbox() — avoids a querySelector on every resize message.
  let sandboxIframe: HTMLIFrameElement | null = null;
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

  // Keyboard Escape handler registered only while maximized — avoids stacking
  // listeners across multiple ComponentPreview instances on the same page.
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

  // ── Sandbox message handler ─────────────────────────────────────────────────

  // Auto-resize the iframe to its content height via postMessage from the sandbox.
  // sandboxIframe is cached at creation time so we only pay one querySelector
  // per ComponentPreview lifetime, not per resize event.
  const onSandboxMessage = (event: MessageEvent) => {
    if (!sandboxIframe || event.source !== sandboxIframe.contentWindow) return;

    if (event.data?.type === 'resize' && typeof event.data.height === 'number') {
      sandboxIframe.style.height = `${event.data.height}px`;
    }
  };

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  // Extract code from slot VNodes synchronously — VitePress populates slots
  // at setup time, so they are available before onMounted.
  if (slotVNodes?.length) {
    const found = extractCodeFromSlot(slotVNodes);

    if (found) {
      // Strip only type="module" scripts — they contain ES module imports
      // (e.g. import '@vielzeug/refine/toast') that would fail in the sandbox
      // since refine is already loaded as a global IIFE. Plain inline scripts
      // that define helper functions for onclick handlers must be preserved.
      const html = found.text
        .trim()
        .replace(/<script\b[^>]*\btype=["']module["'][^>]*>[\s\S]*?<\/script>/gi, '')
        .trim();

      codeBlock.value = { html, vnode: found.vnode };
    }
  }

  onMounted(() => {
    window.addEventListener('message', onSandboxMessage);

    // watchEffect (flush:'post') re-renders whenever any reactive dep changes —
    // isRtl, isDark, props.vertical — without an explicit dep list.
    // flush:'post' ensures sandboxContainerRef is populated before the first run.
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
        }

        sandbox.render(fragment);

        // iframe is created lazily by render() — cache it now so onSandboxMessage
        // can match event.source correctly for auto-resize.
        if (!sandboxIframe) {
          sandboxIframe = sandboxContainerRef.value.querySelector('iframe');

          if (sandboxIframe) {
            sandboxIframe.setAttribute('allowtransparency', 'true');

            if (props.height) {
              sandboxIframe.style.minHeight = props.height;
            }
          }
        }
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

    window.removeEventListener('message', onSandboxMessage);
    sandbox?.dispose();
    sandbox = null;
    sandboxIframe = null;
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
