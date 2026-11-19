<script lang="ts" setup>
import { useId, useSlots } from 'vue';

import { useComponentPreview } from './component-preview/useComponentPreview';

const props = defineProps<{
  align?: 'center' | 'end' | 'start' | 'stretch';
  background?: string;
  height?: string;
  justify?: 'center' | 'end' | 'start';
  vertical?: boolean;
}>();

defineOptions({ inheritAttrs: false });

const slots = useSlots();
const codeRegionId = `component-preview-code-${useId()}`;

const {
  backgroundStyle,
  codeBlock,
  copyCode,
  copyStatus,
  expandedPreviewError,
  expandedPreviewReady,
  // biome-ignore lint/correctness/noUnusedVariables: bound through the template ref attribute
  expandedStageRef,
  // biome-ignore lint/correctness/noUnusedVariables: bound through the template ref attribute
  expandedSurfaceContainerRef,
  expandedWidthLabel,
  handleExpandedOpenChange,
  handleViewportChange,
  // biome-ignore lint/correctness/noUnusedVariables: bound through the template ref attribute
  inlineCanvasRef,
  inlinePreviewError,
  inlinePreviewReady,
  // biome-ignore lint/correctness/noUnusedVariables: bound through the template ref attribute
  inlineSandboxContainerRef,
  isCopied,
  isExpanded,
  isRtl,
  retryExpandedPreview,
  retryInlinePreview,
  showCode,
  toggleDirection,
  toggleShowCode,
  viewportSize,
  viewportWidth,
} = useComponentPreview(props, slots.default?.());
</script>

