<script lang="ts" setup>
import { asset } from '../../app/assets';
import { t } from '../../app/i18n';
import type { MonsterStanceDamage } from '../../domain/types';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/text';

/**
 * The damage-per-hunter panel every board briefing shares: the wound math the next fight
 * prints, its heading carrying the fight's aggression and variant tags and the stance
 * targets beneath. The damage row decides the variant chip; the call site passes the
 * aggression it fights at.
 */
defineProps<{ aggression: number | null; damage: MonsterStanceDamage }>();

const stanceLabels = ['I', 'II', 'III', 'IV', 'V'] as const;
const stanceEntries = (row: MonsterStanceDamage) =>
  Object.entries(row.stances ?? {}).map(([stance, damage]) => ({
    damage,
    label: stanceLabels[Number(stance) - 1],
  }));
const damageGlyphs = {
  perPlayer: { '--glyph': `url(${asset('/icons/icon_per_player.svg')})` },
  wound: { '--glyph': `url(${asset('/icons/icon_wound.svg')})` },
} as const;
</script>

<template>
  <div class="stance-panel">
    <div class="stance-panel__heading">
      <ore-text variant="overline">{{ t('questBoard.damagePerHunter') }}</ore-text>
      <ore-text color="muted" size="xs">{{ t('questBoard.damageHint') }}</ore-text>
      <div class="stance-panel__tags">
        <ore-chip size="sm" variant="flat" v-if="aggression !== null">
          {{ t('questBoard.aggression', { level: aggression }) }}
        </ore-chip>
        <ore-chip size="sm" variant="flat" :color="damage.nightmare ? 'error' : undefined">
          {{ damage.nightmare ? t('questBoard.nightmare') : t('questBoard.standard') }}
        </ore-chip>
      </div>
    </div>
    <div class="stance-panel__targets">
      <article
        class="stance-target"
        v-for="target in stanceEntries(damage)"
        :key="target.label"
        :aria-label="t('questBoard.stanceAria', { damage: target.damage, stance: target.label })">
        <div class="stance-target__stance">
          <ore-text color="muted" size="xs" variant="overline">
            {{ t('questBoard.stance', { stance: target.label }) }}
          </ore-text>
        </div>
        <div class="stance-target__equation">
          <strong>{{ target.damage }}</strong>
          <span
            aria-hidden="true"
            class="stance-target__glyph stance-target__glyph--player"
            :style="damageGlyphs.perPlayer" />
          <span aria-hidden="true" class="stance-target__arrow">→</span>
          <span
            aria-hidden="true"
            class="stance-target__glyph stance-target__glyph--wound"
            :style="damageGlyphs.wound" />
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.stance-panel {
  display: grid;
  gap: var(--size-2);
}

.stance-panel__heading,
.stance-panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: center;
}

.stance-panel__heading {
  justify-content: space-between;
}

.stance-panel__targets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--size-32)), 1fr));
  gap: var(--size-2);
}

.stance-target {
  display: grid;
  gap: var(--size-2);
  align-content: start;
  min-width: 0;
  padding: var(--size-3);
  background: var(--p-panel);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.stance-target__stance {
  display: grid;
  gap: var(--size-0-5);
}

.stance-target__equation {
  display: flex;
  gap: var(--size-1-5);
  align-items: center;
  min-width: 0;
}

.stance-target__equation strong {
  font-family: var(--p-heading);
  font-size: var(--text-xl);
  color: var(--p-text-strong);
}

/* Token glyphs are masks in theme colors so they adapt to light and dark mode. */
.stance-target__glyph {
  display: inline-block;
  flex-shrink: 0;
  inline-size: var(--size-5);
  block-size: var(--size-5);
  background: currentcolor;
  mask: var(--glyph) center / contain no-repeat;
}

.stance-target__glyph--player {
  color: var(--p-text-muted);
}

.stance-target__glyph--wound {
  color: var(--p-blood);
}

.stance-target__arrow {
  color: var(--p-text-muted);
}
</style>
