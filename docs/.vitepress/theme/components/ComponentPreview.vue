<script setup lang="ts">
import { ref, computed, useSlots, onMounted } from 'vue';

const props = defineProps<{
  title?: string;
  showCode?: boolean;
  vertical?: boolean;
  center?: boolean;
  background?: string;
}>();

const slots = useSlots();
const showCodeState = ref(props.showCode ?? false);
const extractedCode = ref('');
const processedCodeBlock = ref<any>(null);
const buttonRef = ref<HTMLElement | null>(null);

const toggleCode = () => {
  showCodeState.value = !showCodeState.value;
};

// Extract code from slot content
onMounted(() => {
  // Listen to the custom 'click' event from bit-button to avoid double-firing
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
  <div class="component-preview">
    <div v-if="title" class="preview-title">
      {{ title }}
    </div>

    <div
      class="preview-container"
      :class="{
        vertical,
        center,
      }"
      :style="background ? { backgroundImage: `url(${background})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}">
      <ClientOnly>
        <div class="preview-demo" v-html="displayCode"></div>
      </ClientOnly>
    </div>

    <div class="preview-actions">
      <bit-button
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

    <Transition name="slide">
      <div v-if="showCodeState" class="preview-code">
        <!-- Use VitePress's already-processed code block -->
        <component v-if="processedCodeBlock" :is="processedCodeBlock" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.component-preview {
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

.preview-title {
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--vp-c-text-1);
}

.preview-container {
  padding: 2rem;
  background: var(--color-canvas);
  min-height: 100px;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-start;
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
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: flex-end;
}

.preview-actions bit-button {
  --button-min-width: 120px;
}

.preview-code {
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-code-block-bg);
}

/* VitePress code blocks already have styling, just ensure they fit */
.preview-code :deep(.language-html),
.preview-code :deep([class*='language-']) {
  margin: 0;
  border-radius: 0;
}

.preview-code :deep(pre) {
  margin: 0;
}

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: 800px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
