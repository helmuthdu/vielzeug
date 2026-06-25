<script setup lang="ts">
import { useSlots } from 'vue';

import { ICONS, useComponentPreview } from './component-preview/useComponentPreview';

const props = defineProps<{
  title?: string;
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
      <div v-if="isMaximized" class="preview-overlay" @click="toggleMaximize"></div>
    </Transition>

    <div class="preview-wrapper" :class="{ maximized: isMaximized }">
      <div v-if="title" class="preview-title">
        {{ title }}
      </div>

      <!-- Tabs with proper slot structure -->
      <ore-tabs value="preview" variant="flat" class="preview-tabs">
        <ore-tab-item slot="tabs" value="preview">Preview</ore-tab-item>
        <ore-tab-item slot="tabs" value="code">Code</ore-tab-item>
        <!-- Actions bar above tabs -->
        <div class="preview-actions" slot="tabs">
          <!-- Viewport size buttons -->
          <div class="viewport-controls">
            <ore-button-group attached size="sm">
              <ore-button
                size="sm"
                icon-only
                :variant="viewportSize === 'mobile' ? 'solid' : 'bordered'"
                @click="setViewportSize('mobile')"
                title="Mobile view (375px)">
                <svg class="toolbar-icon" viewBox="0 0 24 24" v-html="ICONS.mobile" />
              </ore-button>
              <ore-button
                size="sm"
                icon-only
                :variant="viewportSize === 'tablet' ? 'solid' : 'bordered'"
                @click="setViewportSize('tablet')"
                title="Tablet view (768px)">
                <svg class="toolbar-icon" viewBox="0 0 24 24" v-html="ICONS.tablet" />
              </ore-button>
              <ore-button
                size="sm"
                icon-only
                :variant="viewportSize === 'desktop' ? 'solid' : 'bordered'"
                @click="setViewportSize('desktop')"
                title="Desktop view (1280px)">
                <svg class="toolbar-icon" viewBox="0 0 24 24" v-html="ICONS.desktop" />
              </ore-button>
            </ore-button-group>
          </div>
          <!-- Copy code button -->
          <ore-button
            variant="bordered"
            size="sm"
            icon-only
            @click="copyCode"
            :title="isCopied ? 'Copied!' : 'Copy code'">
            <svg class="toolbar-icon" viewBox="0 0 24 24" v-html="isCopied ? ICONS.copied : ICONS.copy" />
          </ore-button>

          <!-- LTR / RTL toggle button -->
          <ore-button
            variant="bordered"
            size="sm"
            icon-only
            @click="toggleDirection"
            :title="isRtl ? 'Switch to LTR' : 'Switch to RTL'">
            <span style="font-weight: 600; font-size: 0.6275rem; line-height: 1rem">{{ isRtl ? 'LTR' : 'RTL' }}</span>
          </ore-button>

          <!-- Maximize button -->
          <ore-button
            variant="ghost"
            size="sm"
            icon-only
            @click="toggleMaximize"
            :title="isMaximized ? 'Exit fullscreen' : 'Maximize'">
            <svg class="toolbar-icon" viewBox="0 0 24 24" v-html="isMaximized ? ICONS.minimize : ICONS.maximize" />
          </ore-button>
        </div>

        <!-- Preview tab panel -->
        <ore-tab-panel value="preview" padding="none">
          <div
            class="preview-scroll-container"
            :style="!isMaximized && props.height ? { height: props.height, minHeight: props.height } : {}">
            <div class="preview-container-wrapper" :style="{ width: viewportWidth }">
              <div
                class="preview-container"
                :class="{ colorful }"
                :style="backgroundStyle">
                <ClientOnly>
                  <div ref="sandboxContainerRef" class="preview-sandbox"></div>
                </ClientOnly>
              </div>
            </div>
          </div>
        </ore-tab-panel>

        <!-- Code tab panel -->
        <ore-tab-panel value="code">
          <div class="preview-code">
            <component v-if="codeBlock?.vnode" :is="codeBlock.vnode" />
            <pre v-else-if="codeBlock?.html" class="preview-code-fallback">{{ codeBlock.html }}</pre>
          </div>
        </ore-tab-panel>
      </ore-tabs>
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
  border-bottom: var(--border) solid var(--color-contrast-300);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--text-color-body);
  flex-shrink: 0;
}

.preview-scroll-container {
  overflow: auto;
  width: var(--size-full);
  background-color: var(--color-contrast-50);
  background-image: radial-gradient(circle, var(--color-contrast-200) 1px, transparent 1px);
  background-size: 16px 16px;
  background-position: 0 0;
  min-height: 150px;
  display: grid;
  padding: 0;
}

/* Full height in maximized mode */
.preview-wrapper.maximized .preview-scroll-container {
  height: 100%;
  min-height: 100%;
}

.preview-wrapper.maximized .preview-container-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
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
  padding: 0;
  background: transparent;
  min-height: var(--size-24);
  position: relative;
}

.preview-container.colorful {
  position: relative;
  background-size: 400% 400%;
  background-position: 0% 50%;
  background-image: linear-gradient(
    90deg,
    color-mix(in oklch, var(--color-primary) 15%, transparent),
    color-mix(in oklch, var(--color-info) 15%, transparent),
    color-mix(in oklch, var(--color-success) 15%, transparent),
    color-mix(in oklch, var(--color-warning) 15%, transparent),
    color-mix(in oklch, var(--color-error) 15%, transparent)
  );
  animation: colorful-shift 25s ease-in-out infinite;
}

.preview-sandbox {
  width: 100%;
  display: contents;
}

.preview-sandbox :deep(iframe) {
  width: 100%;
  height: 0;
  border: none;
  background: transparent;
}

.toolbar-icon {
  width: 16px;
  height: 16px;
  display: block;
  flex-shrink: 0;
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

.preview-code-fallback {
  padding: var(--size-4);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  overflow: auto;
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
