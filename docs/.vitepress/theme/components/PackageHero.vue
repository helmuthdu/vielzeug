<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';

interface Props {
  package: string;
}

const props = defineProps<Props>();
const { site, frontmatter } = useData();

const packageInfo = computed(() => {
  const packages = site.value.themeConfig?.packages || {};
  return packages[props.package] || { version: null, size: null, dependencies: 0 };
});

const category = computed(() => frontmatter.value.category || null);
const description = computed(() => frontmatter.value.description || null);
const exports = computed(() => frontmatter.value.exports || []);
const related = computed(() => frontmatter.value.related || []);
const environments = computed(() => frontmatter.value.environments || []);

const envLabel: Record<string, string> = {
  browser: 'Browser',
  node: 'Node.js',
  ssr: 'SSR',
  deno: 'Deno',
  bun: 'Bun',
};

const packageName = computed(() => {
  const title: string = frontmatter.value.title || props.package;
  return title.replace(/\s*[—–-].*$/, '').trim();
});

const categoryLabel = computed(() => {
  const map: Record<string, string> = {
    utilities: 'Utilities',
    state: 'State',
    validation: 'Validation',
    ui: 'UI',
    'ui-components': 'UI Components',
    'ui-primitives': 'UI Primitives',
    'ui-interaction': 'UI Interaction',
    'ui-performance': 'UI Performance',
    forms: 'Forms',
    auth: 'Auth',
    data: 'Data',
    network: 'Network',
    datetime: 'Date & Time',
    time: 'Date & Time',
    finance: 'Finance',
    reactive: 'Reactive',
    routing: 'Routing',
    storage: 'Storage',
    http: 'HTTP',
    events: 'Events',
    logging: 'Logging',
    i18n: 'i18n',
    di: 'DI',
    workers: 'Workers',
    'ai-tooling': 'AI Tooling',
  };
  const val = category.value;
  if (!val) return '';
  return map[val] ?? val.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
});
</script>

<template>
  <div class="pkg-hero">
    <div class="pkg-hero-body">
      <div class="pkg-hero-content">
        <div class="pkg-hero-top">
          <img
            :src="withBase(`/logo-${props.package}.svg`)"
            :alt="`${props.package} logo`"
            class="pkg-logo-img"
            @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')" />
          <sg-text as="h1" variant="heading" size="xl" weight="bold" color="heading">{{ packageName }}</sg-text>
          <sg-badge v-if="category" color="primary" variant="flat" size="xs" rounded="full">
            {{ categoryLabel }}
          </sg-badge>
        </div>
        <sg-text v-if="description" as="p" variant="body" size="md" color="secondary" class="pkg-hero-description">{{
          description
        }}</sg-text>
        <div class="pkg-meta-row">
          <sg-badge v-if="packageInfo.version" color="primary" size="xs" rounded="full">
            v{{ packageInfo.version }}
          </sg-badge>
          <sg-badge v-if="packageInfo.size && packageInfo.size !== 'N/A'" color="primary" size="xs" rounded="full">
            {{ packageInfo.size }} gzip
          </sg-badge>
          <sg-badge v-if="packageInfo.dependencies === 0" color="primary" size="xs" rounded="full">0 deps</sg-badge>
          <sg-badge v-if="environments.length" color="primary" size="xs" rounded="full">
            {{ environments.map((e) => envLabel[e] ?? e).join(' · ') }}
          </sg-badge>
        </div>
        <div v-if="exports.length" class="pkg-exports-row">
          <sg-badge
            v-for="ex in exports.slice(0, 8)"
            :key="ex"
            variant="outline"
            size="xs"
            rounded="sm"
            class="pkg-export-tag">
            {{ ex }}
          </sg-badge>
          <a v-if="exports.length > 8" :href="withBase(`/${props.package}/api`)" class="pkg-exports-more">
            +{{ exports.length - 8 }} more →
          </a>
        </div>
        <div v-if="related.length" class="pkg-related-row">
          <a v-for="rel in related" :key="rel" :href="withBase(`/${rel}/`)" class="pkg-related-link">
            <sg-badge color="secondary" variant="flat" size="xs" rounded="sm">{{ rel }}</sg-badge>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pkg-hero {
  margin-bottom: var(--size-8);
}

.pkg-hero-body {
  display: flex;
  align-items: flex-start;
  gap: var(--size-6);
}

.pkg-logo-img {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  object-fit: contain;
  border: var(--border) solid var(--color-contrast-300);
  border-radius: var(--rounded-lg);
  padding: var(--size-2);
}

.pkg-hero-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pkg-hero-top {
  display: flex;
  align-items: center;
  gap: var(--size-3);
  flex-wrap: wrap;
  margin-bottom: var(--size-2);
}

.pkg-hero-description {
  margin: 0 0 var(--size-4);
  max-width: 60ch;
}

.pkg-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--size-1-5);
  margin-bottom: 0;
}

.pkg-exports-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--size-1);
  margin-top: var(--size-4);
  padding-top: var(--size-4);
  border-top: var(--border) solid var(--color-contrast-200);
}

.pkg-related-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--size-1);
  margin-top: var(--size-2);
}

.pkg-export-tag {
  --badge-font-family: var(--font-mono);
}

.pkg-exports-more {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-primary);
  text-decoration: none;
  white-space: nowrap;
  opacity: 0.8;
  transition: opacity var(--transition-fast);
}

.pkg-exports-more:hover {
  opacity: 1;
}

.pkg-related-link {
  text-decoration: none;
}

@media (max-width: 640px) {
  .pkg-hero {
    padding: var(--size-5) var(--size-4);
  }
}
</style>
