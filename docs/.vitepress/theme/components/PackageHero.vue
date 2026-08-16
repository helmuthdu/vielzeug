<script lang="ts" setup >
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
            class="pkg-logo-img"
            :alt="`${props.package} logo`"
            :src="withBase(`/logo-${props.package}.svg`)"
            @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')" />
          <ore-text as="h1" color="heading" size="lg" variant="heading" weight="bold" >{{ packageName }}</ore-text>
          <ore-badge color="primary" rounded="full" size="xs" variant="flat" v-if="category" >
            {{ categoryLabel }}
          </ore-badge>
        </div>
        <div class="pkg-identity-content">
          <ore-text as="p" class="pkg-hero-description" color="secondary" size="md" variant="body" v-if="description" >
            {{ description }}
          </ore-text>
          <div class="pkg-install-action">
            <ore-copy-command class="pkg-install-command" size="md" variant="bordered" :value="installCommand" ></ore-copy-command>
          </div>
        </div>
      </div>
      <div class="pkg-hero-content">
        <section aria-labelledby="pkg-facts-heading" class="pkg-facts-panel" >
          <dl class="pkg-facts">
            <div class="pkg-fact" v-if="packageInfo.version" >
              <dt><ore-text as="span" class="pkg-sr-only">Version</ore-text></dt>
              <dd>
                <ore-tooltip content="Published package version" placement="top">
                  <ore-chip color="primary" rounded="lg" size="md" variant="flat" >
                    <ore-icon aria-hidden="true" name="package" size="14" slot="icon" ></ore-icon>
                    v{{ packageInfo.version }}
                  </ore-chip>
                </ore-tooltip>
              </dd>
            </div>
            <div class="pkg-fact" v-if="packageInfo.size && packageInfo.size !== 'N/A'" >
              <dt><ore-text as="span" class="pkg-sr-only">Size</ore-text></dt>
              <dd>
                <ore-tooltip content="Compressed package size" placement="top">
                  <ore-chip color="secondary" rounded="lg" size="md" variant="flat" >
                    <ore-icon aria-hidden="true" name="file-archive" size="14" slot="icon" ></ore-icon>
                    {{ packageInfo.size }} gzip
                  </ore-chip>
                </ore-tooltip>
              </dd>
            </div>
            <div class="pkg-fact" v-if="packageInfo.dependencies === 0" >
              <dt><ore-text as="span" class="pkg-sr-only">Dependencies</ore-text></dt>
              <dd>
                <ore-tooltip content="No runtime dependencies" placement="top">
                  <ore-chip color="success" rounded="lg" size="md" variant="flat" >
                    <ore-icon aria-hidden="true" name="layers" size="14" slot="icon" ></ore-icon>
                    Zero dependencies
                  </ore-chip>
                </ore-tooltip>
              </dd>
            </div>
          </dl>
        </section>
        <ore-separator></ore-separator>
        <div class="pkg-details">
          <section aria-label="Runtime support" class="pkg-runtime" v-if="environments.length" >
            <ore-text as="span" class="pkg-section-label" color="body" size="sm" variant="label" weight="semibold" >
              Runtime support
            </ore-text>
            <div class="pkg-runtime-badges">
              <ore-badge
                color="secondary"
                rounded="sm"
                size="xs"
                variant="flat"
                v-for="environment in environmentLabels"
                :key="environment">
                {{ environment }}
              </ore-badge>
            </div>
          </section>
          <section class="pkg-exports-row" v-if="exports.length" >
            <ore-text as="span" class="pkg-section-label" color="body" size="sm" variant="label" weight="semibold" >
              Key exports
            </ore-text>
            <div class="pkg-export-list">
              <ore-badge
                class="pkg-export-tag"
                rounded="sm"
                size="xs"
                variant="outline"
                v-for="ex in featuredExports"
                :key="ex">
                {{ ex }}
              </ore-badge>
              <ore-button
                class="pkg-exports-more"
                size="sm"
                variant="text"
                v-if="exports.length > featuredExports.length"
                :href="withBase(`/${props.package}/api`)">
                View all {{ exports.length }} exports
                <ore-icon aria-hidden="true" name="arrow-right" size="14" ></ore-icon>
              </ore-button>
            </div>
          </section>
          <section class="pkg-related-row" v-if="related.length" >
            <ore-text as="span" class="pkg-section-label" color="body" size="sm" variant="label" weight="semibold" >
              Works well with
            </ore-text>
            <div class="pkg-related-list">
              <ore-button
                class="pkg-related-button"
                size="sm"
                variant="ghost"
                v-for="rel in related"
                :key="rel"
                :href="withBase(`/${rel}/`)">
                <img alt="" class="pkg-related-logo" slot="prefix" :src="withBase(`/logo-${rel}.svg`)" />
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
  width: 100%;
  margin-bottom: var(--size-8);
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
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: center;
}

.pkg-install-action {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: var(--size-3);
  align-items: flex-start;
}

.pkg-install-command {
  min-width: 0;
  max-width: 100%;
}

.pkg-hero-description {
  max-width: 60ch;
  margin: 0;
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
  white-space: nowrap;
  border: 0;
  clip: rect(0, 0, 0, 0);
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
  gap: var(--size-1);
  align-items: center;
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
