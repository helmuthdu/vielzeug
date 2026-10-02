<script lang="ts" setup>
/**
 * The party step of every creation flow: the hunter filmstrip promoted from a gallery to the
 * selector. The strip browses (tapping a rail never selects); the active hero carries the
 * add/remove action, and the party tray below is the always-visible selection: portraits with
 * join order and removal: beside the live count and the party's printed rules. On phones the
 * page itself is the carousel: hunter pages flow one per screen in the document, the party
 * tray pinning itself below the navbar as they scroll beneath it: no nested scroll container,
 * so nothing has to be positioned against the viewport. Browsing is never disabled; only the
 * add action waits when the party is full.
 */
import { computed, ref, watch } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { hunterById, weaponClassById } from '../../../content/index';
import { availableHunters, PARTY_MAX, PARTY_MIN, partyMaxFor, toggleHunter, validateParty } from '../../../domain/party';
import type { ExpansionId, Hunter } from '../../../domain/types';
import HunterFilmstrip from './HunterFilmstrip.vue';
import HunterPartyHero from './HunterPartyHero.vue';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

const props = withDefaults(
  defineProps<{
    expansionIds: readonly ExpansionId[];
    /** Upper bound of the party: five once Mount Havoc is at the table; a flow with its own
     *  printed bound still passes one. */
    max?: number;
    /** Lower bound of the party: the ascent is played solo too. */
    min?: number;
    modelValue: string[];
  }>(),
  { min: PARTY_MIN },
);

/** The party's bound: the enabled boxes' rule, unless the flow pins its own. */
const partyMax = computed(() => props.max ?? partyMaxFor(props.expansionIds));
/** The natural cap sits at four without Mount Havoc, so the fifth seat is a box away. */
const fifthSeatLocked = computed(() => partyMaxFor(props.expansionIds) === PARTY_MAX);
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();

const hunters = computed(() => availableHunters(props.expansionIds));
const issues = computed(() =>
  validateParty(props.modelValue, props.expansionIds, { max: props.max, min: props.min }),
);
const full = computed(() => props.modelValue.length >= partyMax.value);

/** The slide being browsed: starts on the first chosen hunter, follows availability. */
const activeId = ref(props.modelValue[0] ?? '');
watch(
  [hunters, () => props.modelValue],
  ([list, ids]) => {
    if (list.some((hunter) => hunter.id === activeId.value)) return;
    activeId.value = ids.find((id) => list.some((hunter) => hunter.id === id)) ?? list[0]?.id ?? '';
  },
  { immediate: true },
);

const orderOf = (hunterId: string): number | undefined => {
  const index = props.modelValue.indexOf(hunterId);
  return index === -1 ? undefined : index + 1;
};
const member = (hunterId: string) => props.modelValue.includes(hunterId);
/** The tray's chips resolve once: membership ids are always known hunters in practice, and
 *  a stale id (its box switched off mid-setup) still renders a removable chip via validateParty's issue. */
const members = computed(() =>
  props.modelValue.flatMap((id) => {
    const hunter = hunterById(id);
    return hunter ? [hunter] : [];
  }),
);

function toggle(hunter: Hunter): void {
  emit('update:modelValue', toggleHunter(props.modelValue, hunter.id, partyMax.value));
}

/** Enter/Space on the strip's own focus toggles the hunter being browsed: the same key the
 *  slot picker and deck editor already commit with. Inner buttons keep their native keys. */
function onStripKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target instanceof Element && !event.target.matches('ore-carousel')) return;
  event.preventDefault();
  const hunter = hunters.value.find((entry) => entry.id === activeId.value);
  if (hunter) toggle(hunter);
}
</script>

