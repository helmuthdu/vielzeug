<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useSlots } from 'vue';

const props = defineProps<{
  title?: string;
  vertical?: boolean;
  center?: boolean;
  background?: string;
  colorful?: boolean;
}>();

type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'full';

const slots = useSlots();
const extractedCode = ref('');
const processedCodeBlock = ref<any>(null);
const isMaximized = ref(false);
const viewportSize = ref<ViewportSize>('full');
const scriptCode = ref('');
const previewContainerRef = ref<HTMLDivElement | null>(null);
const activeTab = ref('preview');
const isCopied = ref(false);
const isRtl = ref(false);

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(extractedCode.value.trim());
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (e) {
    console.warn('[ComponentPreview] Copy failed:', e);
  }
};

const toggleDirection = () => {
  isRtl.value = !isRtl.value;
};

const toggleMaximize = () => {
  isMaximized.value = !isMaximized.value;
  if (isMaximized.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
    // Reset to full width when closing maximized mode
    if (viewportSize.value === 'desktop') {
      viewportSize.value = 'full';
    }
  }
};

const setViewportSize = (size: ViewportSize) => {
  // Toggle behavior: if clicking the active size, return to full
  if (viewportSize.value === size) {
    viewportSize.value = 'full';
    return;
  }

  viewportSize.value = size;

  // Auto-maximize if viewport is too large for container
  // Desktop (1280px) won't fit in typical VitePress content area (~1200px)
  if (size === 'desktop' && !isMaximized.value) {
    toggleMaximize();
  }
};

const getViewportWidth = computed(() => {
  switch (viewportSize.value) {
    case 'mobile':
      return '375px';
    case 'tablet':
      return '768px';
    case 'desktop':
      return '1280px';
    case 'full':
    default:
      return '100%';
  }
});

// Handle keyboard events
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isMaximized.value) {
    toggleMaximize();
  }
};

// Extract code from slot content
onMounted(async () => {
  // Add keyboard listener
  document.addEventListener('keydown', handleKeydown);

  if (slots.default) {
    const slotContent = slots.default();
    if (slotContent && slotContent.length > 0) {
      // Find the VitePress processed code block
      const codeBlockVNode = findCodeBlock(slotContent);

      if (codeBlockVNode) {
        // Store the processed VNode for rendering
        processedCodeBlock.value = codeBlockVNode;

        // Extract plain text for the preview and copy functionality
        const codeText = extractCodeText(codeBlockVNode);
        if (codeText) {
          extractedCode.value = codeText;

          // Extract and store script block content for iframe execution
          const scriptMatch = codeText.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i);
          if (scriptMatch) {
            scriptCode.value = scriptMatch[1]
              .split('\n')
              .filter((line: string) => !line.trim().startsWith('import '))
              .join('\n')
              .trim();
          }
        }
      }
    }
  }

  // Render preview after mounting
  await nextTick();
  renderPreview();
});

onUnmounted(() => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', handleKeydown);
});

// Find the code block VNode (VitePress already processed it)
function findCodeBlock(vnodes: any[]): any {
  for (const vnode of vnodes) {
    // VitePress wraps code blocks in div.language-*
    if (vnode.type === 'div' && vnode.props?.class?.includes('language-')) {
      return vnode;
    }

    // Recursively search
    if (vnode.children && Array.isArray(vnode.children)) {
      const result = findCodeBlock(vnode.children);
      if (result) return result;
    }
  }

  return null;
}

// Extract plain text from code block for preview and copy
function extractCodeText(vnode: any): string {
  if (!vnode) return '';

  // Navigate: div > pre > code > text
  if (vnode.children && Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      if (child.type === 'pre' && child.children) {
        for (const codeChild of child.children) {
          if (codeChild.type === 'code' && codeChild.children) {
            return extractText(codeChild.children);
          }
        }
      }
    }
  }

  return '';
}

// Extract text recursively
function extractText(children: any): string {
  if (typeof children === 'string') {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map((child) => extractText(child)).join('');
  }

  if (children && typeof children === 'object') {
    if (children.children) {
      return extractText(children.children);
    }
  }

  return '';
}

const displayCode = computed(() => {
  // Strip <script> blocks — they won't execute via v-html anyway, and we run them separately
  return extractedCode.value
    .trim()
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim();
});

// Render content in preview container with CSS reset
const renderPreview = () => {
  if (!previewContainerRef.value) return;

  // Set the HTML content
  previewContainerRef.value.innerHTML = displayCode.value;

  // Execute script if present
  if (scriptCode.value) {
    try {
      // Create a new function scope for the script
      new Function(scriptCode.value)();
    } catch (e) {
      console.warn('[ComponentPreview] Script execution error:', e);
    }
  }
};

