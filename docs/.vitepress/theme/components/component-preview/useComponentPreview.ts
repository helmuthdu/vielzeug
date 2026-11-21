import type { SandboxHandle, SandboxMessage } from '@vielzeug/sandbox';
import { createSandbox } from '@vielzeug/sandbox';
import { useData } from 'vitepress';
import type { Ref, VNode } from 'vue';
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';

import { buildSandboxDoc, REFINE_CSS_ID, refineCss } from './sandboxDoc';
import { useRefineHmr } from './useRefineHmr';
import { extractCodeFromSlot } from './vnode';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'full';

export interface ComponentPreviewProps {
  align?: 'center' | 'end' | 'start' | 'stretch';
  background?: string;
  height?: string;
  justify?: 'center' | 'end' | 'start';
  vertical?: boolean;
}

export const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '1280px',
  full: '100%',
  mobile: '375px',
  tablet: '768px',
};

export const SHOW_CODE_STORAGE_KEY = 'vielzeug:component-preview:show-code';

function loadShowCodePreference(): boolean {
  if (typeof window === 'undefined') return false;

  return window.sessionStorage.getItem(SHOW_CODE_STORAGE_KEY) === 'true';
}

function persistShowCodePreference(value: boolean): void {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(SHOW_CODE_STORAGE_KEY, String(value));
}

interface PreviewSurface {
  containerRef: Ref<HTMLDivElement | null>;
  error: Ref<string | null>;
  isReady: Ref<boolean>;
  sandbox: SandboxHandle | null;
}

function createPreviewSurface(): PreviewSurface {
  return {
    containerRef: ref(null),
    error: ref(null),
    isReady: ref(false),
    sandbox: null,
  };
}

