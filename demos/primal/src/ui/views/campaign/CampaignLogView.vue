<script lang="ts" setup>
import { computed, ref } from 'vue';
import { asset } from '../../../app/assets';
import { t } from '../../../app/i18n';
import { campaigns, runCommand } from '../../../app/store';
import { useReadable, useRouteParams } from '../../../app/vue-bridge';
import {
  chapters,
  enabledContent,
  expansions,
  finalBattle,
  monsterById,
  questById,
  resources,
  TOTAL_CHAPTERS,
} from '../../../content/index';
import { narrativeAvailable, selectNarrative } from '../../../content/lore';
import { questsByStatus } from '../../../domain/campaign';
import { campaignStatistics, nightmareHunterTrialRank } from '../../../domain/scoring';
import LinkButton from '../../components/LinkButton.vue';
import LoreEntry from '../../components/LoreEntry.vue';
import PageHeader from '../../components/PageHeader.vue';
import PhaseBackButton from '../../components/PhaseBackButton.vue';
import PhaseDock from '../../components/PhaseDock.vue';
import ResourceIcon from '../../components/ResourceIcon.vue';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/box';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/grid';
import '@vielzeug/refine/list';
import '@vielzeug/refine/list-item';
import '@vielzeug/refine/stats';
import '@vielzeug/refine/text';
import '@vielzeug/refine/textarea';

const params = useRouteParams();
const all = useReadable(campaigns);
const campaign = computed(() => all.value.find((entry) => entry.id === params.value.id));
const stats = computed(() => (campaign.value ? campaignStatistics(campaign.value) : undefined));
const available = computed(() => (campaign.value ? questsByStatus(campaign.value, 'available') : []));
const completed = computed(() => (campaign.value ? questsByStatus(campaign.value, 'completed') : []));
const expired = computed(() => (campaign.value ? questsByStatus(campaign.value, 'expired') : []));
const activeQuest = computed(() =>
  campaign.value?.activeQuestId ? questById(campaign.value.activeQuestId) : undefined,
);
const activeMonster = computed(() => (activeQuest.value ? monsterById(activeQuest.value.monsterId) : undefined));
const enabledExpansions = computed(() =>
  expansions.filter((expansion) => campaign.value?.expansionIds.includes(expansion.id)),
);
const variantLabels = computed<Record<string, string>>(() => ({
  'hunters-trial': t('campaignLog.variantHuntersTrial'),
}));
const orderedNotes = computed(() =>
  [...(campaign.value?.notes ?? [])].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
);
/**
 * The campaign journal, derived rather than stored: every chapter reached so far, each followed
 * by the quests completed in it: their introductions, conclusions and Blood Visions as lore entries.
 */
