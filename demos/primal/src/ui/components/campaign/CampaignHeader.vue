<script lang="ts" setup>
import { computed } from 'vue';
import { t } from '../../../app/i18n';
import { campaignAggression, TOTAL_CHAPTERS } from '../../../content/index';
import type { Campaign } from '../../../domain/types';
import AggressionMark from '../AggressionMark.vue';
import PageHeader from '../PageHeader.vue';
import '@vielzeug/refine/stats';

const props = defineProps<{
  art?: string;
  campaign: Campaign;
  eyebrow: string;
  subtitle: string;
}>();

const aggression = computed(() => campaignAggression(props.campaign.chapter));
const status = computed(() => [
  { label: t('campaignHeader.partySize'), value: String(props.campaign.hunters.length) },
  props.campaign.chapter === TOTAL_CHAPTERS
    ? { label: t('campaignHeader.finalBattle'), value: t('campaignHeader.ready') }
    : {
        label: t('campaignHeader.questsReady'),
        value: String(props.campaign.quests.filter((quest) => quest.status === 'available').length),
      },
]);
</script>

<template>
  <PageHeader :art="art" :eyebrow="eyebrow" :subtitle="subtitle" :title="campaign.name">
    <template #center>
      <div class="campaign-header__primary">
        <section class="campaign-header__status" :aria-label="t('campaignHeader.statusLabel')">
          <ore-stats
            size="sm"
            variant="plain"
            v-for="item in status"
            :key="item.label"
            :label="item.label"
            :value="item.value" />
          <ore-stats size="sm" variant="plain" :label="t('campaignHeader.aggression')" >
            <AggressionMark size="sm" slot="value" :level="aggression" />
          </ore-stats>
        </section>
      </div>
    </template>
  </PageHeader>
</template>

<style scoped>
.campaign-header__primary {
  display: flex;
  flex-direction: column;
  gap: var(--size-4);
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.campaign-header__status {
  display: grid;
  grid-template-columns: repeat(3, minmax(var(--size-20), 1fr));
  gap: var(--size-2);
  min-width: var(--size-72);
}

.campaign-header__status ore-stats {
  --stats-bg: transparent;
  --stats-padding: 0 var(--size-2);
  --stats-value-size: var(--text-xl);
}

@media (width < 640px) {
  .campaign-header__primary {
    gap: var(--size-2);
    width: 100%;
    min-width: 0;
  }

  /* Phones keep all three stats on one row: the cells shrink and ellipsize, never wrap;
     the padding step buys the longest labels their full width. */
  .campaign-header__status {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    min-width: 0;
  }

  .campaign-header__status ore-stats {
    --stats-padding: 0 var(--size-1);
  }
}
</style>
