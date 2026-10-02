<script lang="ts" setup>
import { computed, nextTick, ref, useId, watch } from 'vue';
import { asset } from '../../../app/assets';
import { type MessageKey, t } from '../../../app/i18n';
import { type MonsterStatusDefinition, monsterStances, monsterStatuses, terrainById, terrains } from '../../../content';
import {
  canWound,
  isIdleMonsterState,
  struggleAtUnleash,
  unleashThreshold,
  upkeepStruggleGain,
  woundThreshold,
} from '../../../domain/monster-state';
import type {
  AggressionLevel,
  ExpansionId,
  Monster,
  MonsterCounter,
  MonsterFightState,
  MonsterStance,
  MonsterToken,
  Sector,
  Terrain,
  TerrainToken,
} from '../../../domain/types';
import AggressionMark from '../AggressionMark.vue';
import BoardFooter from '../board/BoardFooter.vue';
import RuleSearch from '../board/RuleSearch.vue';
import { type BoardRule, statusBoardRule, terrainBoardRule } from '../board/rules';
import ResourceIcon from '../ResourceIcon.vue';
import '@vielzeug/refine/alert';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/counter';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/progress';
import '@vielzeug/refine/select';
import '@vielzeug/refine/text';
import '@vielzeug/refine/tooltip';

/**
 * The monster's fight board: damage on the current stance with its modifiers: the stance's toughness
 * and the wound it pays for, bonus damage and the ×2 icon: struggle with its acceleration tokens, status tokens, the battlefield's terrain reference and a rules lookup.
 * Pure presentation: every edit is emitted upward.
 */
const props = defineProps<{
  aggression: AggressionLevel | null;
  /** The hunt's enabled expansions: the add form only offers terrain from these boxes. */
  expansionIds: readonly ExpansionId[];
  lockReason: string;
  locked: boolean;
  monster: Monster;
  partySize: number;
  state: MonsterFightState;
  /** The board's live terrain tokens: placements, melts and removals already applied. */
  terrain: readonly TerrainToken[];
}>();

const emit = defineEmits<{
  adjust: [counter: MonsterCounter, delta: number];
  confirmWound: [];
  clear: [];
  placeTerrain: [sector: Sector | null, terrainId: string];
  removeTerrain: [tokenId: string];
  rule: [rule: BoardRule];
  token: [token: MonsterToken, delta: number];
  transformTerrain: [tokenId: string];
  unleash: [];
  stance: [stance: MonsterStance];
}>();

interface TerrainGroup {
  count: number;
  key: string;
  sector: Sector | null;
  terrain: Terrain;
  /** One token of the group: transform and remove act on a single chip. */
  tokenId: string;
  /** The terrain the chain advances to, when this token transforms. */
  transformsTo: Terrain | undefined;
}

const groupKey = (terrainId: string, sector: Sector | null): string => `${terrainId}:${sector ?? 'any'}`;

/** One row per terrain and sector. A null sector is in play without a fixed place: the
    table decides where the token goes. */
const terrainGroups = computed<TerrainGroup[]>(() => {
  const groups = new Map<string, TerrainToken[]>();
  for (const token of props.terrain) {
    const key = groupKey(token.terrainId, token.sector);
    groups.set(key, [...(groups.get(key) ?? []), token]);
  }
  return [...groups.values()].flatMap((tokens) => {
    const terrain = terrainById(tokens[0]?.terrainId ?? '');
    if (!terrain) return [];
    return [
      {
        count: tokens.length,
        key: groupKey(terrain.id, tokens[0]?.sector ?? null),
        sector: tokens[0]?.sector ?? null,
        terrain,
        tokenId: tokens[0]?.id ?? '',
        transformsTo: terrain.transformsTo ? terrainById(terrain.transformsTo) : undefined,
      },
    ];
  });
});

const groupPlacement = (group: TerrainGroup): string => {
  const where = group.sector === null ? t('battlefield.anySector') : sectorLabel(group.sector);
  return group.count > 1 ? `${where} ×${group.count}` : where;
};

/** The row just gained a chip: pulsed so the table sees a placement, melt or fire land. */
const flashed = (group: TerrainGroup): boolean => !!flash.value?.keys.includes(group.key);

interface TerrainTally {
  count: number;
  sector: Sector | null;
  terrainId: string;
}

const tallyTerrain = (tokens: readonly TerrainToken[]): TerrainTally[] => {
  const counts = new Map<string, TerrainTally>();
  for (const token of tokens) {
    const key = groupKey(token.terrainId, token.sector);
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { count: 1, sector: token.sector, terrainId: token.terrainId });
  }
  return [...counts.values()];
};

/** The groups that just gained a chip: pulsed so the table sees a placement, melt or fire land. */
const flash = ref<{ keys: readonly string[]; pulse: number } | null>(null);
const terrainAnnouncement = ref('');

const sectorName = (sector: Sector | null): string =>
  sector === null ? t('battlefield.anySector') : sectorLabel(sector);

const tallyCount = (tallies: TerrainTally[], terrainId: string, sector: Sector | null): number =>
  tallies.find((entry) => entry.terrainId === terrainId && entry.sector === sector)?.count ?? 0;