const journalEntries = computed(() => {
  const current = campaign.value;
  if (!current) return [];
  const entries: { excerpt?: string; key: string; lore: string; overline: string }[] = [];
  for (const chapter of chapters) {
    if (chapter.number > current.chapter) break;
    entries.push({
      excerpt: chapter.summary,
      key: `chapter-${chapter.number}`,
      lore: chapter.paragraphs.join(' '),
      overline: t('campaignLog.chapterNumber', { number: chapter.number }),
    });
    for (const state of current.quests) {
      if (state.chapter !== chapter.number || (state.status !== 'completed' && state.status !== 'expired')) continue;
      const quest = questById(state.questId);
      if (!quest) continue;
      if (state.status === 'expired') {
        if (quest.expiration.text) {
          entries.push({
            key: `expiration-${quest.id}`,
            lore: quest.expiration.text,
            overline: t('campaignLog.questExpiredNarrative', { number: quest.number }),
          });
        }
        continue;
      }
      const introduction = selectNarrative(quest.lore.introductions, state.chapter, current.achievements, quest.introduction);
      entries.push({
        excerpt: introduction.excerpt,
        key: `introduction-${quest.id}`,
        lore: introduction.lore,
        overline: t('campaignLog.questIntroduction', { number: quest.number }),
      });
      const conclusion = selectNarrative(quest.lore.conclusions, state.chapter, current.achievements, quest.conclusion);
      entries.push({
        excerpt: conclusion.excerpt,
        key: `conclusion-${quest.id}`,
        lore: conclusion.lore,
        overline: t('campaignLog.questConclusion', { number: quest.number }),
      });
      for (const vision of quest.lore.visions) {
        entries.push({
          excerpt: vision.summary,
          key: `vision-${quest.id}-${vision.id}`,
          lore: vision.paragraphs.join(' '),
          overline: vision.title === 'Blood Vision' ? t('dashboard.bloodVision') : vision.title,
        });
      }
    }
  }
  if (current.chapter === TOTAL_CHAPTERS) {
    if (current.expansionIds.includes('feather') && current.achievements.includes('The Lantern Bearer')) {
      entries.push({
        excerpt: finalBattle.lanternBearer.summary,
        key: 'lantern-bearer',
        lore: finalBattle.lanternBearer.paragraphs.join(' '),
        overline: t('dashboard.lanternBearer'),
      });
    }
    entries.push({
      excerpt: finalBattle.lore.introduction.summary,
      key: 'final-battle-introduction',
      lore: finalBattle.lore.introduction.paragraphs.join(' '),
      overline: t('dashboard.finalBattleEyebrow'),
    });
    if (current.finalBattleWon) {
      const conclusions = finalBattle.lore.conclusions.filter((passage) =>
        narrativeAvailable(passage.condition, current.chapter, current.achievements),
      );
      entries.push({
        excerpt: conclusions.find((passage) => passage.condition)?.summary ?? conclusions[0]?.summary,
        key: 'final-battle-conclusion',
        lore: conclusions.flatMap((passage) => passage.paragraphs).join(' '),
        overline: t('dashboard.finalBattleConclusion'),
      });
      entries.push({
        excerpt: finalBattle.lore.vision.summary,
        key: 'final-battle-vision',
        lore: finalBattle.lore.vision.paragraphs.join(' '),
        overline: t('dashboard.bloodVision'),
      });
      const ending = current.achievements.includes('The Voice of Woltyar')
        ? finalBattle.endings.rebirth
        : finalBattle.endings.dawn;
      entries.push({
        excerpt: ending.summary,
        key: `final-ending-${ending.title}`,
        lore: ending.paragraphs.join(' '),
        overline: t('dashboard.campaignEnding'),
      });
    }
  }
  return entries;
});
const noteDate = (stamp: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(stamp));
const unlockedElements = computed(() =>
  campaign.value
    ? enabledContent(resources, campaign.value.expansionIds).filter(
        (resource) =>
          resource.category === 'element' && campaign.value?.forge.unlockedElementIds.includes(resource.id as never),
      )
    : [],
);
const statItems = computed(() => {
  if (!stats.value) return [];
  return [
    [t('campaignLog.statChaptersCompleted'), stats.value.chaptersCompleted],
    [t('campaignLog.statQuestsCompleted'), stats.value.questsCompleted],
    [t('campaignLog.statQuestsExpired'), stats.value.questsExpired],
    [t('campaignLog.statAchievements'), stats.value.achievements],
  ];
});
const usesHuntersTrial = computed(() => campaign.value?.variants.includes('hunters-trial') ?? false);
const usesNightmare = computed(() => campaign.value?.nightmareVariant ?? false);
const hunterRank = computed(() => {
  const score = stats.value?.hunterScore;
  return usesNightmare.value && score !== null && score !== undefined ? nightmareHunterTrialRank(score) : null;
});
const noteDraft = ref('');
const noteComposerOpen = ref(false);

function saveNote(): void {
  const id = campaign.value?.id;
  if (!id || !noteDraft.value.trim()) return;
  // The command reports its own refusal; the draft clears only on success.
  if (runCommand('writeCampaignNote', { id, kind: 'campaign' }, 'chapter', noteDraft.value)) {
    noteDraft.value = '';
    noteComposerOpen.value = false;
  }
}
</script>

