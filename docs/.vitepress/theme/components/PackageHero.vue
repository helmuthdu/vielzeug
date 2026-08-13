<script setup lang="ts">
import { useData } from 'vitepress';
import { computed } from 'vue';

interface Props {
  package: string;
}

const props = defineProps<Props>();
const { site, frontmatter } = useData();
const withBase = (path: string) => `${site.value.base.replace(/\/$/, '')}${path}`;

const packageInfo = computed(() => {
  const packages = site.value.themeConfig?.packages || {};
  return packages[props.package] || { dependencies: 0, minNode: null, size: null, version: null };
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
  bun: 'Bun',
  deno: 'Deno',
  node: 'Node',
  ssr: 'SSR',
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
    'ai-tooling': 'AI Tooling',
    auth: 'Auth',
    data: 'Data',
    datetime: 'Date & Time',
    di: 'DI',
    events: 'Events',
    finance: 'Finance',
    forms: 'Forms',
    http: 'HTTP',
    i18n: 'i18n',
    logging: 'Logging',
    network: 'Network',
    reactive: 'Reactive',
    routing: 'Routing',
    state: 'State',
    storage: 'Storage',
    time: 'Date & Time',
    ui: 'UI',
    'ui-components': 'UI Components',
    'ui-interaction': 'UI Interaction',
    'ui-performance': 'UI Performance',
    'ui-primitives': 'UI Primitives',
    utilities: 'Utilities',
    validation: 'Validation',
    workers: 'Workers',
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
            <ore-copy-command :value="installCommand" size="md" variant="bordered" class="pkg-install-command"></ore-copy-command>
          </div>
        </div>
      </div>
      <div class="pkg-hero-content">
        <section class="pkg-facts-panel" aria-labelledby="pkg-facts-heading">
          <dl class="pkg-facts">
            <div v-if="packageInfo.version" class="pkg-fact">
              <dt><ore-text as="span" class="pkg-sr-only">Version</ore-text></dt>
              <dd>
                <ore-tooltip content="Published package version" placement="top">
                  <ore-chip color="primary" variant="flat" size="md" rounded="lg">
                    <ore-icon slot="icon" name="package" size="14" aria-hidden="true"></ore-icon>
                    v{{ packageInfo.version }}
                  </ore-chip>
                </ore-tooltip>
              </dd>
            </div>
            <div v-if="packageInfo.size && packageInfo.size !== 'N/A'" class="pkg-fact">
              <dt><ore-text as="span" class="pkg-sr-only">Size</ore-text></dt>
              <dd>
                <ore-tooltip content="Compressed package size" placement="top">
                  <ore-chip color="secondary" variant="flat" size="md" rounded="lg">
                    <ore-icon slot="icon" name="file-archive" size="14" aria-hidden="true"></ore-icon>
                    {{ packageInfo.size }} gzip
                  </ore-chip>
                </ore-tooltip>
              </dd>
            </div>
            <div v-if="packageInfo.dependencies === 0" class="pkg-fact">
              <dt><ore-text as="span" class="pkg-sr-only">Dependencies</ore-text></dt>
              <dd>
                <ore-tooltip content="No runtime dependencies" placement="top">
                  <ore-chip color="success" variant="flat" size="md" rounded="lg">
                    <ore-icon slot="icon" name="layers" size="14" aria-hidden="true"></ore-icon>
                    Zero dependencies
                  </ore-chip>
                </ore-tooltip>
              </dd>
            </div>
          </dl>
        </section>
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
                variant="ghost"
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
  align-items: flex-start;
  flex-direction: column;
}

.pkg-install-command {
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
  gap: var(--size-2);
  margin: 0;
}

.pkg-facts-panel {
  display: flex;
  flex-direction: column;
  gap: var(--size-2);
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