// Diffing the live tokens (rather than hooking the commands) also covers changes that arrive
// over a shared session: every device sees the melt land.
watch(
  () => props.terrain,
  (next, prev) => {
    if (!prev) return;
    const after = tallyTerrain(next);
    const afterByKey = new Map(after.map((entry) => [groupKey(entry.terrainId, entry.sector), entry]));
    const before = tallyTerrain(prev);
    const beforeByKey = new Map(before.map((entry) => [groupKey(entry.terrainId, entry.sector), entry]));
    const grown = after.filter(
      (entry) => entry.count > (beforeByKey.get(groupKey(entry.terrainId, entry.sector))?.count ?? 0),
    );
    if (grown.length === 0) return;
    flash.value = {
      keys: grown.map((entry) => groupKey(entry.terrainId, entry.sector)),
      pulse: (flash.value?.pulse ?? 0) + 1,
    };

    // Fire landing resolves its printed interaction with the whole sector: report it as one event.
    const fire = grown.find((entry) => entry.terrainId === 'fire');
    if (fire) {
      const effects: string[] = [];
      const burned = tallyCount(before, 'brush', fire.sector);
      const evaporated = tallyCount(before, 'water', fire.sector);
      const melted = tallyCount(before, 'ice', fire.sector);
      if (burned > 0) effects.push(t('monsterBoard.terrainAnnounceBurn', { count: burned }));
      if (evaporated > 0) effects.push(t('monsterBoard.terrainAnnounceEvaporate', { count: evaporated }));
      if (melted > 0) effects.push(t('monsterBoard.terrainAnnounceIceMelt', { count: melted }));
      terrainAnnouncement.value = effects.length
        ? `${t('monsterBoard.terrainAnnounceFire', { sector: sectorName(fire.sector) })}: ${effects.join(', ')}`
        : t('monsterBoard.terrainAnnouncePlace', { name: 'Fire', sector: sectorName(fire.sector) });
      return;
    }

    const landed = grown[0];
    // A melt reads as one group losing a chip while its chain successor gains one in the same sector.
    const meltedFrom = before.find(
      (entry) =>
        entry.sector === landed.sector &&
        terrainById(entry.terrainId)?.transformsTo === landed.terrainId &&
        entry.count > (afterByKey.get(groupKey(entry.terrainId, entry.sector))?.count ?? 0),
    );
    terrainAnnouncement.value = meltedFrom
      ? t('monsterBoard.terrainAnnounceTransform', {
        name: terrainById(meltedFrom.terrainId)?.name ?? meltedFrom.terrainId,
        target: terrainById(landed.terrainId)?.name ?? landed.terrainId,
      })
      : t('monsterBoard.terrainAnnouncePlace', {
        name: terrainById(landed.terrainId)?.name ?? landed.terrainId,
        sector: sectorName(landed.sector),
      });
  },
);

/** Terrain the hunt's boxes actually contain: core always ships. */
const catalogTerrains = computed(() =>
  terrains.filter((entry) => entry.expansionId === 'core' || props.expansionIds.includes(entry.expansionId)),
);

// The place-a-token form: the fight calls for a terrain, the table adds the chip. Opening resets
// the drafts to the first owned terrain, and focus follows the form in and back out.
const addingTerrain = ref(false);
const draftTerrainId = ref('');
const draftSector = ref('any');
const addToggle = ref<HTMLElement>();
const terrainPicker = ref<HTMLElement>();
const selectValue = (event: Event) =>
  (event as CustomEvent<{ value: string }>).detail?.value ?? (event.target as HTMLSelectElement).value;

/** The stance cards this monster actually owns: three for a standard hunt, five for the Awakened. */
const stanceOptions = computed<readonly MonsterStance[]>(() => monsterStances(props.monster));

function chooseStance(event: Event): void {
  const stance = Number(selectValue(event));

  if (stanceOptions.value.includes(stance as MonsterStance) && stance !== props.state.stance)
    emit('stance', stance as MonsterStance);
}

function openAdd(): void {
  draftTerrainId.value = catalogTerrains.value[0]?.id ?? '';
  draftSector.value = 'any';
  addingTerrain.value = true;
  void nextTick(() => terrainPicker.value?.focus());
}

function closeAdd(): void {
  addingTerrain.value = false;
  void nextTick(() => addToggle.value?.focus());
}

function confirmPlace(): void {
  emit('placeTerrain', draftSector.value === 'any' ? null : (draftSector.value as Sector), draftTerrainId.value);
  closeAdd();
}

type TokenStatus = MonsterStatusDefinition & { kind: 'token' };
type CounterStatus = MonsterStatusDefinition & { kind: 'counter' };

const counterStatus = (id: MonsterCounter): CounterStatus =>
  monsterStatuses.find(
    (status): status is CounterStatus => status.kind === 'counter' && status.id === id,
  ) as CounterStatus;
const tokenStatus = (id: MonsterToken): TokenStatus =>
  monsterStatuses.find((status): status is TokenStatus => status.kind === 'token' && status.id === id) as TokenStatus;
const damage = counterStatus('damage');
const toughness = counterStatus('toughness');
const bonus = counterStatus('bonus');
const double = tokenStatus('double');
const struggle = counterStatus('struggle');
const acceleration = counterStatus('acceleration');
const unstoppable = tokenStatus('unstoppable');
// ×2 sits with the damage it modifies, so the token grid holds the status tokens only.
const tokens = monsterStatuses.filter(
  (status): status is TokenStatus => status.kind === 'token' && status.id !== 'double',
);

const uid = useId();
const threshold = computed(() => unleashThreshold(props.partySize));
const unleashed = computed(() => struggleAtUnleash(props.state, props.partySize));
const struggleValue = computed(() => Math.min(props.state.struggle, threshold.value));
const upkeepGain = computed(() => upkeepStruggleGain(props.state));
const isUnstoppable = computed(() => props.state.tokens.unstoppable > 0);
const woundCost = computed(() => woundThreshold(props.state, props.partySize));
const woundReady = computed(() => canWound(props.state, props.partySize));
const perPlayerGlyph = { '--glyph': `url(${asset('/icons/icon_per_player.svg')})` };
const toughnessSet = computed(() => props.state.toughness > 0);
// Text twin of the slotted hint below, so the counter's aria-describedby reads the same thing.
const toughnessHint = computed(() =>
  toughnessSet.value
    ? t('monsterBoard.toughnessHint', {
      cost: woundCost.value,
      party: props.partySize,
      toughness: props.state.toughness,
    })
    : toughness.hint,
);
const isDoubled = computed(() => props.state.tokens.double > 0);
const bonusHint = computed(() => {
  const parts = [props.state.bonus > 0 ? `+${props.state.bonus}` : null, isDoubled.value ? '×2' : null].filter(Boolean);
  return parts.length ? t('monsterBoard.damageValue', { mods: parts.join(', then ') }) : bonus.hint;
});
// One rule entry covers the bonus tokens and the ×2 icon.
const bonusRule = computed<BoardRule>(() => {
  const base = statusBoardRule(bonus);
  const parts = [...base.parts];
  if (double.rule) parts.push({ labelKey: 'tokenRule.effect', text: double.rule, tone: 'effect' as const });
  return { ...base, hint: t('monsterBoard.bonusRuleHint'), parts };
});
const idle = computed(() => isIdleMonsterState(props.state, props.partySize));