<template>
  <section aria-labelledby="hunter-party-title" class="hunter-party stack">
    <div class="hunter-party__head">
      <div class="stack" style="--stack-gap: 0.25rem">
        <ore-text as="h2" id="hunter-party-title" size="sm" variant="heading">
          {{ t('hunterSelect.title') }}
        </ore-text>
        <ore-text color="muted" size="sm">{{ t('hunterSelect.hint', { max: partyMax, min: props.min }) }}</ore-text>
        <ore-text class="hunter-party__seat-hint" color="muted" size="xs" v-if="fifthSeatLocked">
          {{ t('hunterSelect.fifthSeatLocked') }}
        </ore-text>
      </div>
      <div aria-live="polite" class="hunter-party__count">
        <ore-text as="span" size="md" variant="heading">{{ modelValue.length }}</ore-text>
        <ore-text as="span" color="muted" size="md">/ {{ partyMax }}</ore-text>
      </div>
    </div>

    <HunterFilmstrip
      :hunters="hunters"
      :label="t('hunterSelect.title')"
      :model-value="activeId"
      :selected-ids="modelValue"
      @keydown="onStripKeydown"
      @update:model-value="activeId = $event">
      <template #active="{ hunter }">
        <HunterPartyHero
          :full="full"
          :hunter="hunter"
          :member="member(hunter.id)"
          :order="orderOf(hunter.id)"
          @toggle="toggle(hunter)" />
      </template>
    </HunterFilmstrip>

    <div class="hunter-party__deck">
      <!-- Phone width pins this head above the pages: the party's chips, count and rules stay
           visible while the hunters scroll beneath them. -->
      <div class="hunter-party__pinned" v-if="members.length || issues.length">
        <ul class="hunter-party__tray list-plain" v-if="members.length" :aria-label="t('hunterSelect.title')">
          <li v-for="hunter in members" :key="hunter.id">
            <ore-chip
              class="hunter-party__chip"
              mode="removable"
              rounded="full"
              size="lg"
              variant="bordered"
              :label="hunter.name"
              :value="hunter.id"
              @remove="emit('update:modelValue', toggleHunter(modelValue, hunter.id, partyMax))">
              <span
                aria-hidden="true"
                class="hunter-party__chip-weapon"
                slot="icon"
                :style="{ '--weapon-icon': `url(${asset(weaponClassById(hunter.classId).icon)})` }" />
              <span aria-hidden="true" class="hunter-party__chip-order">{{ orderOf(hunter.id) }}</span>
              {{ hunter.name }}
            </ore-chip>
          </li>
          <li aria-hidden="true" class="hunter-party__tray-count">
            <ore-chip rounded="full" size="sm" variant="outline">{{ modelValue.length }} / {{ partyMax }}</ore-chip>
          </li>
        </ul>

        <ul aria-live="polite" class="hunter-party__issues list-plain" v-if="issues.length">
          <li v-for="issue in issues" :key="issue.code">
            <ore-text color="warning" size="sm">◆ {{ issue.message }}</ore-text>
          </li>
        </ul>
      </div>

      <!-- Phone width: the page is the carousel: hunter pages flow one per screen, each
           carrying its own action at its foot; no nested scroll container to fight. Tabbing
           between the pages' actions scrolls them into view. -->
      <section class="hunter-party__pages" :aria-label="t('hunterSelect.title')" >
        <article
          class="hunter-party__page"
          v-for="hunter in hunters"
          :key="hunter.id"
          :class="{ 'hunter-party__page--selected': member(hunter.id) }">
          <span aria-hidden="true" class="hunter-party__page-art" :style="{ '--art': `url(${asset(hunter.artwork)})` }" />
          <div class="hunter-party__page-copy">
            <HunterPartyHero
              :full="full"
              :hunter="hunter"
              :member="member(hunter.id)"
              :order="orderOf(hunter.id)"
              @toggle="toggle(hunter)" />
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped>
.hunter-party {
  --stack-gap: 0.75rem;
}