<template>
  <div class="component-preview" v-bind="$attrs">
    <div
      class="preview-scroll-container"
      :style="props.height ? { height: props.height, minHeight: props.height } : {}">
      <div class="preview-container-wrapper">
        <div class="preview-container" ref="inlineCanvasRef" :style="backgroundStyle">
          <ClientOnly>
            <div class="preview-sandbox" ref="inlineSandboxContainerRef"></div>
          </ClientOnly>
          <ore-state
            class="preview-state"
            error-label="Preview couldn't load"
            retryable
            status="error"
            v-if="inlinePreviewError"
            :error-description="inlinePreviewError"
            @retry="retryInlinePreview"></ore-state>
          <ore-skeleton
            class="preview-skeleton"
            height="var(--size-24)"
            variant="rect"
            v-else-if="codeBlock && !inlinePreviewReady"></ore-skeleton>
        </div>
      </div>
    </div>

    <div class="preview-bar">
      <ore-button
        variant="flat"
        :aria-controls="codeRegionId"
        :aria-expanded="showCode ? 'true' : 'false'"
        :disabled="!codeBlock"
        :label="showCode ? 'Hide code' : 'Show code'"
        @click="toggleShowCode">
        {{ showCode ? 'Hide code' : 'Show code' }}
      </ore-button>

      <div class="preview-bar-actions">
        <ore-tooltip placement="top" :content="isRtl ? 'Right to left' : 'Left to right'" >
          <ore-button
            icon-only
            size="sm"
            variant="flat"
            :aria-pressed="isRtl ? 'true' : 'false'"
            :label="isRtl ? 'Left-to-right' : 'Right-to-left'"
            @click="toggleDirection">
            <ore-icon :name="isRtl ? 'pilcrow-left' : 'pilcrow-right'"></ore-icon>
          </ore-button>
        </ore-tooltip>
        <ore-tooltip placement="top" :content="copyStatus || 'Copy code'" >
          <ore-button
            icon-only
            size="sm"
            variant="flat"
            :disabled="!codeBlock"
            :label="copyStatus || 'Copy code'"
            @click="copyCode">
            <ore-icon :name="isCopied ? 'check' : 'copy'"></ore-icon>
          </ore-button>
        </ore-tooltip>
        <span aria-atomic="true" aria-live="polite" class="sr-only">{{ copyStatus }}</span>
        <ore-tooltip content="Expand" placement="top">
          <ore-button
            icon-only
            label="Expand"
            size="sm"
            variant="flat"
            @click="isExpanded = true">
            <ore-icon name="maximize-2"></ore-icon>
          </ore-button>
        </ore-tooltip>
      </div>
    </div>

    <div class="preview-code" :hidden="!showCode" :id="codeRegionId" >
      <component :is="codeBlock.vnode" v-if="codeBlock?.vnode" />
      <pre class="preview-code-fallback" v-else-if="codeBlock?.html">{{ codeBlock.html }}</pre>
    </div>
  </div>

  <ore-dialog
    class="preview-dialog"
    dismissible
    label="Preview"
    padding="none"
    size="full"
    :open="isExpanded"
    @open-change="handleExpandedOpenChange">
    <div class="expanded-preview">
      <div class="expanded-toolbar">
        <div class="viewport-controls">
          <ore-button-group
            attached
            label="Viewport"
            rounded="md"
            size="sm"
            :value="viewportSize"
            @change="handleViewportChange">
            <ore-tooltip content="Full width" placement="top">
              <ore-button icon-only label="Full width" size="sm" value="full">
                <ore-icon name="scan"></ore-icon>
              </ore-button>
            </ore-tooltip>
            <ore-tooltip
              content="Mobile, 375px"
              placement="top">
              <ore-button
                icon-only
                label="Mobile, 375 pixels"
                size="sm"
                value="mobile">
                <ore-icon name="smartphone"></ore-icon>
              </ore-button>
            </ore-tooltip>
            <ore-tooltip
              content="Tablet, 768px"
              placement="top">
              <ore-button
                icon-only
                label="Tablet, 768 pixels"
                size="sm"
                value="tablet">
                <ore-icon name="tablet"></ore-icon>
              </ore-button>
            </ore-tooltip>
            <ore-tooltip
              content="Desktop, 1280px"
              placement="top">
              <ore-button
                icon-only
                label="Desktop, 1280 pixels"
                size="sm"
                value="desktop">
                <ore-icon name="monitor"></ore-icon>
              </ore-button>
            </ore-tooltip>
          </ore-button-group>
          <span class="viewport-width">{{ expandedWidthLabel }}</span>
        </div>

        <div class="expanded-actions">
          <ore-tooltip placement="top" :content="isRtl ? 'Right to left' : 'Left to right'" >
            <ore-button
              icon-only
              size="sm"
              variant="flat"
              :aria-pressed="isRtl ? 'true' : 'false'"
              :label="isRtl ? 'Left-to-right' : 'Right-to-left'"
              @click="toggleDirection">
              <ore-icon :name="isRtl ? 'pilcrow-left' : 'pilcrow-right'"></ore-icon>
            </ore-button>
          </ore-tooltip>
          <ore-tooltip placement="top" :content="copyStatus || 'Copy code'" >
            <ore-button
              icon-only
              size="sm"
              variant="flat"
              :disabled="!codeBlock"
              :label="copyStatus || 'Copy code'"
              @click="copyCode">
              <ore-icon :name="isCopied ? 'check' : 'copy'"></ore-icon>
            </ore-button>
          </ore-tooltip>
          <span aria-atomic="true" aria-live="polite" class="sr-only">{{ copyStatus }}</span>
        </div>
      </div>

      <div class="expanded-stage" ref="expandedStageRef">
        <div class="preview-scroll-container">
          <div class="preview-container-wrapper" :style="{ width: viewportWidth }">
            <div class="preview-container" :style="backgroundStyle">
              <ClientOnly>
                <div
                  class="preview-sandbox"
                  v-if="isExpanded"
                  ref="expandedSurfaceContainerRef"></div>
              </ClientOnly>
              <ore-state
                class="preview-state"
                error-label="Preview couldn't load"
                retryable
                status="error"
                v-if="expandedPreviewError"
                :error-description="expandedPreviewError"
                @retry="retryExpandedPreview"></ore-state>
              <ore-skeleton
                class="preview-skeleton"
                height="var(--size-24)"
                variant="rect"
                v-else-if="codeBlock && !expandedPreviewReady"></ore-skeleton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ore-dialog>
</template>

<style scoped>
.component-preview {
  margin: var(--size-6) 0;
  overflow: hidden;
  border: var(--border) solid var(--vp-c-divider);
  border-radius: var(--rounded-lg);
}

.preview-scroll-container {
  position: relative;
  display: grid;
  width: 100%;
  min-height: var(--size-24);
  padding: 0;
  overflow: auto;
  background-color: var(--color-contrast-50);
  background-image: radial-gradient(circle, var(--color-contrast-200) 1px, transparent 1px);
  background-position: 0 0;
  background-size: var(--size-4) var(--size-4);
}