const SECTOR_KEY: Record<Sector, MessageKey> = {
  edges: 'battlefield.edges',
  front: 'battlefield.front',
  'left-flank': 'battlefield.leftFlank',
  rear: 'battlefield.back',
  'right-flank': 'battlefield.rightFlank',
};

const sectorLabel = (sector: Sector): string => t(SECTOR_KEY[sector] ?? 'battlefield.edges');

const SECTOR_ORDER: Sector[] = ['front', 'left-flank', 'right-flank', 'rear', 'edges'];
const sectorOptions = [
  { id: 'any', label: t('battlefield.anySector') },
  ...SECTOR_ORDER.map((sector) => ({ id: sector, label: sectorLabel(sector) })),
];

const tokenValue = (status: TokenStatus): number => props.state.tokens[status.id];

const deltaOf = (event: Event): number => (event as CustomEvent<{ delta: number; value: number }>).detail.delta;
const checkedOf = (event: Event): boolean => (event as CustomEvent<{ checked: boolean }>).detail.checked;

function onCounter(status: CounterStatus, event: Event): void {
  if (props.locked) return;
  const delta = deltaOf(event);
  if (delta !== 0) emit('adjust', status.id, delta);
}

function onToken(status: TokenStatus, event: Event): void {
  if (props.locked) return;
  const delta = (checkedOf(event) ? 1 : 0) - tokenValue(status);
  if (delta !== 0) emit('token', status.id, delta);
}
</script>

