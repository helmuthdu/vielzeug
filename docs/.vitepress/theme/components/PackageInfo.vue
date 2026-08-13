<script setup lang="ts">
import { useData } from 'vitepress';
import { computed } from 'vue';

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
      dependencies: 0,
      minNode: null,
      size: '0 KB',
      version: '1.0.0',
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
}
</style>