.preview-container-wrapper {
  position: relative;
  width: 100%;
  min-width: var(--size-min);
  max-width: 100%;
  margin: auto;
  container-name: preview;
  container-type: inline-size;
  transition: width var(--duration-300) var(--ease-in-out);
}

.preview-container {
  position: relative;
  min-height: var(--size-24);
  padding: 0;
  background: transparent;
}

.preview-skeleton {
  display: block;
  width: calc(100% - var(--size-8));
  margin: var(--size-4);
}

.preview-state {
  display: block;
  min-height: var(--size-36);
  padding: var(--size-4);
}

.preview-sandbox {
  display: contents;
  width: 100%;
}

.preview-sandbox :deep(iframe) {
  width: 100%;
  height: 0;
  background: transparent;
  border: none;
}

.preview-bar,
.preview-bar-actions,
.viewport-controls,
.expanded-toolbar,
.expanded-actions {
  display: flex;
  gap: var(--size-2);
  align-items: center;
}

.preview-bar {
  flex-wrap: wrap;
  justify-content: space-between;
  padding: var(--size-2) var(--size-3);
  border-top: var(--border) solid var(--vp-c-divider);
}

.preview-bar-actions,
.viewport-controls,
.expanded-actions {
  flex-shrink: 0;
}

.preview-bar-actions ore-button[aria-pressed='true'],
.expanded-actions ore-button[aria-pressed='true'] {
  --button-bg: var(--color-neutral);
  --button-color: var(--color-neutral-contrast);
  --button-border-color: var(--color-neutral);
}

.preview-code {
  border-top: var(--border) solid var(--vp-c-divider);
}

.preview-code :deep(.language-html),
.preview-code :deep([class*='language-']) {
  margin: 0;
  border-radius: var(--rounded-none);
}

.preview-code :deep(pre) {
  margin: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.preview-code-fallback {
  padding: var(--size-4);
  margin: 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.preview-dialog::part(header) {
  padding: var(--size-4);
  padding-bottom: 0;
}

.preview-dialog::part(body) {
  overflow: hidden;
}

.preview-dialog::part(panel) {
  width: min(calc(100vw - var(--size-8)), var(--size-7xl));
  max-width: var(--size-7xl);
  height: calc(100dvh - var(--size-8));
  max-height: calc(100dvh - var(--size-8));
}

.expanded-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.expanded-toolbar {
  flex-shrink: 0;
  flex-wrap: wrap;
  padding: var(--size-3) var(--size-4);
  border-bottom: var(--border) solid var(--vp-c-divider);
}

.viewport-controls ore-button-group {
  flex-shrink: 0;
}

.viewport-width {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-color-body);
  white-space: nowrap;
}

.expanded-actions {
  margin-inline-start: auto;
}

.expanded-stage {
  position: relative;
  display: grid;
  flex: 1;
  min-width: 0;
  min-height: var(--size-24);
  overflow: auto;
}

.expanded-stage .preview-scroll-container {
  min-width: 0;
}

.expanded-stage .preview-container-wrapper {
  max-width: none;
}

.expanded-stage .preview-scroll-container,
.expanded-stage .preview-container-wrapper,
.expanded-stage .preview-container {
  height: 100%;
  min-height: 100%;
}

@media (width <= 640px) {
  .preview-dialog {
    --dialog-radius: var(--rounded-none);
    --dialog-shadow: var(--shadow-none);
  }

  .preview-dialog::part(panel) {
    width: 100vw;
    max-width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border: 0;
  }

  .preview-dialog::part(header) {
    padding-block-start: calc(var(--size-4) + var(--safe-area-inset-block-start));
    padding-inline-start: calc(var(--size-4) + var(--safe-area-inset-inline-start));
    padding-inline-end: calc(var(--size-4) + var(--safe-area-inset-inline-end));
  }

  .preview-dialog::part(body) {
    padding: var(--size-0);
  }

  .expanded-toolbar {
    padding-inline-start: calc(var(--size-4) + var(--safe-area-inset-inline-start));
    padding-inline-end: calc(var(--size-4) + var(--safe-area-inset-inline-end));
  }

  .expanded-stage {
    padding-block-end: var(--safe-area-inset-block-end);
    padding-inline: var(--safe-area-inset-inline-start) var(--safe-area-inset-inline-end);
  }
}
</style>
