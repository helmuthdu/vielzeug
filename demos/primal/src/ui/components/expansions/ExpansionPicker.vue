<script lang="ts" setup>
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import type { ExpansionId } from '../../../domain/types';
import { coreExpansion, expansionFamilies, toggleExpansion } from '../../composables/use-expansion-picker';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/switch';
import '@vielzeug/refine/text';

const props = defineProps<{ modelValue: ExpansionId[] }>();
const emit = defineEmits<{ 'update:modelValue': [value: ExpansionId[]] }>();

const isOwned = (id: ExpansionId): boolean => props.modelValue.includes(id);

function toggle(id: ExpansionId, checked: boolean): void {
  emit('update:modelValue', toggleExpansion(props.modelValue, id, checked));
}
</script>

<template>
  <div class="game-library">
    <div class="core-setting">
      <div>
        <ore-text size="xs" variant="heading">{{ coreExpansion.name }}</ore-text>
        <ore-text color="muted" size="sm">{{ coreExpansion.description }}</ore-text>
      </div>
      <ore-chip color="primary" size="sm" variant="flat">{{ t('expansionPicker.alwaysSelected') }}</ore-chip>
    </div>

    <section class="expansion-family" v-for="family in expansionFamilies" :key="family.label">
      <ore-text as="h3" class="expansion-family__label" size="xs" variant="heading">{{ family.label }}</ore-text>
      <div class="expansion-grid">
        <ore-card
          class="expansion-setting"
          orientation="horizontal"
          padding="none"
          variant="flat"
          v-for="expansion in family.expansions"
          :key="expansion.id"
          :class="{ 'expansion-setting--owned': isOwned(expansion.id) }"
          :elevation="0">
          <div class="expansion-setting__media" slot="media">
            <img
              alt=""
              class="expansion-setting__box"
              loading="lazy"
              v-if="expansion.artwork"
              :src="asset(expansion.artwork)" />
          </div>
          <div class="expansion-setting__body">
            <ore-text size="xs" variant="heading">{{ expansion.name }}</ore-text>
            <ore-text color="muted" size="sm">{{ expansion.description }}</ore-text>
          </div>
          <div class="expansion-setting__footer" slot="footer">
            <ore-switch
              color="primary"
              :aria-label="t('expansionPicker.selectAria', { name: expansion.name })"
              :checked="isOwned(expansion.id)"
              @change="toggle(expansion.id, ($event.target as HTMLInputElement).checked)">
              {{ isOwned(expansion.id) ? t('common.selected') : t('common.notSelected') }}
            </ore-switch>
            <ore-button
              class="expansion-setting__buy"
              color="primary"
              rel="noopener noreferrer"
              size="sm"
              target="_blank"
              variant="flat"
              v-if="expansion.purchaseUrl"
              :href="expansion.purchaseUrl"
              :label="t('expansionPicker.buyAria', { name: expansion.name })">
              <ore-icon name="shopping-cart" slot="prefix"></ore-icon>
              {{ t('expansionPicker.buy') }}
            </ore-button>
          </div>
        </ore-card>
      </div>
    </section>
  </div>
</template>

<style scoped>
.game-library {
  display: grid;
  gap: var(--size-3);
  padding-bottom: var(--size-4);
}

.core-setting {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--size-4);
  align-items: center;
  padding: var(--size-4);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.expansion-family {
  display: grid;
  gap: var(--size-2);
}

.expansion-family__label {
  --text-color: var(--p-gold);
  --text-letter-spacing: 0.04em;
}

.expansion-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-3);
}

.expansion-setting {
  /* Every box carries the app's standard neutral outline: the same line the surrounding
     panels use, visible in both themes, while the lines inside stay a step fainter so a
     dozen cards never read as a cage. The surface is the roster's selection-card tint; the
     owned state lifts it a step. */
  --card-bg: light-dark(oklch(97% 0.008 92), oklch(21% 0.006 92));
  --card-border-color: var(--p-line);
  --expansion-line: var(--color-contrast-200);
  --card-radius: var(--rounded-sm);
  --card-shadow: none;
  min-width: 0;
}

/* Ownership carries no border color of its own: the owned box lifts its surface a step and
   renders its art at full color while un-owned art stays hushed: calm cues, no hue. */
.expansion-setting--owned {
  --card-bg: light-dark(oklch(94.5% 0.014 92), oklch(25% 0.009 92));
}

.expansion-setting::part(media) {
  width: var(--size-32);
  min-width: var(--size-32);
  max-width: var(--size-32);
}

.expansion-setting__media {
  display: grid;
  place-items: center;
  height: 100%;
  padding: var(--size-2);
  background: var(--color-canvas);
  border-right: var(--border) solid var(--expansion-line);
}

.expansion-setting__box {
  width: 100%;
  height: var(--size-28);
  object-fit: contain;
  /* Un-owned boxes sit slightly hushed, like un-selected roster portraits. */
  filter: saturate(0.82);
}

.expansion-setting--owned .expansion-setting__box {
  filter: none;
}

.expansion-setting__body {
  display: grid;
  gap: var(--size-2);
  min-width: 0;
  padding: var(--size-3) var(--size-3) var(--size-2);
}

.expansion-setting__footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
  justify-content: space-between;
  padding: var(--size-2) var(--size-3) var(--size-3);
  border-top: var(--border) solid var(--expansion-line);
}

.expansion-setting__buy {
  --button-padding: var(--size-2) var(--size-3);
  --button-radius: var(--rounded-sm);
}

@media (width >= 1200px) {
  .expansion-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width < 900px) {
  .expansion-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width < 700px) {
  .expansion-grid {
    grid-template-columns: 1fr;
  }

  .expansion-setting::part(card) {
    flex-direction: column;
  }

  .expansion-setting::part(media) {
    width: auto;
    min-width: 0;
    max-width: none;
  }

  .expansion-setting__media {
    height: auto;
    min-height: var(--size-36);
    border-right: 0;
    border-bottom: var(--border) solid var(--expansion-line);
  }

  .expansion-setting__box {
    height: var(--size-32);
  }
}
</style>