<template>
  <article class="mb" :aria-label="t('board.boardAria', { name: monster.name })"
    :class="{ 'mb--unleashed': unleashed }">
    <header class="mb__identity">
      <img alt="" class="mb__art" :src="asset(monster.trophyIcon)" />
      <div class="mb__who">
        <ore-text as="h2" class="mb__name" size="xl" variant="heading">{{ monster.name }}</ore-text>
        <ore-text class="mb__meta" color="muted" size="sm">
          <ResourceIcon size="sm" :id="monster.element" />
          <span class="mb__habitat">{{ monster.habitat }}</span>
        </ore-text>
      </div>
      <AggressionMark class="mb__aggression" size="sm" v-if="aggression !== null" :level="aggression" />
    </header>

    <div class="mb__overview">
      <section class="mb__band mb__area-band" :aria-label="t('board.damage')">
        <img alt="" class="mb__band-art" :src="asset(monster.trophyIcon)" />
        <ore-counter class="mb__damage" color="error" large-step="5" quick-steps size="lg" :hint="damage.hint"
          :label="damage.name" :readonly="locked" :value="state.damage" @change="onCounter(damage, $event)">
          <img alt="" slot="icon" v-if="damage.art" :src="asset(damage.art)" />
          <ore-select class="mb__stance-select" hide-label size="sm" slot="header-end" variant="ghost"
            :aria-label="t('monsterBoard.currentStance')" :disabled="locked" :label="t('monsterBoard.currentStance')"
            :value="String(state.stance)" @change="chooseStance">
            <option v-for="stance in stanceOptions" :key="stance" :value="String(stance)">
              {{ t('monsterBoard.stanceNumber', { stance }) }}
            </option>
          </ore-select>
        </ore-counter>
        <div class="mb__mods">
          <div class="mb__mod" :class="{ 'mb__mod--ready': woundReady }">
            <ore-counter class="mb__mod-counter" size="sm" :hint="toughnessHint" :label="toughness.name"
              :readonly="locked" :value="state.toughness" @change="onCounter(toughness, $event)">
              <ore-icon aria-hidden="true" slot="icon" :name="toughness.icon" />
              <span class="mb__mod-hint" slot="hint" v-if="toughnessSet">
                {{ state.toughness }} × {{ partySize }}
                <span class="mb__glyph mb__glyph--inline" role="img" :aria-label="t('board.perPlayer')"
                  :style="perPlayerGlyph" />
                · {{ t('monsterBoard.toughnessHintSuffix', { cost: woundCost }) }}
              </span>
            </ore-counter>
            <ore-button class="mb__mod-action" fullwidth size="sm" v-if="!locked"
              :color="woundReady ? 'error' : undefined" :disabled="!woundReady" :label="t('monsterBoard.confirmWound')"
              :variant="woundReady ? 'solid' : 'bordered'" @click="emit('confirmWound')">
              <span aria-hidden="true" class="mb__glyph" slot="prefix"
                :style="{ '--glyph': `url(${asset('/icons/icon_wound.svg')})` }" />
              {{ t('monsterBoard.confirmWound') }}
            </ore-button>
            <!-- The tooltip is the positioned anchor: its :host is relative, so the rule
               class belongs on it, never on the button inside. -->
            <ore-tooltip class="mb__rule mb__rule--band" :content="t('board.ruleLabel', { name: toughness.name })"
              :delay="400">
              <ore-button icon-only size="sm" variant="ghost" :label="t('board.ruleLabel', { name: toughness.name })"
                @click="emit('rule', statusBoardRule(toughness))">
                <ore-icon aria-hidden="true" name="info" />
              </ore-button>
            </ore-tooltip>
          </div>
          <div class="mb__mod" :class="{ 'mb__mod--on': state.bonus > 0 || isDoubled }">
            <ore-counter class="mb__mod-counter" size="sm" :hint="bonusHint" :label="bonus.name" :readonly="locked"
              :value="state.bonus" @change="onCounter(bonus, $event)">
              <img alt="" slot="icon" v-if="bonus.art" :src="asset(bonus.art)" />
            </ore-counter>
            <ore-chip class="mb__mod-action mb__double" mode="selectable" size="md" variant="bordered"
              :checked="isDoubled" :color="isDoubled ? 'warning' : undefined" :disabled="locked" :value="double.id"
              @change="onToken(double, $event)">
              <span class="mb__double-body">
                <span aria-hidden="true" class="mb__glyph"
                  :style="{ '--glyph': `url(${asset('/icons/icon_monster_damage.svg')})` }" />
                {{ double.name }}
              </span>
            </ore-chip>
            <ore-tooltip class="mb__rule mb__rule--band" :content="t('monsterBoard.damageBonusRule')" :delay="400">
              <ore-button icon-only size="sm" variant="ghost" :label="t('monsterBoard.damageBonusRule')"
                @click="emit('rule', bonusRule)">
                <ore-icon aria-hidden="true" name="info" />
              </ore-button>
            </ore-tooltip>
          </div>
        </div>
      </section>

      <section class="mb__group mb__area-state" :aria-label="t('monsterBoard.tracks')">
        <ore-progress class="mb__track" color="error" size="lg" :label="`${state.struggle} / ${threshold}`"
          :max="threshold" :segments="threshold" :value="struggleValue"
          :value-text="t('monsterBoard.struggleOf', { max: threshold, value: state.struggle })" />
        <ore-alert class="mb__unleash" color="error" size="sm" variant="solid" v-if="unleashed">
          <ore-icon aria-hidden="true" name="flame" slot="icon" />
          <span class="mb__unleash-text">{{ t('monsterBoard.unleashAlert') }}</span>
          <ore-button class="mb__unleash-action" fullwidth size="sm" slot="actions" variant="bordered" v-if="!locked"
            @click="emit('unleash')">
            {{ t('monsterBoard.unleashAction', { count: partySize }) }}
          </ore-button>
        </ore-alert>
        <div class="mb__struggle-row">
          <div class="mb__tile">
            <ore-counter class="mb__tally" :class="{ 'mb__tally--on': state.struggle > 0 }" :hint="struggle.hint"
              :label="struggle.name" :readonly="locked" :value="state.struggle" @change="onCounter(struggle, $event)">
              <img alt="" slot="icon" v-if="struggle.art" :src="asset(struggle.art)" />
              <span slot="hint">
                {{ t('monsterBoard.unleashHint') }}
                <span class="mb__glyph mb__glyph--inline" role="img" :aria-label="t('board.perPlayer')"
                  :style="perPlayerGlyph" />
              </span>
            </ore-counter>
            <ore-tooltip class="mb__rule" :content="t('board.ruleLabel', { name: struggle.name })" :delay="400">
              <ore-button icon-only size="sm" variant="ghost" :label="t('board.ruleLabel', { name: struggle.name })"
                @click="emit('rule', statusBoardRule(struggle))">
                <ore-icon aria-hidden="true" name="info" />
              </ore-button>
            </ore-tooltip>
          </div>
          <div class="mb__tile">
            <ore-counter class="mb__tally" :class="{ 'mb__tally--on': state.acceleration > 0 }"
              :hint="t('monsterBoard.upkeepGain', { gain: upkeepGain })" :label="acceleration.name" :readonly="locked"
              :value="state.acceleration" @change="onCounter(acceleration, $event)">
              <img alt="" slot="icon" v-if="acceleration.art" :src="asset(acceleration.art)" />
            </ore-counter>
            <ore-tooltip class="mb__rule" :content="t('board.ruleLabel', { name: acceleration.name })" :delay="400">
              <ore-button icon-only size="sm" variant="ghost" :label="t('board.ruleLabel', { name: acceleration.name })"
                @click="emit('rule', statusBoardRule(acceleration))">
                <ore-icon aria-hidden="true" name="info" />
              </ore-button>
            </ore-tooltip>
          </div>
        </div>
        <ore-text class="mb__note mb__note--unstoppable" color="warning" size="xs" v-if="isUnstoppable">
          <ore-icon aria-hidden="true" name="zap" />
          {{ unstoppable.name }}: {{ unstoppable.hint }}
        </ore-text>
      </section>
    </div>

    <section class="mb__group mb__area-tokens" :aria-labelledby="`${uid}-tokens`">
      <ore-text as="h3" class="mb__heading" size="sm" variant="heading" :id="`${uid}-tokens`">
        {{ t('board.tokens') }}
      </ore-text>
      <ul class="mb__tokens list-plain">
        <li class="mb__tile mb__tile--chip" v-for="status in tokens" :key="status.id">
          <ore-chip class="mb__token-chip" color="primary" layout="stacked" mode="selectable" size="lg"
            :checked="tokenValue(status) > 0" :disabled="locked" :value="status.id"
            :variant="tokenValue(status) > 0 ? 'solid' : 'bordered'" @change="onToken(status, $event)">
            <img alt="" slot="icon" v-if="status.art" :src="asset(status.art)" />
            <ore-icon aria-hidden="true" slot="icon" v-else :name="status.icon" />
            {{ status.name }}
          </ore-chip>
          <ore-tooltip class="mb__rule" :content="t('board.ruleLabel', { name: status.name })" :delay="400">
            <ore-button icon-only size="sm" variant="ghost" :label="t('board.ruleLabel', { name: status.name })"
              @click="emit('rule', statusBoardRule(status))">
              <ore-icon aria-hidden="true" name="info" />
            </ore-button>
          </ore-tooltip>
        </li>
      </ul>
    </section>

    <section class="mb__group mb__area-terrain" :aria-labelledby="`${uid}-terrain`">
      <ore-text as="h3" class="mb__heading" size="sm" variant="heading" :id="`${uid}-terrain`">
        {{ t('board.terrain') }}
      </ore-text>
      <span aria-live="polite" class="visually-hidden" role="status">{{ terrainAnnouncement }}</span>
      <!-- The terrain rows are a swipe list: drag a row right to reveal its transform, left to
           remove the token. Keyboard users reach the same actions by tabbing into them. -->
      <ore-list class="mb__terrain" variant="separated" v-if="terrainGroups.length > 0">
        <ore-list-item v-for="group in terrainGroups" :key="group.key"
          :class="{ 'mb__terrain-flashed': flashed(group) }"
          :style="flash && flashed(group) ? { animationName: `mb-terrain-flash-${flash.pulse % 2}` } : undefined">
          <img alt="" slot="leading" v-if="group.terrain.icon" :src="asset(group.terrain.icon)" />
          <span aria-hidden="true" class="mb__terrain-fallback" slot="leading" v-else>
            <ore-icon name="mountain" />
          </span>
          {{ group.terrain.name }}
          <ore-chip class="mb__terrain-where" size="sm" variant="bordered">
            {{ groupPlacement(group) }}
          </ore-chip>
          <span slot="description">
            <strong v-if="group.terrain.rule.timing">{{ group.terrain.rule.timing }} ·</strong>
            {{ group.terrain.rule.effect }}
          </span>
          <ore-button fullheight slot="actions-left" variant="solid" v-if="group.transformsTo" :disabled="locked"
            :label="t('monsterBoard.terrainTokenAria', { name: group.terrain.name, target: group.transformsTo.name })"
            @click="emit('transformTerrain', group.tokenId)">
            → {{ group.transformsTo.name }}
          </ore-button>
          <ore-button color="error" fullheight icon-only slot="actions-right" variant="solid" :disabled="locked"
            :label="t('monsterBoard.terrainRemove', { name: group.terrain.name })"
            @click="emit('removeTerrain', group.tokenId)">
            <ore-icon aria-hidden="true" name="x" />
          </ore-button>
          <!-- The rule affordance sits in the row's top corner, like every other tile: the
               tooltip is the anchor, so its containing block is the list item. -->
          <ore-tooltip class="mb__rule" :content="t('board.ruleLabel', { name: group.terrain.name })" :delay="400">
            <ore-button icon-only size="sm" variant="ghost" :label="t('board.ruleLabel', { name: group.terrain.name })"
              @click="emit('rule', terrainBoardRule(group.terrain))">
              <ore-icon aria-hidden="true" name="info" />
            </ore-button>
          </ore-tooltip>
        </ore-list-item>
      </ore-list>
      <ore-text class="mb__empty" color="muted" size="sm" v-else>
        {{ t('monsterBoard.openGround') }}
      </ore-text>

      <!-- The fight calls for a terrain: place the chip where it lands. -->
      <div class="mb__terrain-add" v-if="!locked">
        <div class="mb__terrain-add-form" v-if="addingTerrain">
          <ore-select size="sm" ref="terrainPicker" :label="t('monsterBoard.terrainAddTerrain')" :value="draftTerrainId"
            @change="draftTerrainId = selectValue($event)">
            <option v-for="entry in catalogTerrains" :key="entry.id" :value="entry.id">{{ entry.name }}</option>
          </ore-select>
          <ore-select size="sm" :label="t('monsterBoard.terrainAddSector')" :value="draftSector"
            @change="draftSector = selectValue($event)">
            <option v-for="option in sectorOptions" :key="option.id" :value="option.id">
              {{ option.label }}
            </option>
          </ore-select>
          <ore-button color="primary" size="sm" variant="solid" @click="confirmPlace">
            {{ t('monsterBoard.terrainPlace') }}
          </ore-button>
          <ore-button size="sm" variant="ghost" @click="closeAdd">{{ t('common.cancel') }}</ore-button>
        </div>
        <ore-button size="sm" variant="bordered" v-else ref="addToggle" @click="openAdd">
          {{ t('monsterBoard.terrainAdd') }}
        </ore-button>
      </div>
    </section>

    <RuleSearch class="mb__area-search" />

    <BoardFooter class="mb__foot" :idle="idle" :lock-reason="lockReason" :locked="locked" @clear="emit('clear')" />
  </article>
