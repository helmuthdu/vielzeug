<script lang="ts" setup>
import { computed, reactive, watch } from 'vue';
import { t, tp } from '../../../app/i18n';
import type { HunterLoadout } from '../../../domain/types';
import type { PartyBuildOption, PartyBuildRow } from '../../composables/use-party-builds';
import LinkButton from '../LinkButton.vue';
import HunterIdentity from '../party/HunterIdentity.vue';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/checkbox';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/dialog';
import '@vielzeug/refine/select';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/text';

/**
 * Equips the party in one pass. Each hunter's row selects one of their saved builds: newest
 * by default, and carries the mode's verdict on it; confirm applies every checked row at once.
 */
const props = defineProps<{ open: boolean; rows: PartyBuildRow[] }>();
const emit = defineEmits<{ apply: [loadouts: HunterLoadout[]]; close: [] }>();

/** The chosen build per hunter, keyed by hunter id: the newest whenever the dialog opens. */
const chosen = reactive<Record<string, string>>({});
/** Checked hunters, keyed by id: a chosen build that can load, on a board that lacks it. */
const checked = reactive<Record<string, boolean>>({});

watch(
  [() => props.open, () => props.rows],
  () => {
    for (const row of props.rows) {
      chosen[row.hunter.id] = row.options[0]?.loadout.id ?? '';
      checked[row.hunter.id] = Boolean(option(row)?.availability.available && !option(row)?.equipped);
    }
  },
  { immediate: true },
);

/** The selected option of a row: the newest until the player picks another. */
function option(row: PartyBuildRow): PartyBuildOption | undefined {
  return row.options.find((entry) => entry.loadout.id === chosen[row.hunter.id]) ?? row.options[0];
}

function choose(row: PartyBuildRow, event: Event): void {
  const value = (event.target as HTMLElement & { value: string }).value;
  chosen[row.hunter.id] = value;
  const next = option(row);
  // A hand-picked build checks itself when it can load onto a board that lacks it.
  checked[row.hunter.id] = Boolean(next?.availability.available && !next?.equipped);
}

const selected = computed(() =>
  props.rows
    .map((row) => ({ checked: checked[row.hunter.id], picked: option(row), row }))
    .filter((entry) => entry.row.options.length && entry.picked && entry.checked && entry.picked.availability.available),
);

function onOpenChange(event: Event): void {
  if (event.target !== event.currentTarget) return;
  if (!(event as CustomEvent<{ open: boolean }>).detail.open) emit('close');
}

function confirm(): void {
  if (selected.value.length) emit('apply', selected.value.map((entry) => entry.picked!.loadout));
}
</script>

<template>
  <ore-dialog backdrop="blur" size="md" :label="t('deck.loadBuildsTitle')" :open="open" @open-change="onOpenChange">
    <div class="party-picker stack">
      <ore-text color="muted" size="sm">{{ t('deck.loadBuildsHint') }}</ore-text>

      <ore-list class="party-picker__list" :aria-label="t('deck.loadBuildsTitle')">
        <ore-list-item v-for="row in rows" :key="row.hunter.id">
          <div class="party-picker__row">
            <ore-checkbox
              class="party-picker__check"
              :checked="Boolean(option(row)) && checked[row.hunter.id]"
              :disabled="!row.options.length || !option(row)?.availability.available"
              @change="checked[row.hunter.id] = ($event.target as HTMLInputElement).checked">
              <span class="visually-hidden">{{ row.hunter.name }}</span>
            </ore-checkbox>
            <!-- The identity carries the equipped verdict as a pinned corner mark: the badge
                 anchors over the line's bottom corner at its default size (a step above xs,
                 the unread-marker still), no chip to wrap the row. A build that cannot fully
                 load keeps its warning chip. -->
            <ore-badge
              anchor="bottom-end"
              class="party-picker__identity-badge"
              color="primary"
              rounded="full"
              size="sm"
              variant="solid"
              v-if="option(row)?.equipped"
              :label="t('deck.equipped')">
              <!-- The badge's icon slot sizes its glyph by its own font: no icon size needed. -->
              <ore-icon aria-hidden="true" name="check" slot="icon" />
              <HunterIdentity slot="target" :hunter="row.hunter" />
            </ore-badge>
            <HunterIdentity v-else :hunter="row.hunter" />
            <ore-chip color="warning" size="sm" variant="flat" v-if="!option(row)?.equipped && option(row)?.missing">
              {{ tp('deck.loadoutUnavailable', option(row)!.missing) }}
            </ore-chip>
            <template v-if="row.options.length">
              <ore-select
                class="party-picker__select"
                hide-label
                :label="t('deck.loadBuildsChoose', { name: row.hunter.name })"
                :value="option(row)!.loadout.id"
                @change="choose(row, $event)">
                <option
                  v-for="entry in row.options"
                  :key="entry.loadout.id"
                  :value="entry.loadout.id">
                  {{ entry.loadout.name }}{{ entry.missing && !entry.equipped ? ` · ${tp('deck.loadoutUnavailable', entry.missing)}` : '' }}
                </option>
              </ore-select>
            </template>
            <ore-text class="party-picker__empty" color="muted" size="sm" v-else>
              {{ t('deck.noSavedBuild') }}
            </ore-text>
          </div>
        </ore-list-item>
      </ore-list>

      <div class="cluster" style="justify-content: space-between">
        <LinkButton size="sm" to="builds" variant="ghost">
          <ore-icon name="library" slot="prefix" />
          {{ t('deck.manageBuilds') }}
        </LinkButton>
        <div class="cluster" style="--cluster-gap: var(--size-2)">
          <ore-button size="sm" variant="bordered" @click="emit('close')">{{ t('common.close') }}</ore-button>
          <ore-button
            color="primary"
            size="sm"
            variant="solid"
            :disabled="!selected.length"
            :label="t('deck.loadBuilds')"
            @click="confirm">
            {{ t('deck.loadBuilds') }}
          </ore-button>
        </div>
      </div>
    </div>
  </ore-dialog>
</template>

<style scoped>
.party-picker__list {
  min-width: 0;
}

/* ore-list-item's default slot is its title line, whose ellipsis wrapper (`overflow: hidden`)
   clips at the title box: here it would cut the picker's focus ring at the row's right edge.
   These rows slot rich flex content, so the title part opts out of the text treatment. */
.party-picker__list ore-list-item::part(title) {
  overflow: visible;
}

/* The identity line takes the row's left, the build picker its right: side by side,
   wrapping the picker under the identity when the row runs out of width. */
.party-picker__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2-5);
  align-items: center;
}

.party-picker__check {
  flex: none;
}

/* The equipped hunter's identity carries its verdict as a corner-pinned badge: the mark
   rides over the line's bottom corner, adding no width to the row. It holds only the check
   glyph, so the component folds its label region away: no trailing gap at any size. */
.party-picker__identity-badge {
  flex: 0 1 auto;
  min-width: 0;
}

/* The build picker sits at the row's right at the input's natural 12rem: the host and
   the trigger floor together at the select's own 7rem minimum, so a tight row shrinks
   both, not just the host (the trigger would stick out past it, clipped by the row's
   list item). */
.party-picker__select {
  --select-min-width: 7rem;
  --select-font-size: 0.85rem;
  flex: 0 1 12rem;
  margin-inline-start: auto;
}

/* Phone tier: the picker wraps under the identity and fills its own line. */
@media (width < 560px) {
  .party-picker__select {
    flex: 1 1 100%;
  }
}

.party-picker__empty {
  margin-inline-start: auto;
}
</style>
