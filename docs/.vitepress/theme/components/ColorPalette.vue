<script setup lang="ts">
interface ColorSwatch {
  label: string;
  variable: string;
  textVariable?: string;
}

interface ColorGroup {
  name: string;
  description: string;
  swatches: ColorSwatch[];
}

const brandGroups: ColorGroup[] = [
  {
    description: 'Periwinkle violet — primary brand color',
    name: 'Primary',
    swatches: [
      { label: 'Base', variable: '--color-primary', textVariable: '--color-primary-content' },
      { label: 'Backdrop', variable: '--color-primary-backdrop', textVariable: '--color-primary-content' },
      { label: 'Content', variable: '--color-primary-content' },
      { label: 'Contrast', variable: '--color-primary-contrast' },
      { label: 'Focus', variable: '--color-primary-focus', textVariable: '--color-primary-content' },
      { label: 'Border', variable: '--color-primary-border' },
    ],
  },
  {
    description: 'Ink/charcoal (light) · silver (dark) — contrast-driven adaptive',
    name: 'Secondary',
    swatches: [
      { label: 'Base', variable: '--color-secondary', textVariable: '--color-secondary-content' },
      { label: 'Backdrop', variable: '--color-secondary-backdrop', textVariable: '--color-secondary-content' },
      { label: 'Content', variable: '--color-secondary-content' },
      { label: 'Contrast', variable: '--color-secondary-contrast' },
      { label: 'Focus', variable: '--color-secondary-focus', textVariable: '--color-secondary-content' },
      { label: 'Border', variable: '--color-secondary-border' },
    ],
  },
  {
    description: 'True gray — neutral UI surfaces',
    name: 'Neutral',
    swatches: [
      { label: 'Base', variable: '--color-neutral', textVariable: '--color-neutral-content' },
      { label: 'Backdrop', variable: '--color-neutral-backdrop', textVariable: '--color-neutral-content' },
      { label: 'Content', variable: '--color-neutral-content' },
      { label: 'Contrast', variable: '--color-neutral-contrast' },
      { label: 'Focus', variable: '--color-neutral-focus', textVariable: '--color-neutral-content' },
      { label: 'Border', variable: '--color-neutral-border' },
    ],
  },
];

const semanticGroups: ColorGroup[] = [
  {
    description: 'Cyan-blue — informational messages',
    name: 'Info',
    swatches: [
      { label: 'Base', variable: '--color-info', textVariable: '--color-info-content' },
      { label: 'Backdrop', variable: '--color-info-backdrop', textVariable: '--color-info-content' },
      { label: 'Content', variable: '--color-info-content' },
      { label: 'Contrast', variable: '--color-info-contrast' },
      { label: 'Focus', variable: '--color-info-focus', textVariable: '--color-info-content' },
      { label: 'Border', variable: '--color-info-border' },
    ],
  },
  {
    description: 'Teal — positive outcomes & confirmations',
    name: 'Success',
    swatches: [
      { label: 'Base', variable: '--color-success', textVariable: '--color-success-content' },
      { label: 'Backdrop', variable: '--color-success-backdrop', textVariable: '--color-success-content' },
      { label: 'Content', variable: '--color-success-content' },
      { label: 'Contrast', variable: '--color-success-contrast' },
      { label: 'Focus', variable: '--color-success-focus', textVariable: '--color-success-content' },
      { label: 'Border', variable: '--color-success-border' },
    ],
  },
  {
    description: 'Amber — cautionary states & alerts',
    name: 'Warning',
    swatches: [
      { label: 'Base', variable: '--color-warning', textVariable: '--color-warning-content' },
      { label: 'Backdrop', variable: '--color-warning-backdrop', textVariable: '--color-warning-content' },
      { label: 'Content', variable: '--color-warning-content' },
      { label: 'Contrast', variable: '--color-warning-contrast' },
      { label: 'Focus', variable: '--color-warning-focus', textVariable: '--color-warning-content' },
      { label: 'Border', variable: '--color-warning-border' },
    ],
  },
  {
    description: 'Vermilion — destructive actions & errors',
    name: 'Error',
    swatches: [
      { label: 'Base', variable: '--color-error', textVariable: '--color-error-content' },
      { label: 'Backdrop', variable: '--color-error-backdrop', textVariable: '--color-error-content' },
      { label: 'Content', variable: '--color-error-content' },
      { label: 'Contrast', variable: '--color-error-contrast' },
      { label: 'Focus', variable: '--color-error-focus', textVariable: '--color-error-content' },
      { label: 'Border', variable: '--color-error-border' },
    ],
  },
];

