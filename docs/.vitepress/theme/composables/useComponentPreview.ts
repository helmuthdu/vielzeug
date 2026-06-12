import { computed, onUnmounted, ref, watch, type Ref } from 'vue';
import { buildFrameSrcdoc } from '../components/PreviewFrame';
import sigilStyles from '@vielzeug/sigil/styles/styles.css?inline';
import prismStyles from '@vielzeug/prism/theme/prism.css?inline';

export type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'full';

export interface UseComponentPreviewOptions {
  codeProp: Ref<string>;
  dir: Ref<'ltr' | 'rtl'>;
}

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  mobile: 'calc(375px + (var(--size-4) * 2))',
  tablet: 'calc(768px + (var(--size-4) * 2))',
  desktop: 'calc(1280px + (var(--size-4) * 2))',
  full: '100%',
};

function parseCode(raw: string): { html: string; script: string } {
  const scriptMatch = raw.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
  const script = scriptMatch
    ? scriptMatch[1]
        .split('\n')
        .filter((line) => !/^\s*import\s/.test(line))
        .join('\n')
        .trim()
    : '';
  // Strip all script blocks including multiline imports from html portion
  const html = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').trim();
  return { html, script };
}

export function useComponentPreview(options: UseComponentPreviewOptions) {
  const { codeProp, dir } = options;

  // ── Editing state ─────────────────────────────────────────────────────────
  const editableCode = ref(codeProp.value);
  // Keep editable in sync when the prop changes (page navigation)
  watch(codeProp, (v) => { editableCode.value = v; });

  // ── UI state ──────────────────────────────────────────────────────────────
  const isCopied = ref(false);
  const isMaximized = ref(false);
  const viewportSize = ref<ViewportSize>('full');

  // ── Derived ───────────────────────────────────────────────────────────────
  const parsed = computed(() => parseCode(editableCode.value));

  const srcdoc = computed(() =>
    buildFrameSrcdoc({
      html: parsed.value.html,
      script: parsed.value.script,
      sigilStyles,
      prismStyles,
      dir: dir.value,
    }),
  );

  const viewportWidth = computed(() => VIEWPORT_WIDTHS[viewportSize.value]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(editableCode.value.trim());
      isCopied.value = true;
      setTimeout(() => { isCopied.value = false; }, 2000);
    } catch (e) {
      console.warn('[ComponentPreview] Copy failed:', e);
    }
  }

  function setViewportSize(size: ViewportSize) {
    viewportSize.value = viewportSize.value === size ? 'full' : size;
  }

  // Restore body overflow on unmount in case the component is destroyed while maximized
  const savedOverflow = ref('');

  function maximize() {
    savedOverflow.value = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    isMaximized.value = true;
  }

  function unmaximize() {
    document.body.style.overflow = savedOverflow.value;
    isMaximized.value = false;
    // Desktop viewport won't fit un-maximized — reset to full
    if (viewportSize.value === 'desktop') viewportSize.value = 'full';
  }

  function toggleMaximize() {
    if (isMaximized.value) unmaximize();
    else maximize();
  }

  onUnmounted(() => {
    if (isMaximized.value) {
      document.body.style.overflow = savedOverflow.value;
    }
  });

  return {
    isCopied,
    isMaximized,
    viewportSize,
    editableCode,
    srcdoc,
    viewportWidth,
    copyCode,
    setViewportSize,
    toggleMaximize,
  };
}
