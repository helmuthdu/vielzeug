<script lang="ts" setup >
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
  <ore-code-window :filename="filename" :lang="lang" :title="title" :variant="variant" >
    <slot />
    <slot name="header-end" slot="header-end" />
  </ore-code-window>
</template>