</template>

<style scoped>
.mb {
  --mb-tile-bg: var(--p-panel-sunken);
  --mb-tile-line: var(--p-line);

  display: flex;
  flex-direction: column;
  gap: var(--size-6);
  min-width: 0;
}

/* Identity ------------------------------------------------------------- */

.mb__identity {
  display: flex;
  gap: var(--size-3);
  align-items: center;
}

.mb__art {
  flex-shrink: 0;
  width: var(--size-14);
  height: var(--size-14);
  padding: var(--size-1);
  object-fit: contain;
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-md);
  box-shadow: var(--p-shadow);
}

.mb__who {
  flex: 1;
  min-width: 0;
}

.mb__name {
  font-family: var(--p-display);
  font-size: clamp(var(--text-lg), 6.5vw, var(--text-2xl));
  line-height: var(--leading-tight);
}

.mb__meta {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  white-space: nowrap;
}

.mb__habitat {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mb__aggression {
  flex-shrink: 0;
  margin-top: 0;
}

/* Damage band ---------------------------------------------------------- */

.mb__band {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--size-3);
  padding: var(--size-4);
  container: band / inline-size;
  overflow: hidden;
  color: var(--p-on-dark);
  background:
    radial-gradient(120% 140% at 0% 0%, color-mix(in oklch, var(--p-moss) 60%, transparent), transparent 60%),
    var(--p-cinematic-ink);
  border-radius: var(--rounded-xl);
  box-shadow: var(--shadow-md);
  isolation: isolate;
  transition: background var(--p-motion) var(--p-ease);
}

