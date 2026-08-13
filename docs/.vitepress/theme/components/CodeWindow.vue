<script setup lang="ts">
interface Props {
  filename?: string;
  lang?: string;
  title?: string;
  variant?: 'code' | 'chat';
}

withDefaults(defineProps<Props>(), {
  filename: '',
  lang: 'ts',
  title: 'MCP tool call',
  variant: 'code',
});
</script>

<template>
  <ore-code-window :variant="variant" :lang="lang" :filename="filename" :title="title">
    <slot />
    <slot name="header-end" slot="header-end" />
  </ore-code-window>
</template>
