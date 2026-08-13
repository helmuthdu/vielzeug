<script setup lang="ts">
import { useData } from 'vitepress';
import { computed } from 'vue';

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
      dependencies: 0,
      minNode: null,
      size: props.size || '0 KB',
      version: '1.0.0',
    }
  );
});

const badges = computed(() => [
  {
    alt: 'Version',
    color: 'blue',
    label: 'version',
    value: packageInfo.value.version,
  },
  {
    alt: 'Size',
    color: 'success',
    label: 'size',
    value: packageInfo.value.size,
  },
  {
    alt: 'TypeScript',
    color: 'blue',
    label: 'TypeScript',
    value: '100%',
  },
  {
    alt: 'Dependencies',
    color: 'success',
    label: 'dependencies',
    value: packageInfo.value.dependencies,
  },
]);

const getBadgeUrl = (label: string, value: string | number, color: string) => {
  const formattedValue = String(value).replace(/ /g, '_');
  return `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(formattedValue)}-${color}`;
};
</script>

<template>
  <div class="badges">
    <img src="https://github.com/helmuthdu/vielzeug/actions/workflows/ci.yml/badge.svg" alt="CI" />
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