const contrastScale: ColorSwatch[] = [
  { label: '50', variable: '--color-contrast-50' },
  { label: '100', variable: '--color-contrast-100' },
  { label: '200', variable: '--color-contrast-200' },
  { label: '300', variable: '--color-contrast-300' },
  { label: '400', variable: '--color-contrast-400' },
  { label: '500', variable: '--color-contrast-500' },
  { label: '600', variable: '--color-contrast-600' },
  { label: '700', variable: '--color-contrast-700' },
  { label: '800', variable: '--color-contrast-800' },
  { label: '900', variable: '--color-contrast-900' },
];
</script>

<template>
  <div class="color-palette">
    <section class="palette-section">
      <h3 class="section-title">Brand Colors</h3>
      <div class="group-grid">
        <div v-for="group in brandGroups" :key="group.name" class="color-group">
          <div class="group-header">
            <span class="group-name">{{ group.name }}</span>
            <span class="group-desc">{{ group.description }}</span>
          </div>
          <div class="swatch-row">
            <div
              v-for="swatch in group.swatches"
              :key="swatch.variable"
              class="swatch"
              :style="{
                background: `var(${swatch.variable})`,
                color: swatch.textVariable ? `var(${swatch.textVariable})` : 'var(--color-contrast-900)',
              }">
              <span class="swatch-label">{{ swatch.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="palette-section">
      <h3 class="section-title">Semantic Colors</h3>
      <div class="group-grid">
        <div v-for="group in semanticGroups" :key="group.name" class="color-group">
          <div class="group-header">
            <span class="group-name">{{ group.name }}</span>
            <span class="group-desc">{{ group.description }}</span>
          </div>
          <div class="swatch-row">
            <div
              v-for="swatch in group.swatches"
              :key="swatch.variable"
              class="swatch"
              :style="{
                background: `var(${swatch.variable})`,
                color: swatch.textVariable ? `var(${swatch.textVariable})` : 'var(--color-contrast-900)',
              }">
              <span class="swatch-label">{{ swatch.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="palette-section">
      <h3 class="section-title">Contrast Scale</h3>
      <p class="section-desc">
        Adaptive gray scale — surfaces (50–400) and text (500–900). Automatically inverts in dark mode.
      </p>
      <div class="contrast-row">
        <div
          v-for="swatch in contrastScale"
          :key="swatch.variable"
          class="contrast-swatch"
          :style="{
            background: `var(${swatch.variable})`,
            color: Number(swatch.label) >= 500 ? 'var(--color-contrast-50)' : 'var(--color-contrast-900)',
          }">
          <span class="swatch-label">{{ swatch.label }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.color-palette {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  margin: 1.5rem 0;
}

.palette-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.5rem;
}

.section-desc {
  margin: -0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.group-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.color-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.group-header {
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
}

.group-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.group-desc {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.swatch-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
}

.swatch {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.125rem;
  padding: 0.625rem 0.5rem 0.5rem;
  min-height: 72px;
}

.contrast-row {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
}

.contrast-swatch {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.125rem;
  padding: 0.625rem 0.5rem 0.5rem;
  min-height: 72px;
}

.swatch-label {
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .swatch-row {
    grid-template-columns: repeat(3, 1fr);
  }

  .contrast-row {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 480px) {
  .swatch-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .contrast-row {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
