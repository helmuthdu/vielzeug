<template>
  <div class="reference-section">
    <div class="reference-header">
      <span class="reference-title">Available Exports</span>
      <span class="reference-hint">Click any to insert at cursor</span>
      <div class="search-container">
        <ore-input
          fullwidth
          placeholder="Search exports..."
          :value="localSearchQuery"
          @input="handleSearchInput"></ore-input>
      </div>
    </div>
    <div class="function-categories">
      <div class="category" v-for="category in filteredCategories" :key="category.name" >
        <h4>{{ category.name }} ({{ category.functions.length }} exports)</h4>
        <div class="function-list">
          <ore-chip
            mode="action"
            size="sm"
            title="Click to insert"
            variant="outline"
            v-for="fn in category.functions"
            :key="fn"
            @click="emit('insert-function', fn)">
            {{ fn }}
          </ore-chip>
        </div>
      </div>
      <div class="no-results" v-if="filteredCategories.length === 0" >
        No exports found matching "{{ localSearchQuery }}"
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup >
import { computed, ref } from 'vue';

import type { LibraryEntry } from './repl/registry.generated';

// ============================================================================
// Props & Emits
// ============================================================================

// Every library carries `categories` (arsenal is hand-curated into topical groups; every
// other library gets a single "Exports" bucket — see generate-repl-registry.ts) so this
// component never needs to special-case "is this arsenal?" the way it used to.
const props = defineProps<{
  library: LibraryEntry;
}>();

const emit = defineEmits<{
  'insert-function': [fn: string];
}>();

// ============================================================================
// State
// ============================================================================

const localSearchQuery = ref('');

const handleSearchInput = (e: Event) => {
  const detail = (e as CustomEvent<{ value: string }>).detail;
  localSearchQuery.value = detail?.value ?? '';
};

// ============================================================================
// Computed Properties
// ============================================================================

const filteredCategories = computed(() => {
  const query = localSearchQuery.value.trim().toLowerCase();
  if (!query) return props.library.categories;

  return props.library.categories
    .map((category) => ({
      ...category,
      functions: category.functions.filter((fn) => fn.toLowerCase().includes(query)),
    }))
    .filter((category) => category.functions.length > 0);
});
</script>

<style scoped>
/* Reference Section */
.reference-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  margin-top: 0;
  overflow: hidden;
  background: var(--color-contrast-100);
}

.reference-header {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  background: var(--color-contrast-100);
  border-top: var(--border) solid var(--color-contrast-300);
  border-bottom: var(--border) solid var(--color-contrast-300);
}

.reference-hint {
  font-size: var(--text-xs);
  color: var(--text-color-tertiary);
  letter-spacing: 0.01em;
}

.reference-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-color-secondary);
  letter-spacing: -0.01em;
}

.search-container {
  display: block;
  width: 100%;
}

.search-container :deep(ore-input),
.search-container :deep(input) {
  box-sizing: border-box;
  width: 100%;
}

.function-categories {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem 1rem;
  overflow-y: auto;
  scrollbar-color: var(--color-contrast-300) transparent;
  scrollbar-width: thin;
}

.no-results {
  grid-column: 1 / -1;
  padding: 3rem;
  font-style: italic;
  color: var(--text-color-tertiary);
  text-align: center;
  background: var(--color-contrast-100);
  border-radius: var(--rounded-lg);
}

.category h4 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0 0 0.5rem;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  color: var(--text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.function-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.function-list :deep(ore-chip) {
  cursor: pointer;
}

.function-list :deep(ore-chip:hover) {
  --ore-chip-bg: color-mix(in oklch, var(--color-primary) 12%, transparent);
  --ore-chip-border: var(--color-primary);
  --ore-chip-color: var(--color-primary);
}
</style>