<template>
  <div class="frame campaign-log phase-flow" v-if="campaign && stats">
    <PageHeader
      art="/backgrounds/bg_campaign_log.webp"
      :eyebrow="t('campaignLog.eyebrow')"
      :subtitle="t('campaignLog.subtitle')"
      :title="campaign.name">
    </PageHeader>

    <div class="campaign-log__grid">
      <div class="campaign-log__column">
        <ore-card class="settlement-card">
          <div class="card-title" slot="header">
            <div>
              <ore-text variant="overline">{{ t('campaignLog.base') }}</ore-text>
              <ore-text as="h2" size="sm" variant="heading">Alborea</ore-text>
            </div>
          </div>
          <div class="stack" style="--stack-gap: var(--size-4)">
            <ore-grid cols="2" gap="sm">
              <ore-stats
                size="sm"
                variant="plain"
                :description="t('campaignLog.elementsAvailable', { count: unlockedElements.length })"
                :label="t('campaignLog.forgeLevel')"
                :value="String(campaign.forge.level)" />
              <ore-stats
                size="sm"
                variant="plain"
                :description="t('campaignLog.potionsThrough', { level: campaign.herbalist.level })"
                :label="t('campaignLog.herbalistLevel')"
                :value="String(campaign.herbalist.level)" />
            </ore-grid>
            <div class="stack" style="--stack-gap: var(--size-2)">
              <ore-text variant="overline">{{ t('campaignLog.unlockedForge') }}</ore-text>
              <div class="cluster" style="--cluster-gap: var(--size-1-5)">
                <ResourceIcon size="sm" v-for="element in unlockedElements" :key="element.id" :id="element.id" />
                <ore-text color="muted" size="sm" v-if="!unlockedElements.length">{{ t('campaignLog.noneYet') }}</ore-text>
              </div>
            </div>
          </div>
        </ore-card>

        <ore-card class="configuration-card">
          <div class="card-title" slot="header">
            <div>
              <ore-text variant="overline">{{ t('campaignLog.setupEyebrow') }}</ore-text>
              <ore-text as="h2" size="sm" variant="heading">{{ t('campaignLog.configurationTitle') }}</ore-text>
            </div>
          </div>
          <div class="stack" style="--stack-gap: var(--size-4)">
            <section class="configuration-group">
              <ore-text variant="overline">{{ t('campaignLog.gameBoxes') }}</ore-text>
              <div class="cluster" style="--cluster-gap: var(--size-2)">
                <ore-chip size="sm" variant="outline" v-for="expansion in enabledExpansions" :key="expansion.id">
                  {{ expansion.name }}
                </ore-chip>
              </div>
            </section>
            <section class="configuration-group">
              <ore-text variant="overline">{{ t('campaignLog.rules') }}</ore-text>
              <div class="cluster" style="--cluster-gap: var(--size-2)">
                <ore-chip size="sm" variant="outline" v-for="variant in campaign.variants" :key="variant">
                  {{ variantLabels[variant] ?? variant }}
                </ore-chip>
                <!-- The Nightmare variant rides its own chip: it is a live toggle, not a
                     creation stamp, so it never appears in the variant list. -->
                <ore-chip size="sm" variant="outline" v-if="campaign.nightmareVariant">
                  {{ t('campaignLog.variantNightmare') }}
                </ore-chip>
                <ore-text color="muted" size="sm" v-if="!campaign.variants.length && !campaign.nightmareVariant">
                  {{ t('campaignLog.standard') }}
                </ore-text>
              </div>
            </section>
          </div>
        </ore-card>

        <ore-card class="progress-card">
          <div class="card-title" slot="header">
            <div>
              <ore-text variant="overline">{{ t('campaignLog.recordEyebrow') }}</ore-text>
              <ore-text as="h2" size="sm" variant="heading">{{ t('campaignLog.recordTitle') }}</ore-text>
            </div>
            <span class="card-signal">{{ t('campaignLog.chapterProgress', { chapter: campaign.chapter, total: TOTAL_CHAPTERS }) }}</span>
          </div>
          <div class="stack" style="--stack-gap: var(--size-3-5)">
            <ore-grid cols="2" gap="sm">
              <ore-stats
                size="sm"
                variant="plain"
                v-for="[label, value] in statItems"
                :key="label"
                :label="String(label)"
                :value="String(value)" />
            </ore-grid>
            <section class="achievement-list" v-if="campaign.achievements.length">
              <ore-text variant="overline">{{ t('campaignLog.achievements') }}</ore-text>
              <ul class="list-plain">
                <li v-for="achievement in campaign.achievements" :key="achievement">{{ achievement }}</li>
              </ul>
            </section>
            <section class="trial-summary stack" style="--stack-gap: var(--size-3)" v-if="usesHuntersTrial">
              <div>
                <ore-text variant="overline">{{ t('campaignLog.trialDefeatTrack') }}</ore-text>
                <div
                  class="defeat-track"
                  role="img"
                  :aria-label="t('campaignLog.defeatTrackAria', { count: campaign.defeats })">
                  <span
                    v-for="space in 3"
                    :key="space"
                    :data-filled="space <= campaign.defeats ? '' : undefined"></span>
                </div>
              </div>
              <ore-grid cols="2" gap="sm">
                <ore-stats size="sm" variant="plain" :label="t('campaignLog.statTotalDefeats')" :value="String(stats.totalDefeats)" />
                <ore-stats size="sm" variant="plain" v-if="hunterRank" :label="t('campaignLog.nightmareRank')" :value="hunterRank" />
              </ore-grid>
              <ore-box
                class="hunter-score"
                padding="md"
                variant="flat"
                v-if="campaign.finalBattleWon && stats.hunterScore !== null">
                <ore-text variant="overline">{{ t('campaignLog.finalScore') }}</ore-text>
                <ore-text size="md" variant="heading">{{ stats.hunterScore }}</ore-text>
                <ore-chip color="error" size="sm" variant="flat" v-if="hunterRank">{{ hunterRank }}</ore-chip>
                <ore-text color="muted" size="sm">{{ t('campaignLog.scoreHint') }}</ore-text>
              </ore-box>
            </section>
          </div>
        </ore-card>
      </div>

      <div class="campaign-log__column">
        <ore-card class="quest-intel-card">
          <div class="card-title" slot="header">
            <div>
              <ore-text variant="overline">{{ t('campaignLog.missionIntel') }}</ore-text>
              <ore-text as="h2" size="sm" variant="heading">{{ t('phases.questBoard') }}</ore-text>
            </div>
            <span class="card-signal">{{ t('campaignLog.availableSignal', { count: available.length }) }}</span>
          </div>
          <div class="quest-intel">
            <section class="quest-intel__active" :class="{ 'quest-intel__active--empty': !activeQuest }">
              <div>
                <ore-text variant="overline">{{ t('campaignLog.activeMission') }}</ore-text>
                <ore-text as="h3" size="sm" variant="heading" v-if="activeQuest">
                  {{ t('campaignLog.questNumber', { number: activeQuest.number }) }}: {{ activeQuest.name }}
                </ore-text>
                <ore-text as="h3" size="sm" variant="heading" v-else>{{ t('campaignLog.noActiveQuest') }}</ore-text>
              </div>
              <img alt="" class="quest-intel__monster" v-if="activeMonster" :src="asset(activeMonster.trophyIcon)" />
            </section>
            <ore-accordion class="quest-intel__status" selection-mode="multiple" size="sm" variant="text">
              <ore-accordion-item :expanded="campaign.phase === 'quest-board'">
                <span slot="title">{{ t('campaignLog.availableQuests') }}</span>
                <ore-chip size="sm" slot="suffix" variant="flat">{{ available.length }}</ore-chip>
                <ul class="quest-status-list list-plain">
                  <li v-for="quest in available" :key="quest.id">
                    <strong>{{ t('campaignLog.questNumber', { number: quest.number }) }}</strong>
                    <span>{{ quest.name }} · {{ monsterById(quest.monsterId)?.name ?? quest.monsterId }}</span>
                  </li>
                  <li v-if="!available.length"><span>{{ t('campaignLog.none') }}</span></li>
                </ul>
              </ore-accordion-item>
              <ore-accordion-item>
                <span slot="title">{{ t('campaignLog.completedQuests') }}</span>
                <ore-chip size="sm" slot="suffix" variant="flat">{{ completed.length }}</ore-chip>
                <ul class="quest-status-list list-plain">
                  <li v-for="quest in completed" :key="quest.id">
                    <strong>{{ t('campaignLog.questNumber', { number: quest.number }) }}</strong>
                    <span>{{ quest.name }} · {{ monsterById(quest.monsterId)?.name ?? quest.monsterId }}</span>
                  </li>
                  <li v-if="!completed.length"><span>{{ t('campaignLog.none') }}</span></li>
                </ul>
              </ore-accordion-item>
              <ore-accordion-item>
                <span slot="title">{{ t('campaignLog.expiredQuests') }}</span>
                <ore-chip size="sm" slot="suffix" variant="flat">{{ expired.length }}</ore-chip>
                <ul class="quest-status-list list-plain">
                  <li v-for="quest in expired" :key="quest.id">
                    <strong>{{ t('campaignLog.questNumber', { number: quest.number }) }}</strong>
                    <span>{{ quest.name }} · {{ monsterById(quest.monsterId)?.name ?? quest.monsterId }}</span>
                  </li>
                  <li v-if="!expired.length"><span>{{ t('campaignLog.none') }}</span></li>
                </ul>
              </ore-accordion-item>
            </ore-accordion>
          </div>
        </ore-card>

        <ore-card class="trophies-card">
          <div class="card-title" slot="header">
            <div>
              <ore-text variant="overline">{{ t('campaignLog.spoils') }}</ore-text>
              <ore-text as="h2" size="sm" variant="heading">{{ t('campaignLog.trophiesTitle') }}</ore-text>
            </div>
            <span class="card-signal">{{ campaign.trophies.length }}</span>
          </div>
          <ul class="trophy-list list-plain" v-if="campaign.trophies.length" :aria-label="t('campaignLog.trophiesAria')" >
            <li v-for="id in campaign.trophies" :key="id">
              <img alt="" class="trophy" :src="asset(monsterById(id)?.trophyIcon ?? '')" />
              <span>{{ monsterById(id)?.name ?? id }}</span>
            </li>
          </ul>
          <ore-text color="muted" size="sm" v-else>{{ t('campaignLog.noTrophies') }}</ore-text>
        </ore-card>

        <ore-card class="field-notes-card">
          <div class="card-title" slot="header">
            <div>
              <ore-text variant="overline">{{ t('campaignLog.sharedMemory') }}</ore-text>
              <ore-text as="h2" size="sm" variant="heading">{{ t('campaignLog.fieldNotesTitle') }}</ore-text>
            </div>
            <div class="cluster" style="--cluster-gap: var(--size-2)">
              <span class="card-signal">{{ campaign.notes.length }}</span>
              <ore-button size="sm" variant="bordered" @click="noteComposerOpen = !noteComposerOpen">
                {{ noteComposerOpen ? t('campaignLog.closeEditor') : t('campaignLog.addNote') }}
              </ore-button>
            </div>
          </div>
          <div class="stack" style="--stack-gap: var(--size-4)">
            <ore-list size="sm" variant="plain">
              <ore-list-item v-for="note in orderedNotes" :key="note.id">
                <ore-chip size="sm" slot="leading" variant="outline">
                  {{ note.scope === 'chapter' ? t('campaignLog.chapterNumber', { number: note.targetId }) : note.scope }}
                </ore-chip>
                <ore-text size="sm">{{ note.text }}</ore-text>
                <ore-text color="muted" size="xs" slot="description">{{ noteDate(note.createdAt) }}</ore-text>
              </ore-list-item>
              <ore-list-item v-if="!orderedNotes.length">
                <ore-text color="muted" size="sm">{{ t('campaignLog.notesEmpty') }}</ore-text>
              </ore-list-item>
            </ore-list>
            <form class="stack" style="--stack-gap: var(--size-2)" v-if="noteComposerOpen" @submit.prevent="saveNote">
              <ore-textarea
                :helper="t('campaignLog.noteHelper')"
                :label="t('campaignLog.noteComposerLabel')"
                :maxlength="400"
                :placeholder="t('campaignLog.notePlaceholder')"
                :rows="3"
                :value="noteDraft"
                @input="noteDraft = ($event.target as HTMLTextAreaElement).value" />
              <ore-button color="primary" size="sm" type="submit" variant="bordered" :disabled="!noteDraft.trim()">
                {{ t('campaignLog.addNote') }}
              </ore-button>
            </form>
          </div>
        </ore-card>

        <ore-card class="journal-card">
          <div class="card-title" slot="header">
            <div>
              <ore-text variant="overline">{{ t('campaignLog.sharedMemory') }}</ore-text>
              <ore-text as="h2" size="sm" variant="heading">{{ t('campaignLog.journalTitle') }}</ore-text>
            </div>
            <span class="card-signal">{{ journalEntries.length }}</span>
          </div>
          <div class="journal-entries" v-if="journalEntries.length">
            <ore-card class="lore-band" padding="none" v-for="entry in journalEntries" :key="entry.key">
              <LoreEntry :excerpt="entry.excerpt" :lore="entry.lore" :overline="entry.overline" />
            </ore-card>
          </div>
          <ore-text color="muted" size="sm" v-else>{{ t('campaignLog.journalEmpty') }}</ore-text>
        </ore-card>
      </div>
    </div>

    <!-- The overview reads as the campaign's own step: the bar carries the way back to
         the phase the campaign stands in, the boards' own grammar. -->
    <PhaseDock>
      <template #back>
        <PhaseBackButton 
          to="campaignDashboard" :label="t('campaignLog.backToCampaign')" :params="{ id: campaign.id }"/>
      </template>
    </PhaseDock>
  </div>

  <div class="frame stack" style="text-align: center; padding-block: var(--size-16); justify-items: center" v-else>
    <ore-text variant="overline">{{ t('campaignLog.eyebrow') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading">{{ t('common.noSuchCampaign') }}</ore-text>
    <LinkButton to="campaigns" variant="bordered">{{ t('campaignLog.backToCampaigns') }}</LinkButton>
  </div>
</template>

<style scoped>
/* The page reads in one block-flow context, the phase dock's own contract: a sticky bar
   could never leave a grid track, so the sections stack as flow children with margins,
   the phase screens' grammar, and the dock travels the whole page as it pins. */
.campaign-log {
  --phase-gap: var(--size-4);
}

.campaign-log__grid {
  display: grid;
  grid-template-areas:
    'mission trophies'
    'record base'
    'configuration memory'
    'journal journal';
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-4);
  align-items: stretch;
}

.campaign-log__column {
  display: contents;
}

.progress-card {
  grid-area: record;
}

.quest-intel-card {
  grid-area: mission;
}

.trophies-card {
  grid-area: trophies;
}

.settlement-card {
  grid-area: base;
}

.configuration-card {
  grid-area: configuration;
}

.field-notes-card {
  grid-area: memory;
}

.journal-card {
  grid-area: journal;
}

.journal-entries {
  display: grid;
  gap: var(--size-3);
}

.quest-intel,
.achievement-list {
  display: grid;
  gap: var(--size-4);
}

.settlement-card ore-stats,
.progress-card ore-stats {
  --stats-bg: transparent;
}

.trial-summary ore-stats {
  --stats-bg: transparent;
}

.configuration-group {
  display: grid;
  gap: var(--size-2);
}

.trial-summary,
.configuration-group + .configuration-group {
  padding-top: var(--size-3);
  border-top: var(--border) solid var(--p-line);
}

.defeat-track {
  display: flex;
  gap: var(--size-2);
  padding-top: var(--size-2);
}

.defeat-track span {
  width: var(--size-10);
  height: var(--size-3);
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line-strong);
  border-radius: var(--rounded-full);
}