const backgroundStyle = computed(() => {
  if (props.background) {
    return {
      backgroundImage: `url(${props.background})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  return {};
});
</script>

<template>
  <div class="component-preview" :class="{ maximized: isMaximized }">
    <!-- Maximized overlay -->
    <Transition name="fade">
      <div v-if="isMaximized" class="preview-overlay" @click="toggleMaximize"></div>
    </Transition>

    <div class="preview-wrapper" :class="{ maximized: isMaximized }">
      <div v-if="title" class="preview-title">
        {{ title }}
      </div>

      <!-- Tabs with proper slot structure -->
      <bit-tabs :value="activeTab" variant="flat" class="preview-tabs">
        <bit-tab-item slot="tabs" value="preview">Preview</bit-tab-item>
        <bit-tab-item slot="tabs" value="code">Code</bit-tab-item>
        <!-- Actions bar above tabs -->
        <div class="preview-actions" slot="tabs">
          <!-- Viewport size buttons -->
          <div class="viewport-controls">
            <bit-button-group attached size="sm">
              <bit-button
                icon-only
                :variant="viewportSize === 'mobile' ? 'solid' : 'bordered'"
                @click="setViewportSize('mobile')"
                title="Mobile view (375px)">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                  <path d="m 12,18 h 0.01" />
                </svg>
              </bit-button>
              <bit-button
                icon-only
                :variant="viewportSize === 'tablet' ? 'solid' : 'bordered'"
                @click="setViewportSize('tablet')"
                title="Tablet view (768px)">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <rect width="17.564447" height="20" x="3.2177763" y="2" rx="2" ry="2" />
                  <line x1="12" x2="12.01" y1="18" y2="18" />
                </svg>
              </bit-button>
              <bit-button
                icon-only
                :variant="viewportSize === 'desktop' ? 'solid' : 'bordered'"
                @click="setViewportSize('desktop')"
                title="Desktop view (1280px) - Opens maximized">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <rect width="20" height="14" x="2" y="3" rx="2" />
                  <line x1="8" x2="16" y1="21" y2="21" />
                  <line x1="12" x2="12" y1="17" y2="21" />
                </svg>
              </bit-button>
            </bit-button-group>
          </div>
          <!-- Copy code button -->
          <bit-button
            variant="bordered"
            size="sm"
            icon-only
            @click="copyCode"
            :title="isCopied ? 'Copied!' : 'Copy code'">
            <svg
              v-if="isCopied"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              </g>
            </svg>
          </bit-button>

          <!-- LTR / RTL toggle button -->
          <bit-button
            variant="bordered"
            size="sm"
            icon-only
            @click="toggleDirection"
            :title="isRtl ? 'Switch to LTR' : 'Switch to RTL'">
            <span style="font-weight: 600; font-size: 0.6275rem; line-height: 1rem">{{ isRtl ? 'LTR' : 'RTL' }}</span>
          </bit-button>

          <!-- Maximize button -->
          <bit-button
            variant="ghost"
            size="sm"
            icon-only
            @click="toggleMaximize"
            :title="isMaximized ? 'Exit fullscreen' : 'Maximize'">
            <svg
              v-if="!isMaximized"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              xmlns="http://www.w3.org/2000/svg">
              <path d="m 15,3 h 6 v 6" />
              <path d="m 21,3 -7,7" />
              <path d="m 3,21 7,-7" />
              <path d="M 9,21 H 3 v -6" />
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M 14,10 21,3" />
              <path d="M 20,10 H 14 V 4" />
              <path d="m 3,21 7,-7" />
              <path d="m 4,14 h 6 v 6" />
            </svg>
          </bit-button>
        </div>

        <!-- Preview tab panel -->
        <bit-tab-panel value="preview" padding="none">
          <div class="preview-scroll-container">
            <div class="preview-container-wrapper" :style="{ width: getViewportWidth }">
              <div
                class="preview-container"
                :class="{
                  vertical,
                  center,
                  colorful,
                }"
                :style="backgroundStyle">
                <ClientOnly>
                  <div ref="previewContainerRef" class="preview-demo" :dir="isRtl ? 'rtl' : 'ltr'"></div>
                </ClientOnly>
              </div>
            </div>
          </div>
        </bit-tab-panel>

        <!-- Code tab panel -->
        <bit-tab-panel value="code">
          <div class="preview-code">
            <!-- Use VitePress's already-processed code block -->
            <component v-if="processedCodeBlock" :is="processedCodeBlock" />
          </div>
        </bit-tab-panel>
      </bit-tabs>
    </div>
  </div>
</template>

<style scoped>
.component-preview {
  margin: var(--size-6) 0;
  overflow: hidden;
  position: relative;
}

.component-preview.maximized {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  border-radius: var(--rounded-none);
  z-index: 9999;
}

.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  background-color: var(--color-canvas);
}

.preview-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  height: var(--size-full);
}

.preview-wrapper.maximized {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 95vw;
  height: 95vh;
  max-width: var(--size-7xl);
  border-radius: var(--rounded-2xl);
  z-index: 10000;
  box-shadow: var(--shadow-2xl);
  overflow: auto;
}

.preview-title {
  padding: var(--size-3) var(--size-4);
  border-bottom: var(--border) solid var(--vp-c-divider);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--vp-c-text-1);
  flex-shrink: 0;
}

.preview-scroll-container {
  overflow: auto;
  width: var(--size-full);
  background-color: var(--color-contrast-50);
  background-image:
    linear-gradient(to right, var(--color-contrast-100) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-contrast-100) 1px, transparent 1px);
  background-size: 16px 16px;
  background-position: 0 0;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

/* Full height in maximized mode */
.preview-wrapper.maximized .preview-scroll-container {
  height: 100%;
  min-height: 100%;
  /* Keep centering consistent with normal mode */
  align-items: center;
  justify-content: center;
}

.preview-wrapper.maximized .preview-container-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-wrapper.maximized .preview-container {
  flex: 1;
  min-height: 100%;
}

.preview-container-wrapper {
  position: relative;
  transition: width 0.3s ease;
  min-width: var(--size-min);
  margin: auto;
  container-type: inline-size;
  container-name: preview;
}

.preview-container {
  padding: var(--size-4);
  background: transparent;
  min-height: var(--size-24);
  display: flex;
  gap: var(--size-4);
  flex-wrap: wrap;
  align-items: flex-start;
  transition: all 0.2s ease;
  position: relative;
}

.preview-container.vertical {
  flex-direction: column;
}

.preview-container.center {
  justify-content: center;
  align-items: center;
}

.preview-container.colorful {
  position: relative;
  background-size: 400% 400%;
  background-position: 0% 50%;
  background-image: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-primary) 15%, transparent),
    color-mix(in srgb, var(--color-info) 15%, transparent),
    color-mix(in srgb, var(--color-success) 15%, transparent),
    color-mix(in srgb, var(--color-warning) 15%, transparent),
    color-mix(in srgb, var(--color-error) 15%, transparent)
  );
  animation: colorful-shift 25s ease-in-out infinite;
}

.preview-demo {
  /* Provide a clean context for components */
  display: contents;

  /* Reset common inherited properties that might interfere */
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

/* Isolate preview content from VitePress documentation styles */
.preview-demo > * {
  /* Reset margin/padding that docs might add */
  margin: 0;
  padding: 0;
}

/* Override VitePress paragraph styles inside preview */
.preview-demo :deep(p),
.preview-demo p {
  margin: 0;
  line-height: var(--leading-normal);
}

/* Ensure buildit components render properly within preview */
.preview-demo
  :where(
    bit-button,
    bit-input,
    bit-card,
    bit-dialog,
    bit-select,
    bit-checkbox,
    bit-radio,
    bit-switch,
    bit-slider,
    bit-textarea,
    bit-alert,
    bit-dialog,
    bit-tooltip,
    bit-accordion,
    bit-tabs,
    bit-tab-item,
    bit-tab-panel,
    bit-file-input,
    bit-button-group,
    bit-grid
  ) {
  /* Ensure components don't inherit problematic doc styles */
  all: revert-layer;
}

/* Actions bar in tabs slot */
.preview-actions {
  display: flex;
  align-items: center;
  gap: var(--size-2);
  margin-left: auto; /* Push to the right side of the tab bar */
}

.viewport-controls {
  display: flex;
  gap: var(--size-2);
}

/* Tabs container */
.preview-tabs {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
}

/* Ensure tab panels flow full height */
.preview-tabs::part(panels) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.preview-code {
  overflow: auto;
  max-height: 600px;
}

/* VitePress code blocks already have styling, just ensure they fit */
.preview-code :deep(.language-html),
.preview-code :deep([class*='language-']) {
  margin: 0;
  border-radius: var(--rounded-none);
}

.preview-code :deep(pre) {
  margin: 0;
}

/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Colorful background animation */
@keyframes colorful-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .viewport-controls {
    display: none;
  }

  .preview-actions {
    justify-content: center;
  }

  .preview-scroll-container {
    overflow: auto;
  }

  .preview-container-wrapper {
    width: var(--size-full) !important;
  }

  .preview-wrapper.maximized {
    width: var(--size-screen-width);
    height: var(--size-screen-height);
    border-radius: var(--rounded-none);
  }
}
</style>
