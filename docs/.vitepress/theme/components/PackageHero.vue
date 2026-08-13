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
  return packages[props.package] || { version: null, size: null, dependencies: 0, minNode: null };
});

const category = computed(() => frontmatter.value.category || null);
const description = computed(() => frontmatter.value.description || null);
const exports = computed(() => frontmatter.value.exports || []);
const related = computed(() => frontmatter.value.related || []);
const environments = computed(() => frontmatter.value.environments || []);
const minNodeLabel = computed(() => (packageInfo.value.minNode ? packageInfo.value.minNode.replace(/^>=/, '≥') : null));
const featuredExports = computed(() => exports.value.slice(0, 5));

const envLabel: Record<string, string> = {
  browser: 'Browser',
  node: 'Node',
  ssr: 'SSR',
  deno: 'Deno',
  bun: 'Bun',
};

const environmentLabels = computed(() =>
  environments.value.map((e: string) =>
    e === 'node' && minNodeLabel.value ? `Node ${minNodeLabel.value}` : (envLabel[e] ?? e),
  ),
);

const packageName = computed(() => {
  const title: string = frontmatter.value.title || props.package;
  return title.replace(/\s*[—–-].*$/, '').trim();
});
const packageScope = computed(() => `@vielzeug/${props.package}`);
const installCommand = computed(() => `pnpm add ${packageScope.value}`);

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
      <div class="pkg-identity">
        <div class="pkg-hero-top">
          <img
            :src="withBase(`/logo-${props.package}.svg`)"
            :alt="`${props.package} logo`"
            class="pkg-logo-img"
            @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')" />
          <ore-text as="h1" variant="heading" size="lg" weight="bold" color="heading">{{ packageName }}</ore-text>
          <ore-badge v-if="category" color="primary" variant="flat" size="xs" rounded="full">
            {{ categoryLabel }}
          </ore-badge>
        </div>
        <div class="pkg-identity-content">
          <ore-text v-if="description" as="p" variant="body" size="md" color="secondary" class="pkg-hero-description">
            {{ description }}
          </ore-text>
          <div class="pkg-install-action">
            <ore-text as="span" variant="label" size="sm" color="muted">Install</ore-text>
            <ore-copy-command :value="installCommand" size="md" variant="bordered" class="pkg-install-command"></ore-copy-command>
          </div>
        </div>
      </div>
      <div class="pkg-hero-content">
        <dl class="pkg-facts" aria-label="Package facts">
          <div v-if="packageInfo.version" class="pkg-fact">
            <dt><ore-text as="span" class="pkg-sr-only">Version</ore-text></dt>
            <dd>
              <ore-text as="span" variant="label" size="sm" color="body">v{{ packageInfo.version }}</ore-text>
            </dd>
          </div>
          <div v-if="packageInfo.size && packageInfo.size !== 'N/A'" class="pkg-fact">
            <dt><ore-text as="span" class="pkg-sr-only">Size</ore-text></dt>
            <dd>
              <ore-text as="span" variant="label" size="sm" color="body">{{ packageInfo.size }} gzip</ore-text>
            </dd>
          </div>
          <div v-if="packageInfo.dependencies === 0" class="pkg-fact">
            <dt><ore-text as="span" class="pkg-sr-only">Dependencies</ore-text></dt>
            <dd><ore-text as="span" variant="label" size="sm" color="body">Zero dependencies</ore-text></dd>
          </div>
        </dl>
        <ore-separator></ore-separator>
        <div class="pkg-details">
          <section v-if="environments.length" class="pkg-runtime" aria-label="Runtime support">
            <ore-text as="span" variant="label" size="sm" weight="semibold" color="body" class="pkg-section-label">
              Runtime support
            </ore-text>
            <div class="pkg-runtime-badges">
              <ore-badge
                v-for="environment in environmentLabels"
                :key="environment"
                color="secondary"
                variant="flat"
                size="xs"
                rounded="sm">
                {{ environment }}
              </ore-badge>
            </div>
          </section>
          <section v-if="exports.length" class="pkg-exports-row">
            <ore-text as="span" variant="label" size="sm" weight="semibold" color="body" class="pkg-section-label">
              Key exports
            </ore-text>
            <div class="pkg-export-list">
              <ore-badge
                v-for="ex in featuredExports"
                :key="ex"
                variant="outline"
                size="xs"
                rounded="sm"
                class="pkg-export-tag">
                {{ ex }}
              </ore-badge>
              <ore-button
                v-if="exports.length > featuredExports.length"
                :href="withBase(`/${props.package}/api`)"
                size="sm"
                variant="text"
                class="pkg-exports-more">
                View all {{ exports.length }} exports
                <ore-icon name="arrow-right" size="14" aria-hidden="true"></ore-icon>
              </ore-button>
            </div>
          </section>
          <section v-if="related.length" class="pkg-related-row">
            <ore-text as="span" variant="label" size="sm" weight="semibold" color="body" class="pkg-section-label">
              Works well with
            </ore-text>
            <div class="pkg-related-list">
              <ore-button
                v-for="rel in related"
                :key="rel"
                :href="withBase(`/${rel}/`)"
                size="sm"
                variant="flat"
                class="pkg-related-button">
                <img slot="prefix" :src="withBase(`/logo-${rel}.svg`)" alt="" class="pkg-related-logo" />
                {{ rel }}
              </ore-button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pkg-hero {
  box-sizing: border-box;
  margin-bottom: var(--size-8);
  width: 100%;
}

.pkg-hero-body {
  display: flex;
  flex-direction: column;
  gap: var(--size-6);
  max-width: 68ch;
}

.pkg-identity {
  display: flex;
  flex-direction: column;
  gap: var(--size-3);
}

.pkg-logo-img {
  flex: none;
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.pkg-identity-content {
  display: flex;
  flex-direction: column;
  gap: var(--size-3);
  min-width: 0;
}

.pkg-hero-content {
  display: flex;
  flex-direction: column;
  gap: var(--size-5);
}

.pkg-hero-top {
  display: flex;
  align-items: center;
  gap: var(--size-3);
  flex-wrap: wrap;
}

.pkg-install-action {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
}

.pkg-install-command {
  --copy-command-border-color: var(--color-primary);
  --copy-command-hover-bg: var(--color-primary-backdrop);

  min-width: 0;
  max-width: 100%;
}

.pkg-hero-description {
  margin: 0;
  max-width: 60ch;
}

.pkg-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-3);
  margin: 0;
}

.pkg-fact {
  display: flex;
  align-items: center;
}

.pkg-fact dd {
  margin: 0;
}

.pkg-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.pkg-details {
  display: flex;
  flex-direction: column;
  gap: var(--size-5);
}

.pkg-runtime,
.pkg-exports-row,
.pkg-related-row {
  display: flex;
  flex-direction: column;
  gap: var(--size-2);
}

.pkg-runtime-badges,
.pkg-export-list,
.pkg-related-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--size-1);
}

.pkg-export-tag {
  --badge-font-family: var(--font-mono);
}

.pkg-exports-more {
  --button-font-family: var(--font-mono);
}

.pkg-related-button {
  --button-padding: var(--size-1) var(--size-2);
}

.pkg-related-logo {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 640px) {
  .pkg-hero {
    padding: var(--size-5) var(--size-4);
  }

  .pkg-logo-img {
    width: 48px;
    height: 48px;
  }

  .pkg-facts {
    gap: var(--size-2);
  }

  .pkg-install-action {
    gap: var(--size-1);
  }

  .pkg-install-command {
    --copy-command-font-size: var(--text-xs);
    --copy-command-padding: var(--size-1) var(--size-2);
  }
}
</style>