.defeat-track span[data-filled] {
  background: var(--color-error);
  border-color: var(--color-error);
}

.hunter-score {
  display: grid;
  gap: var(--size-1);
}

.card-signal {
  display: grid;
  place-items: center;
  min-width: var(--size-14);
  min-height: var(--size-9);
  padding-inline: var(--size-2-5);
  font-family: var(--p-heading);
  font-size: var(--text-xs);
  color: var(--p-gold);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  background: var(--color-primary-backdrop);
  border: var(--border) solid var(--p-line-strong);
  border-radius: var(--rounded-full);
}

.achievement-list ul {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-1-5);
}

.achievement-list li {
  padding: var(--size-1-5) var(--size-2);
  font-size: var(--text-xs);
  background: var(--color-primary-backdrop);
  border-radius: var(--rounded-sm);
}

.trophy-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--size-28), 1fr));
  gap: var(--size-2);
}

.trophy-list li {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  min-width: 0;
  font-size: var(--text-sm);
}

.trophy {
  width: var(--size-12);
  height: var(--size-12);
  padding: var(--size-1);
  object-fit: contain;
  background: var(--p-panel-sunken);
  border: var(--border) solid var(--p-line);
  border-radius: var(--rounded-sm);
}

.quest-intel__active {
  --text-color: var(--p-on-dark);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--size-3);
  align-items: center;
  min-height: var(--size-28);
  padding: var(--size-4);
  color: var(--p-on-dark);
  background: linear-gradient(135deg, var(--p-narrative-band-start), var(--p-narrative-band-end));
  border-radius: var(--rounded-md);
}