/* Trophy silhouettes are ink on transparent; invert so they read as a pale watermark on the dark band. */
.mb__band-art {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-end: calc(-1 * var(--size-6));
  z-index: -1;
  width: var(--size-40);
  height: var(--size-40);
  pointer-events: none;
  opacity: 0.16;
  filter: invert(1);
  translate: 0 -50%;
}

.mb__damage {
  --counter-bg: transparent;
  --counter-border-color: transparent;
  --counter-icon-size: var(--size-9);
  --counter-value-size: clamp(2.75rem, 12cqi, 4rem);
  --counter-button-size: var(--size-12);
  --counter-gap: var(--size-2);
  --counter-radius: var(--rounded-full);

  display: flex;
  width: 100%;
}

.mb__damage::part(counter) {
  padding: 0;
}

.mb__damage::part(label),
.mb__damage::part(hint) {
  color: var(--p-on-dark);
}

.mb__damage::part(label) {
  font-family: var(--p-heading);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.mb__damage::part(hint) {
  opacity: 0.72;
}

.mb__damage::part(value) {
  font-family: var(--p-display);
  color: var(--p-on-dark);
}

.mb__damage::part(decrement-btn),
.mb__damage::part(increment-btn),
.mb__damage::part(decrement-large-btn),
.mb__damage::part(increment-large-btn) {
  color: var(--p-on-dark);
  background: color-mix(in oklch, var(--p-on-dark) 14%, transparent);
  border: var(--border) solid color-mix(in oklch, var(--p-on-dark) 28%, transparent);
}

.mb__damage::part(decrement-large-btn),
.mb__damage::part(increment-large-btn) {
  background: transparent;
}

.mb__damage::part(increment-btn) {
  background: color-mix(in oklch, var(--p-blood) 70%, var(--p-cinematic-ink));
  border-color: color-mix(in oklch, var(--p-blood) 90%, var(--p-on-dark));
}

/* Damage modifiers: toughness (and the wound it buys) beside the bonus tokens and the ×2 icon. */
.mb__mods {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-2);
}

.mb__stance-select {
  --select-min-width: 0;
  flex: none;
  width: var(--size-24);
}

.mb__stance-select::part(trigger) {
  --input-bg: transparent;
  --input-color: var(--p-on-dark);
  --input-border-color: color-mix(in oklch, var(--p-on-dark) 24%, transparent);
  --color-contrast-500: color-mix(in oklch, var(--p-on-dark) 72%, transparent);
}

.mb__mod {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--size-2);
  align-items: start;
  min-width: 0;
  padding: var(--size-2) var(--size-3);
  background: color-mix(in oklch, var(--p-on-dark) 8%, transparent);
  border: var(--border) solid color-mix(in oklch, var(--p-on-dark) 16%, transparent);
  border-radius: var(--rounded-lg);
  transition: border-color var(--p-motion) var(--p-ease);
}

.mb__mod--ready {
  border-color: color-mix(in oklch, var(--p-blood) 70%, var(--p-on-dark));
}

.mb__mod--on {
  border-color: color-mix(in oklch, var(--p-gold) 60%, transparent);
}

.mb__mod-counter {
  --counter-bg: transparent;
  --counter-border-color: transparent;
  --counter-button-size: var(--size-8);
  --counter-gap: var(--size-1);
  --counter-icon-size: var(--size-7);
  --counter-value-size: var(--text-xl);

  align-self: stretch;
  min-width: 0;
}

.mb__mod-counter::part(counter) {
  padding: 0;
}

/* Keep the label clear of the corner info button. */
.mb__mod-counter::part(header) {
  padding-inline-end: var(--size-8);
}

.mb__mod-counter::part(label),
.mb__mod-counter::part(hint),
.mb__mod-counter::part(value) {
  color: var(--p-on-dark);
}

.mb__mod-counter::part(hint),
.mb__mod-hint {
  color: var(--p-on-dark);
  opacity: 0.72;
}

.mb__mod--on .mb__mod-counter::part(value) {
  color: var(--p-gold);
}

.mb__mod-counter::part(decrement-btn),
.mb__mod-counter::part(increment-btn) {
  color: var(--p-on-dark);
  background: color-mix(in oklch, var(--p-on-dark) 14%, transparent);
  border: var(--border) solid color-mix(in oklch, var(--p-on-dark) 28%, transparent);
}

/* The action anchors to the bottom so both cards line up whatever their hint length.
   Button (size sm) and chip share one height so the two cards end on the same edge;
   the coarse-pointer value mirrors the button's own touch-target promotion. */
.mb__mod-action {
  --mb-action-height: var(--size-8);
  --button-color: var(--p-on-dark);
  --button-border-color: color-mix(in oklch, var(--p-on-dark) 28%, transparent);

  width: 100%;
  margin-block-start: auto;
  white-space: nowrap;
}

@media (pointer: coarse) {
  .mb__mod-action {
    --mb-action-height: var(--size-11);
  }
}

.mb__double {
  --chip-color: var(--p-on-dark);
  --chip-border-color: color-mix(in oklch, var(--p-on-dark) 28%, transparent);
  --chip-font-size: var(--text-sm);
  --chip-font-weight: var(--font-medium);
  --chip-padding-x: var(--size-3);
  --chip-padding-y: 0;
  --chip-radius: var(--rounded-lg);

  display: flex;
}

/* The chip's label fills the row, so glyph and text travel together in the default slot
   and centre as one unit: the same glyph-gap-text group the Wound button renders. */
.mb__double::part(chip) {
  width: 100%;
  height: var(--mb-action-height);
  line-height: var(--leading-tight);
  text-align: center;
}

.mb__double-body {
  display: inline-flex;
  gap: var(--size-1-5);
  align-items: center;
  vertical-align: middle;
}