.hunter-party__head {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.hunter-party__count {
  display: flex;
  gap: var(--size-0-5);
  align-items: baseline;
  white-space: nowrap;
}

/* The deck wrapper disappears into the section's stack on desktop: its tray and rules place
   themselves under the strip, and becomes the phone's page flow below 640px. */
.hunter-party__deck {
  display: contents;
}

/* The pinned head likewise: plain contents on desktop, the sticky tray on the phone. */
.hunter-party__pinned {
  display: contents;
}

/* The selection state, always visible: portrait, join order, weapon and removal. */
.hunter-party__tray {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
}

/* The member chips are Refine's own removable chip: the weapon glyph rides its icon slot :
   legible where a 28px portrait was not, and the join order the label. */
.hunter-party__chip {
  --chip-icon-size: var(--size-7);
}

.hunter-party__chip-weapon {
  color: var(--p-text-muted);
  background-color: currentcolor;
  -webkit-mask: var(--weapon-icon) center / contain no-repeat;
  mask: var(--weapon-icon) center / contain no-repeat;
}

/* The chip's own remove button pulls flush to the pill's border by design; give it back the
   padding's breathing room so the × clears the curve. */
.hunter-party__chip::part(remove-btn) {
  margin-inline-end: 0;
}

.hunter-party__chip-order {
  margin-inline-end: var(--size-1);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-gold);
}

.hunter-party__tray-count {
  margin-inline-start: auto;
}

.hunter-party__issues {
  display: grid;
  gap: 0.25rem;
}

.hunter-party__pages {
  display: none;
}

@media (width < 640px) {
  /* The horizontal strip yields to the vertical page flow: the party tray pins below the
     navbar and rides above the hunter pages as the page itself scrolls. */
  .hunter-party :deep(.hunter-filmstrip) {
    display: none;
  }

  /* A block flow spans the pinned head and the pages, so the tray can travel with the
     scroll: a grid item could never leave its own track. */
  .hunter-party__deck {
    display: block;
  }

  /* The tray pins itself below the sticky navbar: the party's state stays visible through the
     whole browse, releasing after the last page. */
  .hunter-party__pinned {
    position: sticky;
    top: var(--navbar-height, var(--size-14));
    z-index: var(--z-sticky, 1);
    display: grid;
    gap: var(--size-1);
    padding-block: var(--size-1);
    background: var(--p-panel);
    border-bottom: var(--border) solid var(--p-line);
  }

  /* One tight line, however large the party grows: the chips never wrap: the rail scrolls
     horizontally past three members, and the count leads it, so it never scrolls away. */
  .hunter-party__tray {
    flex-wrap: nowrap;
    gap: var(--size-1);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .hunter-party__tray-count {
    order: -1;
    margin-inline: 0 var(--size-1);
    white-space: nowrap;
  }

  .hunter-party__pages {
    display: grid;
    gap: var(--size-2);
    margin-block-start: var(--size-2);
  }

  /* One hunter per screen: the artwork anchors its subject, the copy and action ride the
     gradient at the foot: inside the thumb zone, with the next page's edge peeking below. */
  .hunter-party__page {
    position: relative;
    display: grid;
    align-items: end;
    min-height: max(22rem, 75svh);
    overflow: hidden;
    border-radius: var(--rounded-sm);
    box-shadow: inset 0 0 0 1px var(--p-line);
  }

  .hunter-party__page-art {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        180deg,
        transparent 42%,
        color-mix(in oklch, var(--p-panel) 72%, transparent) 78%,
        var(--p-panel) 100%
      ),
      var(--art) 50% 12% / cover no-repeat,
      var(--p-panel-sunken);
  }

  .hunter-party__page--selected {
    box-shadow: inset 0 0 0 2px var(--p-gold);
  }

  .hunter-party__page-copy {
    position: relative;
    padding: var(--size-4);
    background: linear-gradient(
      180deg,
      transparent,
      color-mix(in oklch, var(--p-panel) 82%, transparent) 34%,
      var(--p-panel) 76%
    );
  }
}
</style>
