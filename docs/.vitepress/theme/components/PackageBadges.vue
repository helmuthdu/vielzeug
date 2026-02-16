<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';

interface Props {
  package: string;
  size?: string;
}

const props = defineProps<Props>();
const { site } = useData();

// Extract package info from the monorepo
const packageInfo = computed(() => {
  const pkgName = props.package;

  // Try to get package info from site config
  // In production, this would be populated during build time
  const packages = site.value.themeConfig?.packages || {};

  return (
    packages[pkgName] || {
      version: '1.0.0',
      dependencies: 0,
      size: props.size || '0 KB',
    }
  );
});

const badges = computed(() => [
  {
    label: 'version',
    value: packageInfo.value.version,
    color: 'blue',
    alt: 'Version',
  },
  {
    label: 'size',
    value: packageInfo.value.size,
    color: 'success',
    alt: 'Size',
  },
  {
    label: 'TypeScript',
    value: '100%',
    color: 'blue',
    alt: 'TypeScript',
  },
  {
    label: 'dependencies',
    value: packageInfo.value.dependencies,
    color: 'success',
    alt: 'Dependencies',
  },
]);

const getBadgeUrl = (label: string, value: string | number, color: string) => {
  const formattedValue = String(value).replace(/ /g, '_');
  return `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(formattedValue)}-${color}`;
};
</script>

<template>
  <div class="badges">
    <img
      v-for="badge in badges"
      :key="badge.label"
      :src="getBadgeUrl(badge.label, badge.value, badge.color)"
      :alt="badge.alt" />
  </div>
</template>

<style scoped>
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.badges img {
  height: 20px;
}
</style>