export function useComponentPreview(props: ComponentPreviewProps, slotVNodes: VNode[] | undefined) {
  const { isDark } = useData();

  const isExpanded = ref(false);
  const viewportSize = ref<ViewportSize>('full');
  const expandedAvailableWidth = ref(0);
  const isCopied = ref(false);
  const copyStatus = ref('');
  const isRtl = ref(false);
  const showCode = ref(false);
  const codeBlock = ref<{ html: string; vnode: VNode } | null>(null);

  const inlineCanvasRef = ref<HTMLDivElement | null>(null);
  const expandedStageRef = ref<HTMLDivElement | null>(null);
  const inlineSurface = createPreviewSurface();
  const expandedSurface = createPreviewSurface();

  let latestFragment: string | null = null;
  let inlineVisible = false;
  let copyTimer: ReturnType<typeof setTimeout> | null = null;
  let visibilityObserver: IntersectionObserver | null = null;
  let widthObserver: ResizeObserver | null = null;

  const viewportWidth = computed(() => VIEWPORT_WIDTHS[viewportSize.value]);
  const expandedWidthLabel = computed(() => {
    if (viewportSize.value !== 'full') return viewportWidth.value;
    if (expandedAvailableWidth.value > 0) return `${Math.round(expandedAvailableWidth.value)}px`;

    return 'Full width';
  });

  const backgroundStyle = computed(() =>
    props.background
      ? { backgroundImage: `url(${props.background})`, backgroundPosition: 'center', backgroundSize: 'cover' }
      : {},
  );

  const updateExpandedWidth = (width: number): void => {
    expandedAvailableWidth.value = Number.isFinite(width) ? Math.max(0, width) : 0;
  };

  const copyCode = async (): Promise<void> => {
    if (!codeBlock.value) return;

    try {
      await navigator.clipboard.writeText(codeBlock.value.html.trim());
      isCopied.value = true;
      copyStatus.value = 'Copied';
    } catch {
      isCopied.value = false;
      copyStatus.value = 'Copy failed';
    }

    if (copyTimer) clearTimeout(copyTimer);

    copyTimer = setTimeout(() => {
      isCopied.value = false;
      copyStatus.value = '';
      copyTimer = null;
    }, 2000);
  };

  const toggleShowCode = (): void => {
    const next = !showCode.value;

    persistShowCodePreference(next);
    showCode.value = next;
  };

  const toggleDirection = (): void => {
    isRtl.value = !isRtl.value;
  };

  const handleExpandedOpenChange = (event: Event): void => {
    if (event.target !== event.currentTarget) return;

    const { open } = (event as CustomEvent<{ open: boolean }>).detail;

    isExpanded.value = open;

    if (open) {
      void nextTick().then(() => {
        updateExpandedWidth(expandedStageRef.value?.getBoundingClientRect().width ?? 0);
      });
    }
  };

  const handleViewportChange = (event: Event): void => {
    const { values } = (event as CustomEvent<{ values?: string[] }>).detail ?? {};
    const selected = values?.[0];

    if (selected === 'full' || selected === 'mobile' || selected === 'tablet' || selected === 'desktop') {
      viewportSize.value = selected;
    }
  };

  function ensureSandbox(surface: PreviewSurface): SandboxHandle {
    if (surface.sandbox) return surface.sandbox;

    const container = surface.containerRef.value;

    if (!container) throw new Error('The preview sandbox container is unavailable.');

    const sandbox = createSandbox(container, { styles: { [REFINE_CSS_ID]: refineCss } });

    surface.sandbox = sandbox;
    sandbox.onMessage((message: SandboxMessage) => {
      if (surface.sandbox !== sandbox) return;

      if (message.type === 'error') {
        surface.error.value = message.message || 'The sandbox reported an error.';
        return;
      }

      if (message.type === 'resize') {
        const iframe = container.querySelector<HTMLIFrameElement>('iframe');
        const bleed = props.height ? 0 : 32;

        surface.error.value = null;
        surface.isReady.value = true;
        if (iframe) iframe.style.height = `${message.height + bleed}px`;
      }
    });

    return sandbox;
  }

  function renderSurface(surface: PreviewSurface, fragment: string): void {
    if (!surface.containerRef.value) return;

    surface.error.value = null;
    surface.isReady.value = false;

    const sandbox = ensureSandbox(surface);

    void sandbox.render(fragment).catch((error: unknown) => {
      if (surface.sandbox !== sandbox) return;

      const message = error instanceof Error ? error.message : String(error);

      surface.error.value = message || 'The sandbox could not render this preview.';
    });
  }

  function disposeSurface(surface: PreviewSurface): void {
    surface.sandbox?.dispose();
    surface.sandbox = null;
    surface.isReady.value = false;
    surface.error.value = null;
  }

  // biome-ignore lint/correctness/noUnusedVariables: bound through the template retry event
  const retryInlinePreview = (): void => {
    if (latestFragment) renderSurface(inlineSurface, latestFragment);
  };

  // biome-ignore lint/correctness/noUnusedVariables: bound through the template retry event
  const retryExpandedPreview = (): void => {
    if (latestFragment) renderSurface(expandedSurface, latestFragment);
  };

  const patchCss = (css: string): void => {
    inlineSurface.sandbox?.updateStyle(REFINE_CSS_ID, css);
    expandedSurface.sandbox?.updateStyle(REFINE_CSS_ID, css);
  };

  if (slotVNodes?.length) {
    const found = extractCodeFromSlot(slotVNodes);

    if (found) {
      codeBlock.value = { html: found.text.trim(), vnode: found.vnode };
    }
  }

  watchEffect(
    () => {
      const block = codeBlock.value;

      if (!block) {
        latestFragment = null;
        return;
      }

      const { fragment } = buildSandboxDoc({
        align: props.align,
        background: props.background,
        dark: isDark.value,
        dir: isRtl.value ? 'rtl' : 'ltr',
        height: props.height,
        html: block.html,
        justify: props.justify,
        vertical: !!props.vertical,
      });

      latestFragment = fragment;

      if (inlineVisible) renderSurface(inlineSurface, fragment);
      if (isExpanded.value) renderSurface(expandedSurface, fragment);
    },
    { flush: 'post' },
  );

  watch(isExpanded, (open) => {
    if (open) return;

    disposeSurface(expandedSurface);
    expandedAvailableWidth.value = 0;
  });

  onMounted(() => {
    showCode.value = loadShowCodePreference();
    useRefineHmr(patchCss);

    if (expandedStageRef.value && typeof ResizeObserver !== 'undefined') {
      widthObserver = new ResizeObserver(([entry]) => {
        if (entry) updateExpandedWidth(entry.contentRect.width);
      });
      widthObserver.observe(expandedStageRef.value);
    } else {
      updateExpandedWidth(expandedStageRef.value?.getBoundingClientRect().width ?? 0);
    }

    const revealInlinePreview = (): void => {
      inlineVisible = true;
      visibilityObserver?.disconnect();
      if (latestFragment) renderSurface(inlineSurface, latestFragment);
    };

    if (!inlineCanvasRef.value || typeof IntersectionObserver === 'undefined') {
      revealInlinePreview();
    } else {
      visibilityObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) revealInlinePreview();
        },
        { rootMargin: '600px 0px' },
      );
      visibilityObserver.observe(inlineCanvasRef.value);
    }
  });

  onUnmounted(() => {
    if (copyTimer) clearTimeout(copyTimer);

    visibilityObserver?.disconnect();
    widthObserver?.disconnect();
    disposeSurface(inlineSurface);
    disposeSurface(expandedSurface);
  });

  return {
    backgroundStyle,
    codeBlock,
    copyCode,
    copyStatus,
    expandedAvailableWidth,
    expandedPreviewError: expandedSurface.error,
    expandedPreviewReady: expandedSurface.isReady,
    expandedStageRef,
    expandedSurfaceContainerRef: expandedSurface.containerRef,
    expandedWidthLabel,
    handleExpandedOpenChange,
    handleViewportChange,
    inlineCanvasRef,
    inlinePreviewError: inlineSurface.error,
    inlinePreviewReady: inlineSurface.isReady,
    inlineSandboxContainerRef: inlineSurface.containerRef,
    isCopied,
    isExpanded,
    isRtl,
    showCode,
    toggleDirection,
    toggleShowCode,
    updateExpandedWidth,
    viewportSize,
    viewportWidth,
  };
}