.quest-intel__monster {
  width: var(--size-20);
  height: var(--size-20);
  object-fit: contain;
}

.quest-intel__active--empty {
  --text-color: var(--p-text-strong);
  min-height: var(--size-24);
  color: var(--p-text-strong);
  background: var(--p-panel-sunken);
  border: var(--border) dashed var(--p-line);
}

.quest-intel__status ore-accordion-item {
  --accordion-item-details-padding: var(--size-2) 0;
  --accordion-item-summary-padding: var(--size-2) 0;
}

.quest-status-list {
  display: grid;
  gap: var(--size-2);
}

.quest-status-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--size-2);
  align-items: baseline;
  font-size: var(--text-sm);
}

.quest-status-list span {
  color: var(--p-text-muted);
}

.field-notes-card ore-list-item {
  padding-block: var(--size-1);
}

.field-notes-card form {
  padding: var(--size-3);
  background: var(--p-panel-sunken);
  border-radius: var(--rounded-md);
}

@media (width < 760px) {
  .campaign-log__grid {
    /* The stacked template must carry every named area the cards reference: the journal
       row too — a card whose grid-area resolves to no track collapses the 1fr columns to
       zero width, blanking the whole grid under the header. */
    grid-template-areas:
      'mission'
      'trophies'
      'record'
      'base'
      'configuration'
      'memory'
      'journal';
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width < 480px) {
  .settlement-card ore-grid,
  .progress-card ore-grid {
    grid-template-columns: 1fr;
  }
}
</style>
