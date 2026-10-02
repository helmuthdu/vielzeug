<script lang="ts" setup>
import { computed } from 'vue';
import { asset } from '../../app/assets';
import { t } from '../../app/i18n';
import { settings } from '../../app/store';
import { navigate, useReadable } from '../../app/vue-bridge';
import { missingExpansionIds, requiredExpansionsFor } from '../../domain/prerequisites';
import ExpansionRequirement from '../components/expansions/ExpansionRequirement.vue';
import PageHeader from '../components/PageHeader.vue';
import '@vielzeug/refine/card';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/text';

// A mode is locked when the shelf cannot meet its box requirement. The Winds card asks whether
// any series can be started (the union of every series' biome boards); the create page narrows
// to the chosen series.
const owned = useReadable(settings);
const shelf = computed(() => owned.value.ownedExpansionIds);
const ascentMissing = computed(() => missingExpansionIds(requiredExpansionsFor('ascent'), shelf.value));
const challengeMissing = computed(() => missingExpansionIds(requiredExpansionsFor('challenge'), shelf.value));
</script>

<template>
  <div class="frame stack" style="--stack-gap: 2rem">
    <div>
      <PageHeader :eyebrow="t('newGame.eyebrow')" :subtitle="t('newGame.subtitle')" :title="t('newGame.title')" />
      <ore-grid cols="1" cols-sm="2" gap="lg">
        <ore-card
          class="mode"
          interactive
          padding="none"
          :aria-label="t('newGame.campaign.cardAria')"
          @activate="navigate('campaignCreate')">
          <div class="mode__surface" :style="{ '--art': `url(${asset('/backgrounds/bg_campaign.webp')})` }">
            <div class="mode__copy stack" style="--stack-gap: 0.6rem">
              <ore-text variant="overline">{{ t('newGame.campaign.meta') }}</ore-text>
              <ore-text as="h2" class="mode__title" size="lg" variant="heading">
                {{ t('newGame.campaign.title') }}
              </ore-text>
              <ore-text size="sm">{{ t('newGame.campaign.copy') }}</ore-text>
            </div>
          </div>
        </ore-card>
        <ore-card
          class="mode"
          interactive
          padding="none"
          :aria-label="t('newGame.expedition.cardAria')"
          @activate="navigate('expeditionCreate')">
          <div class="mode__surface" :style="{ '--art': `url(${asset('/backgrounds/bg_expedition.webp')})` }">
            <div class="mode__copy stack" style="--stack-gap: 0.6rem">
              <ore-text variant="overline">{{ t('newGame.expedition.meta') }}</ore-text>
              <ore-text as="h2" class="mode__title" size="lg" variant="heading">
                {{ t('newGame.expedition.title') }}
              </ore-text>
              <ore-text size="sm">{{ t('newGame.expedition.copy') }}</ore-text>
            </div>
          </div>
        </ore-card>
        <ore-card
          class="mode"
          interactive
          padding="none"
          :aria-label="t('newGame.ascent.cardAria')"
          :disabled="ascentMissing.length > 0"
          @activate="navigate('ascentCreate')">
          <div class="mode__surface" :style="{ '--art': `url(${asset('/backgrounds/bg_mount_havoc_2.webp')})` }">
            <div class="mode__copy stack" style="--stack-gap: 0.6rem">
              <ore-text variant="overline">{{ t('newGame.ascent.meta') }}</ore-text>
              <ore-text as="h2" class="mode__title" size="lg" variant="heading">
                {{ t('newGame.ascent.title') }}
              </ore-text>
              <ore-text size="sm">{{ t('newGame.ascent.copy') }}</ore-text>
              <ExpansionRequirement
                variant="locked"
                v-if="ascentMissing.length > 0"
                :missing="ascentMissing"
                :required="requiredExpansionsFor('ascent')"/>
            </div>
          </div>
        </ore-card>
        <ore-card
          class="mode"
          interactive
          padding="none"
          :aria-label="t('newGame.challenge.cardAria')"
          :disabled="challengeMissing.length > 0"
          @activate="navigate('challengeCreate')">
          <div class="mode__surface" :style="{ '--art': `url(${asset('/backgrounds/bg_challenges.webp')})` }">
            <div class="mode__copy stack" style="--stack-gap: 0.6rem">
              <ore-text variant="overline">{{ t('newGame.challenge.meta') }}</ore-text>
              <ore-text as="h2" class="mode__title" size="lg" variant="heading">
                {{ t('newGame.challenge.title') }}
              </ore-text>
              <ore-text size="sm">{{ t('newGame.challenge.copy') }}</ore-text>
              <ExpansionRequirement
                variant="locked"
                v-if="challengeMissing.length > 0"
                :missing="challengeMissing"
                :required="requiredExpansionsFor('challenge')"/>
            </div>
          </div>
        </ore-card>
      </ore-grid>
    </div>
  </div>
</template>

<style scoped>
.mode {
  --card-hover-shadow: var(--shadow-sm);
  --card-shadow: none;
}

.mode__surface {
  position: relative;
  /* Border-box so the printed height is the card height: 26rem of art reads at laptop
     width while keeping all four modes above the fold. */
  box-sizing: border-box;
  display: grid;
  align-content: end;
  min-height: 26rem;
  padding: clamp(1.25rem, 3vw, 2rem);
  overflow: hidden;
  isolation: isolate;
}

.mode__surface::before,
.mode__surface::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
}

.mode__surface::before {
  z-index: -2;
  background:
    var(--art) center / cover no-repeat,
    var(--p-panel-sunken);
  transition: transform var(--p-motion) var(--p-ease);
}

.mode__surface::after {
  z-index: -1;
  background: linear-gradient(
    180deg,
    transparent 18%,
    color-mix(in oklch, var(--p-panel) 32%, transparent) 42%,
    color-mix(in oklch, var(--p-panel) 92%, transparent) 68%,
    var(--p-panel) 100%
  );
}

/* The art zoom is the page's one authored motion; the motion token zeroes it under both the
   OS preference and the app setting, and the focus twin keeps keyboard parity with hover. */
.mode:hover .mode__surface::before,
.mode:focus-visible .mode__surface::before {
  transform: scale(1.035);
}

.mode__copy {
  max-width: 52ch;
}

.mode__title {
  --text-color: var(--p-text-strong);
  text-shadow: none;
}

@media (width < 640px) {
  .mode__surface {
    min-height: 22.5rem;
  }

  .mode__surface::after {
    background: linear-gradient(
      180deg,
      transparent 4%,
      color-mix(in oklch, var(--p-panel) 48%, transparent) 30%,
      color-mix(in oklch, var(--p-panel) 94%, transparent) 56%,
      var(--p-panel) 100%
    );
  }
}
</style>
