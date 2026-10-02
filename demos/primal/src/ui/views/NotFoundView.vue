<script lang="ts" setup >
import { t } from '../../app/i18n';
import LinkButton from '../components/LinkButton.vue';
</script>

<template>
  <div class="frame stack" style="text-align: center; padding-block: 4rem; justify-items: center">
    <ore-text variant="overline">{{ t('notFound.eyebrow') }}</ore-text>
    <ore-text as="h1" size="lg" variant="heading" >{{ t('notFound.title') }}</ore-text>
    <ore-text color="muted">{{ t('notFound.text') }}</ore-text>
    <LinkButton to="home" variant="bordered">{{ t('notFound.cta') }}</LinkButton>
  </div>
</template>
