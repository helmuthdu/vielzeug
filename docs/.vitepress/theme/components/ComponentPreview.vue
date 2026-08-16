<script lang="ts" setup >
import { useSlots } from 'vue';

import { useComponentPreview } from './component-preview/useComponentPreview';

const props = defineProps<{
  title?: string;
  align?: 'center' | 'end' | 'start' | 'stretch';
  justify?: 'center' | 'end' | 'start';
  vertical?: boolean;
  background?: string;
  colorful?: boolean;
  height?: string;
}>();

const slots = useSlots();

const {
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
} = useComponentPreview(props, slots.default?.());
</script>

<template>
  <div class="component-preview" :class="{ maximized: isMaximized }">
    <!-- Maximized overlay -->
    <Transition name="fade">
      <div
        class="preview-overlay"
        role="button"
        tabindex="0"
        v-if="isMaximized"
        @click="toggleMaximize"
        @keydown.enter="toggleMaximize"></div>
    </Transition>

    <div class="preview-wrapper" :class="{ maximized: isMaximized }">
      <div class="preview-title" v-if="title" >
        {{ title }}
      </div>

      <!-- Tabs with proper slot structure -->
      <ore-tabs class="preview-tabs" size="sm" value="preview" variant="flat" >
        <ore-tab-item slot="tabs" value="preview">Preview</ore-tab-item>
        <ore-tab-item slot="tabs" value="code">Code</ore-tab-item>
        <!-- Actions bar above tabs -->
        <div class="preview-actions" slot="tabs">
          <!-- Viewport size buttons -->
          <div class="viewport-controls">
            <ore-button-group attached size="sm">
              <ore-button
                icon-only
                size="sm"
                title="Mobile view (375px)"
                :variant="viewportSize === 'mobile' ? 'solid' : 'flat'"
                @click="setViewportSize('mobile')">
                <ore-icon name="smartphone"></ore-icon>
              </ore-button>
              <ore-button
                icon-only
                size="sm"
                title="Tablet view (768px)"
                :variant="viewportSize === 'tablet' ? 'solid' : 'flat'"
                @click="setViewportSize('tablet')">
                <ore-icon name="tablet"></ore-icon>
              </ore-button>
              <ore-button
                icon-only
                size="sm"
                title="Desktop view (1280px)"
                :variant="viewportSize === 'desktop' ? 'solid' : 'flat'"
                @click="setViewportSize('desktop')">
                <ore-icon name="monitor"></ore-icon>
              </ore-button>
            </ore-button-group>
          </div>
          <!-- Copy code button -->
          <ore-button icon-only size="sm" variant="flat" :title="isCopied ? 'Copied!' : 'Copy code'" @click="copyCode" >
            <ore-icon :name="isCopied ? 'check' : 'copy'"></ore-icon>
          </ore-button>

          <!-- LTR / RTL toggle button -->
          <ore-button
            icon-only
            size="sm"
            variant="flat"
            :title="isRtl ? 'Switch to LTR' : 'Switch to RTL'"
            @click="toggleDirection">
            <span style="font-weight: 600; font-size: 0.6275rem; line-height: 1rem">{{ isRtl ? 'LTR' : 'RTL' }}</span>
          </ore-button>

          <!-- Maximize button -->
          <ore-button
            icon-only
            size="sm"
            variant="ghost"
            :title="isMaximized ? 'Exit fullscreen' : 'Maximize'"
            @click="toggleMaximize">
            <ore-icon :name="isMaximized ? 'minimize-2' : 'maximize-2'"></ore-icon>
          </ore-button>
        </div>

        <!-- Preview tab panel -->
        <ore-tab-panel padding="none" value="preview" >
          <div
            class="preview-scroll-container"
            :style="!isMaximized && props.height ? { height: props.height, minHeight: props.height } : {}">
            <div class="preview-container-wrapper" :style="{ width: viewportWidth }">
              <div class="preview-container" :class="{ colorful }" :style="backgroundStyle">
                <ClientOnly>
                  <div class="preview-sandbox" ref="sandboxContainerRef" ></div>
                </ClientOnly>
              </div>
            </div>
          </div>
        </ore-tab-panel>

        <!-- Code tab panel -->
        <ore-tab-panel value="code">
          <div class="preview-code">
            <component :is="codeBlock.vnode" v-if="codeBlock?.vnode" />
            <pre class="preview-code-fallback" v-else-if="codeBlock?.html" >{{ codeBlock.html }}</pre>
          </div>
        </ore-tab-panel>
      </ore-tabs>
    </div>
  </div>
</template>

<style scoped>
.component-preview {
  --_touch-target: 0px;
  position: relative;
  margin: var(--size-6) 0;
  overflow: hidden;
}

.component-preview.maximized {
  --_touch-target: unset;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9999;
  margin: 0;
  border-radius: var(--rounded-none);
}

.preview-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
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
  z-index: 10000;
  width: 95vw;
  max-width: var(--size-7xl);
  height: 95vh;
  overflow: auto;
  border-radius: var(--rounded-2xl);
  box-shadow: var(--shadow-2xl);
  transform: translate(-50%, -50%);
}

.preview-title {
  flex-shrink: 0;
  padding: var(--size-3) var(--size-4);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-color-body);
  border-bottom: var(--border) solid var(--color-contrast-300);
}

.preview-scroll-container {
  display: grid;
  width: var(--size-full);
  min-height: 150px;
  padding: 0;
  overflow: auto;
  background-color: var(--color-contrast-50);
  background-image: radial-gradient(circle, var(--color-contrast-200) 1px, transparent 1px);
  background-position: 0 0;
  background-size: 16px 16px;
}

/* Full height in maximized mode */
.preview-wrapper.maximized .preview-scroll-container {
  height: 100%;
  min-height: 100%;
}

.preview-wrapper.maximized .preview-container-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-container-wrapper {
  position: relative;
  min-width: var(--size-min);
  margin: auto;
  container-name: preview;
  container-type: inline-size;
  transition: width 0.3s ease;
}

.preview-container {
  position: relative;
  min-height: var(--size-24);
  padding: 0;
  background: transparent;
}

.preview-container.colorful {
  position: relative;
  background-image: linear-gradient(
    90deg,
    color-mix(in oklch, var(--color-primary) 15%, transparent),
    color-mix(in oklch, var(--color-info) 15%, transparent),
    color-mix(in oklch, var(--color-success) 15%, transparent),
    color-mix(in oklch, var(--color-warning) 15%, transparent),
    color-mix(in oklch, var(--color-error) 15%, transparent)
  );
  background-position: 0% 50%;
  background-size: 400% 400%;
  animation: colorful-shift 25s ease-in-out infinite;
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

/* Actions bar in tabs slot */
.preview-actions {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  margin-left: auto; /* Push to the right side of the tab bar */
}

.viewport-controls {
  display: flex;
  gap: var(--size-2);
}

/* Tabs container */
.preview-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* Ensure tab panels flow full height */
.preview-tabs::part(panels) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.preview-code {
  max-height: 600px;
  overflow: auto;
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

.preview-code-fallback {
  padding: var(--size-4);
  margin: 0;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
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
    /* biome-ignore lint/complexity/noImportantStyles: override inline :style binding in mobile breakpoint */
    width: var(--size-full) !important;
  }

  .preview-wrapper.maximized {
    width: var(--size-screen-width);
    height: var(--size-screen-height);
    border-radius: var(--rounded-none);
  }
}
</style>
