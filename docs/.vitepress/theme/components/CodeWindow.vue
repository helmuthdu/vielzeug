<script setup lang="ts">
interface Props {
  variant?: 'code' | 'chat';
  lang?: string;
  filename?: string;
  title?: string;
}

withDefaults(defineProps<Props>(), {
  variant: 'code',
  lang: 'ts',
  filename: '',
  title: 'MCP tool call',
});
</script>

<template>
  <sg-code-window :variant="variant" :lang="lang" :filename="filename" :title="title">
    <slot />
    <slot name="header-end" slot="header-end" />
  </sg-code-window>
</template>
