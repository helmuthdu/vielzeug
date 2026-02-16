<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';

interface Props {
  package: string;
  type: 'size' | 'version' | 'dependencies';
}

const props = defineProps<Props>();
const { site } = useData();

// Extract package info from site config
const packageInfo = computed(() => {
  const pkgName = props.package;
  const packages = site.value.themeConfig?.packages || {};

  return (
    packages[pkgName] || {
      version: '1.0.0',
      dependencies: 0,
      size: '0 KB',
    }
  );
});

// Return the requested value as a string
const value = computed(() => {
  switch (props.type) {
    case 'size':
      return packageInfo.value.size;
    case 'version':
      return packageInfo.value.version;
    case 'dependencies':
      return String(packageInfo.value.dependencies);
    default:
      return 'N/A';
  }
});
</script>

<template>
  <span class="package-info">{{ value }}</span>
</template>

<style scoped>
.package-info {
  font-weight: 500;
  color: var(--vp-c-brand-1);
}
</style>
