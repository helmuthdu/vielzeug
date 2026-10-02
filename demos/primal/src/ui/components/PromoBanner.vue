<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { asset } from '../../app/assets';
import { t } from '../../app/i18n';
import { PROMOS } from '../../content/promos';

/**
 * Corner announcements, framed like the music video window. One component, two
 * homes: on fine pointers the cards teleport into the fixed #corner-dock above
 * the video window; on touch they land in the in-page .video-area, beside the
 * video from tablet up and above it on phones. Each card can be dismissed; the
 * choice persists per promo on the device.
 */

const DISMISSED_KEY = 'primal:promos-dismissed';

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

const dismissed = ref(loadDismissed());
const visible = computed(() => PROMOS.filter((promo) => !dismissed.value.has(promo.id)));

function dismiss(id: string): void {
  dismissed.value = new Set(dismissed.value).add(id);
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed.value]));
  } catch {
    /* storage unavailable: the dismissal simply lasts this visit */
  }
}

// The teleport home follows the pointer, matching where use-youtube-audio.ts
// parks the video window (fixed corner dock vs. in-page area).
const coarsePointer = window.matchMedia('(pointer: coarse)');
const target = ref(coarsePointer.matches ? '.video-area__promos' : '#corner-dock');

function syncTarget(): void {
  target.value = coarsePointer.matches ? '.video-area__promos' : '#corner-dock';
}

// The area's grid pairs the promo column with the video (styled in App.vue);
// the class is toggled imperatively because the teleported cards sit outside
// this component's own subtree.
function syncAreaClass(showing: boolean): void {
  document.querySelector('.video-area')?.classList.toggle('has-promos', showing);
}

onMounted(() => {
  coarsePointer.addEventListener('change', syncTarget);
  syncAreaClass(visible.value.length > 0);
});
watch(visible, (list) => syncAreaClass(list.length > 0));
onBeforeUnmount(() => {
  coarsePointer.removeEventListener('change', syncTarget);
  syncAreaClass(false);
});
</script>

<template>
  <Teleport v-if="visible.length" :to="target" >
    <article class="promo" v-for="promo in visible" :key="promo.id">
      <a
        class="promo__link"
        rel="noopener noreferrer"
        target="_blank"
        :aria-label="t('promo.linkAria', { title: t(promo.titleKey) })"
        :href="promo.url">
        <img
          class="promo__image"
          loading="lazy"
          :alt="t(promo.titleKey)"
          :height="promo.height"
          :src="asset(promo.image)"
          :width="promo.width"/>
        <span class="promo__visit">
          {{ t('promo.visit') }}
          <ore-icon name="external-link" size="12" />
        </span>
      </a>
      <button class="promo__dismiss" type="button" :aria-label="t('promo.dismiss')" @click="dismiss(promo.id)">
        <ore-icon name="x" size="14" />
      </button>
    </article>
  </Teleport>
</template>

<style scoped>
/* The frame: the music video window's exact treatment: sunken panel, hairline
   border, small radius, size-2 padding around the art. */
.promo {
  position: relative;
}

.promo__link {
  position: relative;
  box-sizing: border-box;
  display: block;
  padding: var(--size-2);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
  transition: border-color var(--p-motion) var(--p-ease);
}

.promo__link:hover,
.promo__link:focus-visible {
  border-color: var(--p-gold);
}

.promo__link:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: var(--size-1);
}

.promo__image {
  display: block;
  width: 100%;
  /* The video window's content box: 16:9, the art cover-cropped into it.
     height:auto must stay explicit: the width/height attributes would
     otherwise win as presentational hints and restore the art's own ratio. */
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: inherit;
}

/* The two chips over the art share the menu meta-pill treatment: a dark pill
   with gold text, readable over the key art in both themes. */

.promo__visit {
  position: absolute;
  inset-block-end: var(--size-2);
  inset-inline-end: var(--size-2);
  display: inline-flex;
  gap: var(--size-1);
  align-items: center;
  padding: var(--size-0-5) var(--size-2-5);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--color-primary-light);
  letter-spacing: 0.04em;
  background: light-dark(
    color-mix(in oklch, var(--p-text-strong) 85%, transparent),
    color-mix(in oklch, var(--p-canvas) 72%, transparent)
  );
  border-radius: var(--rounded-full);
  opacity: 0.85;
  transition: opacity var(--transition-fast) var(--p-ease);
}

.promo__link:hover .promo__visit,
.promo__link:focus-visible .promo__visit {
  opacity: 1;
}

.promo__dismiss {
  position: absolute;
  inset-block-start: var(--size-2);
  inset-inline-end: var(--size-2);
  display: grid;
  place-items: center;
  width: var(--size-8);
  height: var(--size-8);
  padding: 0;
  font: inherit;
  color: var(--color-primary-light);
  cursor: pointer;
  background: light-dark(
    color-mix(in oklch, var(--p-text-strong) 85%, transparent),
    color-mix(in oklch, var(--p-canvas) 72%, transparent)
  );
  border: 0;
  border-radius: var(--rounded-full);
  opacity: 0.8;
  transition:
    color var(--p-motion) var(--p-ease),
    opacity var(--transition-fast) var(--p-ease);
}

.promo__dismiss:hover,
.promo__dismiss:focus-visible {
  color: var(--p-gold);
  opacity: 1;
}

.promo__dismiss:focus-visible {
  outline: var(--border-2) solid var(--p-gold);
  outline-offset: 2px;
}
</style>