/* Game glyphs masked in currentColor so they follow the button or chip state in either theme. */
.mb__glyph {
  display: inline-block;
  flex-shrink: 0;
  width: var(--size-4);
  height: var(--size-4);
  background: currentcolor;
  mask: var(--glyph) center / contain no-repeat;
}

/* Sits in running text as the rulebook prints it: `2 × 3 [per player]`. */
.mb__glyph--inline {
  width: 0.8em;
  height: 1.1em;
  vertical-align: -0.2em;
}

/* Groups --------------------------------------------------------------- */

.mb__group {
  display: flex;
  flex-direction: column;
  gap: var(--size-3);
  min-width: 0;
}

.mb__heading {
  font-family: var(--p-heading);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--p-text-muted);
  text-transform: uppercase;
  letter-spacing: var(--p-tracking);
}

.mb__track {
  --progress-height: var(--size-3);
  --progress-track-bg: var(--mb-tile-bg);
  --progress-segment-gap: var(--size-1);
  --progress-label-color: var(--p-text-muted);
}

.mb__struggle-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--size-3);
  align-items: stretch;
}

.mb__note {
  display: flex;
  gap: var(--size-1);
  align-items: center;
  line-height: var(--leading-snug);
}

.mb__note--unstoppable {
  font-weight: var(--font-medium);
}

.mb__unleash {
  width: 100%;
}

.mb__unleash-text {
  font-weight: var(--font-semibold);
}

/* A neutral bordered button reads grey-on-red inside the solid alert; borrow the alert's own
   contrast colour instead so the action stays legible on the error surface in either theme. */
.mb__unleash-action {
  --button-color: currentcolor;
  --button-bg: color-mix(in oklch, currentcolor 14%, transparent);
  --button-border-color: color-mix(in oklch, currentcolor 45%, transparent);
}

.mb__tokens {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: var(--size-3);
}

.mb__tile {
  position: relative;
  display: flex;
  min-width: 0;
  container: tile / inline-size;
}

.mb__tally {
  --counter-bg: var(--mb-tile-bg);
  --counter-border-color: var(--mb-tile-line);
  --counter-icon-size: var(--size-8);

  flex: 1;
}

.mb__tally--on {
  --counter-border-color: var(--p-gold);
}

.mb__tally--on::part(value) {
  color: var(--p-gold);
}

.mb__token-chip {
  --chip-icon-size: var(--size-9);
  --chip-radius: var(--rounded-lg);
  --chip-padding-y: var(--size-3);
  --chip-padding-x: var(--size-2);
  --chip-font-size: var(--text-xs);

  flex: 1;
  min-height: var(--size-24);
}

.mb__token-chip::part(chip-btn),
.mb__token-chip::part(chip) {
  width: 100%;
  height: 100%;
}

/* Info affordance sits in the tile's top corner, over the counter's header row. */
.mb__rule {
  position: absolute;
  inset-block-start: var(--size-1);
  inset-inline-end: var(--size-1);
  z-index: 1;
  color: var(--p-text-muted);
}

/* Centred on the card's label row from its own midpoint, so the glyph stays put when the
   button's touch target grows on coarse pointers (the compact card has no counter padding
   to absorb that, unlike the tiles). */
.mb__rule--band {
  inset-block-start: calc(var(--size-2) + var(--size-2-5));
  inset-inline-end: var(--size-5);
  color: var(--p-on-dark);
  opacity: 0.72;
  translate: 50% -50%;
}

/* Keep the tile label clear of the corner info button. */
.mb__tile:has(.mb__rule) .mb__tally::part(header) {
  padding-inline-end: var(--size-7);
}

.mb__tile--chip .mb__rule {
  inset-block-start: 0;
  inset-inline-end: 0;
}

/* Terrain reference ---------------------------------------------------- */

/* The terrain rows are a swipe list: drag a row right to reveal its transform, left to
   remove the token. Keyboard users reach the same actions by tabbing into them. */
.mb__terrain {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--size-2-5);
}

.mb__terrain ore-list-item {
  --list-item-bg: var(--mb-tile-bg);
  --list-item-actions-width: 6rem;
}

/* The token is the row's identity: as big as the chip on the table. */
.mb__terrain img[slot='leading'] {
  width: var(--size-12);
  height: var(--size-12);
  object-fit: contain;
}

.mb__terrain-fallback {
  display: grid;
  place-items: center;
  width: var(--size-12);
  height: var(--size-12);
  color: var(--p-text-muted);
  background: var(--p-panel);
  border-radius: var(--rounded-md);
}

.mb__terrain ore-list-item::part(title) {
  font-family: var(--p-heading);
  font-size: var(--text-sm);
}

/* The rule text wraps; the list truncates its description line by default. */
.mb__terrain ore-list-item::part(description) {
  overflow: visible;
  text-overflow: clip;
  line-height: var(--leading-snug);
  white-space: normal;
}

/* The corner rule button hangs into the row's padding band; keep the name clear of it. */
.mb__terrain ore-list-item::part(row) {
  padding-inline-end: var(--size-10);
}

/* Above the swipe row, which carries its own stacking inside the item. */
.mb__terrain ore-list-item .mb__rule {
  z-index: 2;
}

/* The placement is the row's spatial anchor: a chip right after the name, not fine print. */
.mb__terrain-where {
  --chip-font-size: var(--text-xs);
  --chip-font-weight: var(--font-medium);
  --chip-padding-x: var(--size-2);
  --chip-padding-y: 0;
  --chip-radius: var(--rounded-full);

  margin-inline-start: var(--size-1-5);
}

/* A chip landed or melted here: a brief gold ring around the row. The two keyframe names
   alternate per pulse, so the same row can flash twice in a row. */
.mb__terrain-flashed {
  animation-duration: 1.1s;
  animation-timing-function: var(--p-ease);
  animation-fill-mode: both;
}

