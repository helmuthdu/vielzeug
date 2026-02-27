<script setup lang="ts">
import { ref, computed, useSlots, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  title?: string;
  showCode?: boolean;
  vertical?: boolean;
  center?: boolean;
  background?: string;
}>();

type ViewportSize = 'mobile' | 'tablet' | 'desktop' | 'full';

const slots = useSlots();
const showCodeState = ref(props.showCode ?? false);
const extractedCode = ref('');
const processedCodeBlock = ref<any>(null);
const buttonRef = ref<HTMLElement | null>(null);
const isMaximized = ref(false);
const viewportSize = ref<ViewportSize>('full');

const toggleCode = () => {
  showCodeState.value = !showCodeState.value;
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
onMounted(() => {
  // Add keyboard listener
  document.addEventListener('keydown', handleKeydown);

  // Listen to the custom 'click' event from the bit-button to avoid double-firing
  // The button emits a custom event, so we use addEventListener instead of @click
  if (buttonRef.value) {
    buttonRef.value.addEventListener('click', toggleCode as EventListener);
  }

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
        }
      }
    }
  }
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
  return extractedCode.value.trim();
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

      <div class="preview-scroll-container">
        <div class="preview-container-wrapper" :style="{ width: getViewportWidth }">
          <div
            class="preview-container"
            :class="{
              vertical,
              center,
            }"
            :style="
              background
                ? { backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : {}
            ">
            <ClientOnly>
              <div class="preview-demo" v-html="displayCode"></div>
            </ClientOnly>
          </div>
        </div>
      </div>

      <div class="preview-actions">
        <div class="actions-left">
          <!-- Maximize button -->
          <bit-button
            color="secondary"
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
              <path d="m 15,3 h 6 v 6" id="path1" />
              <path d="m 21,3 -7,7" id="path2" />
              <path d="m 3,21 7,-7" id="path3" />
              <path d="M 9,21 H 3 v -6" id="path4" />
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
              version="1.1"
              id="svg4"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M 14,10 21,3" id="path1" />
              <path d="M 20,10 H 14 V 4" id="path2" />
              <path d="m 3,21 7,-7" id="path3" />
              <path d="m 4,14 h 6 v 6" id="path4" />
            </svg>
          </bit-button>
          <!-- Viewport size buttons -->
          <div class="viewport-controls">
            <bit-button-group attached color="secondary" size="sm">
              <bit-button
                icon-only
                :variant="[viewportSize === 'mobile' ? 'solid' : 'flat']"
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
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2" id="rect1" />
                  <path d="m 12,18 h 0.01" id="path1" />
                </svg>
              </bit-button>
              <bit-button
                icon-only
                :variant="[viewportSize === 'tablet' ? 'solid' : 'flat']"
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
                  <rect width="17.564447" height="20" x="3.2177763" y="2" rx="2" ry="2" id="rect1" />
                  <line x1="12" x2="12.01" y1="18" y2="18" id="line1" />
                </svg>
              </bit-button>
              <bit-button
                icon-only
                :variant="[viewportSize === 'desktop' ? 'solid' : 'flat']"
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
                  <rect width="20" height="14" x="2" y="3" rx="2" id="rect1" />
                  <line x1="8" x2="16" y1="21" y2="21" id="line1" />
                  <line x1="12" x2="12" y1="17" y2="21" id="line2" />
                </svg>
              </bit-button>
            </bit-button-group>
          </div>
        </div>

        <div class="actions-right">
          <!-- Show/Hide code button -->
          <bit-button
            color="secondary"
            ref="buttonRef"
            variant="outline"
            size="sm"
            :class="{ active: showCodeState }"
            :aria-expanded="showCodeState">
            <svg
              v-if="!showCodeState"
              slot="prefix"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M 16,18 22,12 16,6" />
              <path d="m 8,6 -6,6 6,6" />
            </svg>
            <svg
              v-else
              slot="prefix"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M 12,22 V 16" />
              <path d="M 12,8 V 2" />
              <path d="M 4,12 H 2" />
              <path d="M 10,12 H 8" />
              <path d="M 16,12 H 14" />
              <path d="M 22,12 H 20" />
              <path d="M 15,19 12,16 9,19" />
              <path d="M 15,5 12,8 9,5" />
            </svg>
            {{ showCodeState ? 'Hide Code' : 'Show Code' }}
          </bit-button>
        </div>
      </div>

      <Transition name="slide">
        <div v-if="showCodeState" class="preview-code">
          <!-- Use VitePress's already-processed code block -->
          <component v-if="processedCodeBlock" :is="processedCodeBlock" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.component-preview {
  margin: var(--size-6) 0;
  border: var(--border) solid var(--color-contrast-300);
  border-radius: var(--rounded-lg);
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
  background: var(--color-contrast-50);
  background-image: radial-gradient(circle, var(--color-contrast-300) var(--border), transparent var(--border));
  background-size: var(--size-4) var(--size-4);
  background-position: 0 0;
  height: var(--size-full);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--size-4);
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

.preview-demo {
  display: contents;
}

.preview-actions {
  padding: var(--size-2) var(--size-4);
  background: var(--vp-c-bg);
  border-top: var(--border) solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--size-4);
  flex-shrink: 0;
}

.actions-left,
.actions-right {
  display: flex;
  align-items: center;
  gap: var(--size-2);
}

.viewport-controls {
  display: flex;
  gap: var(--size-2);
}

.preview-code {
  border-top: var(--border) solid var(--vp-c-divider);
  background: var(--vp-code-block-bg);
  flex-shrink: 0;
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

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: var(--size-screen-xl);
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .viewport-controls {
    display: none;
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

  .preview-actions {
    flex-direction: column;
    gap: var(--size-2);
  }

  .actions-left,
  .actions-right {
    width: var(--size-full);
    justify-content: center;
  }
}
</style>
