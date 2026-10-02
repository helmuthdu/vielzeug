<script lang="ts" setup>
import { requestMusicConsent } from '../../app/consent';
import { t } from '../../app/i18n';
import PageHeader from '../components/PageHeader.vue';
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/text';
</script>

<template>
  <div class="frame stack" style="--stack-gap: 1.5rem">
    <PageHeader :eyebrow="t('privacy.eyebrow')" :subtitle="t('privacy.subtitle')" :title="t('privacy.title')" />

    <ore-card aria-labelledby="privacy-storage-title">
      <div class="card-title" slot="header">
        <ore-text as="h2" id="privacy-storage-title" size="xs" variant="heading">
          {{ t('privacy.dataTitle') }}
        </ore-text>
      </div>
      <div class="stack" style="--stack-gap: 0.9rem">
        <ore-text size="sm">{{ t('privacy.dataBody') }}</ore-text>
        <ore-text size="sm">{{ t('privacy.backupsBody') }}</ore-text>
      </div>
    </ore-card>

    <ore-card aria-labelledby="privacy-music-title">
      <div class="card-title" slot="header">
        <ore-text as="h2" id="privacy-music-title" size="xs" variant="heading">
          {{ t('privacy.musicTitle') }}
        </ore-text>
      </div>
      <div class="stack" style="--stack-gap: 0.9rem">
        <ore-text size="sm">{{ t('privacy.musicBody') }}</ore-text>
        <ore-button size="sm" variant="bordered" @click="requestMusicConsent()">
          {{ t('consent.change') }}
        </ore-button>
      </div>
    </ore-card>

    <ore-card aria-labelledby="privacy-sessions-title">
      <div class="card-title" slot="header">
        <ore-text as="h2" id="privacy-sessions-title" size="xs" variant="heading">
          {{ t('privacy.sessionsTitle') }}
        </ore-text>
      </div>
      <ore-text size="sm">{{ t('privacy.sessionsBody') }}</ore-text>
    </ore-card>
  </div>
</template>