@keyframes mb-terrain-flash-0 {
  from {
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--p-gold) 60%, transparent);
  }

  to {
    box-shadow: 0 0 0 3px transparent;
  }
}

@keyframes mb-terrain-flash-1 {
  from {
    box-shadow: 0 0 0 3px color-mix(in oklch, var(--p-gold) 60%, transparent);
  }

  to {
    box-shadow: 0 0 0 3px transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mb__terrain-flashed {
    animation: none;
  }
}

.mb__terrain-add {
  display: flex;
  justify-content: center;
  padding: var(--size-2);
}

.mb__terrain-add-form {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-2);
  align-items: flex-end;
  justify-content: center;
}

.mb__terrain-add-form ore-select {
  --select-min-width: 10rem;
}

.mb__empty {
  padding: var(--size-3);
  border: var(--border) dashed var(--mb-tile-line);
  border-radius: var(--rounded-lg);
}

.mb__overview {
  display: contents;
}

/* Footer --------------------------------------------------------------- */

/* Narrow band: the modifier cards stack. */
@container band (width < 300px) {
  .mb__mods {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Unleashed: the band burns until struggle is reset. */
.mb--unleashed .mb__band {
  background:
    radial-gradient(120% 140% at 0% 0%, color-mix(in oklch, var(--p-blood) 70%, transparent), transparent 60%),
    var(--p-cinematic-ink);
}

/* Narrow tiles: tighter tallies. */
@container tile (width < 200px) {
  .mb__tally {
    --counter-button-size: var(--size-10);
    --counter-gap: var(--size-2);
    --counter-value-size: var(--text-xl);
  }

  /* Narrow tiles: the label keeps one line and truncates with an ellipsis. */
  .mb__tally::part(label) {
    font-size: var(--text-xs);
    line-height: var(--leading-tight);
  }
}

/* Three-up tiles on a tablet: compact controls, no token art, and a wrapping label. */
@container tile (width < 150px) {
  .mb__tally {
    --counter-button-size: var(--size-8);
    --counter-gap: var(--size-1);
    --counter-value-size: var(--text-lg);
  }

  .mb__tally::part(counter) {
    padding: var(--size-2);
  }

  .mb__tally>img[slot='icon'] {
    display: none;
  }
}

/* Vertical tablet: keep the band wide and full-width, then let the state and tokens breathe. */
@media (width >=680px) and (width < 1100px) and (orientation: portrait) {
  .mb {
    display: grid;
    grid-template-areas:
      'identity identity'
      'overview overview'
      'tokens tokens'
      'terrain search'
      'foot foot';
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    row-gap: var(--size-5);
    column-gap: var(--size-5);
    align-items: start;
  }

  .mb__overview {
    display: grid;
    grid-area: overview;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: var(--size-5);
    align-items: start;
  }

  .mb__identity {
    grid-area: identity;
  }

  .mb__area-band {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-row: 1;
    grid-column: 1;
    gap: var(--size-4);
    align-items: start;
  }

  .mb__damage {
    --counter-value-size: 3.25rem;
  }

  .mb__area-state {
    grid-row: 1;
    grid-column: 2;
  }

  .mb__area-tokens {
    grid-area: tokens;
  }

  .mb__area-terrain {
    grid-area: terrain;
  }

  .mb__area-search {
    grid-area: search;
  }

  .mb__terrain {
    grid-template-columns: minmax(0, 1fr);
  }

  .mb__tokens {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .mb__foot {
    grid-area: foot;
  }
}

/* Desktop and horizontal tablet: left column = identity + terrain, middle = controls, right = references. */
@media (width >=1100px),
(width >=768px) and (orientation: landscape) {
  .mb {
    display: grid;
    grid-template-areas:
      'identity identity identity'
      'terrain band search'
      'terrain state search'
      'terrain tokens search'
      'foot foot foot';
    grid-template-rows: auto auto auto auto auto;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: var(--size-5);
    column-gap: var(--size-5);
    align-items: start;
  }

  .mb__identity {
    grid-area: identity;
  }

  .mb__area-band {
    grid-area: band;
  }

  .mb__area-state {
    grid-area: state;
  }

  .mb__area-tokens {
    grid-area: tokens;
    align-self: start;
  }

  .mb__area-terrain {
    grid-area: terrain;
  }

  .mb__area-search {
    --rs-list-max: none;
    --rs-list-contain: size;
    grid-area: search;
    align-self: stretch;
    min-block-size: 0;
  }

  .mb__foot {
    grid-area: foot;
  }

  .mb__terrain {
    grid-template-columns: minmax(0, 1fr);
  }

  .mb__tokens {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* Tablet landscape: terrain left, portrait-style controls right, with lookup below both. */
@media (width >=768px) and (width < 1100px) and (orientation: landscape) {
  .mb {
    grid-template-areas:
      'identity identity'
      'terrain overview'
      'terrain tokens'
      'search search'
      'foot foot';
    grid-template-rows: auto auto auto minmax(var(--size-80), auto) auto;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  }

  .mb__overview {
    display: grid;
    grid-area: overview;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: var(--size-5);
    align-items: start;
  }

  .mb__area-band {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-row: 1;
    grid-column: 1;
    gap: var(--size-4);
    align-items: start;
  }

  .mb__damage {
    --counter-value-size: 3.25rem;
  }

  .mb__area-state {
    grid-row: 1;
    grid-column: 2;
  }

  .mb__area-tokens {
    grid-area: tokens;
  }

  .mb__area-terrain {
    grid-area: terrain;
  }

  .mb__area-search {
    --rs-list-max: none;
    --rs-list-contain: size;
    grid-area: search;
    align-self: stretch;
    min-block-size: 0;
  }

  .mb__terrain {
    grid-template-columns: minmax(0, 1fr);
  }

  .mb__tokens {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .mb__foot {
    grid-area: foot;
  }
}
</style>
