<template>
  <div class="reference-section">
    <div class="reference-header">
      <span class="reference-title">{{
        selectedLibrary === 'arsenal' ? 'Available Functions' : 'Available Exports'
      }}</span>
      <span class="reference-hint">Click any to insert at cursor</span>
      <div class="search-container">
        <sg-input fullwidth :value="localSearchQuery" placeholder="Search exports..." @input="handleSearchInput">
        </sg-input>
      </div>
    </div>
    <div class="function-categories">
      <div
        v-if="selectedLibrary === 'arsenal'"
        v-for="category in filteredCategories"
        :key="category.name"
        class="category">
        <h4>{{ category.name }} ({{ category.functions.length }} functions)</h4>
        <div class="function-list">
          <sg-chip
            v-for="fn in category.functions"
            :key="fn"
            mode="action"
            size="sm"
            variant="outline"
            @click="emit('insert-function', fn)"
            title="Click to insert"
            >{{ fn }}</sg-chip
          >
        </div>
      </div>
      <div v-else class="category">
        <h4>Exports ({{ filteredExports.length }} available)</h4>
        <div class="function-list">
          <sg-chip
            v-for="ex in filteredExports"
            :key="ex"
            mode="action"
            size="sm"
            variant="outline"
            :color="isMatch(ex) ? 'primary' : undefined"
            @click="emit('insert-function', ex)"
            title="Click to insert"
            >{{ ex }}</sg-chip
          >
        </div>
      </div>
      <div
        v-if="(selectedLibrary === 'arsenal' ? filteredCategories.length : filteredExports.length) === 0"
        class="no-results">
        No exports found matching "{{ localSearchQuery }}"
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

// ============================================================================
// Props & Emits
// ============================================================================

const props = defineProps<{
  selectedLibrary: string;
  arsenalCategories: ReadonlyArray<{
    name: string;
    functions: readonly string[];
  }>;
  libraryExports: Record<string, readonly string[]>;
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
  if (props.selectedLibrary !== 'arsenal' || !localSearchQuery.value) {
    return props.selectedLibrary === 'arsenal' ? props.arsenalCategories : [];
  }

  const query = localSearchQuery.value.toLowerCase();
  return props.arsenalCategories
    .map((cat) => ({
      ...cat,
      functions: cat.functions.filter((fn) => fn.toLowerCase().includes(query)),
    }))
    .filter((cat) => cat.functions.length > 0);
});

const filteredExports = computed(() => {
  const exports = props.libraryExports[props.selectedLibrary] || [];
  if (!localSearchQuery.value) return exports;

  const query = localSearchQuery.value.toLowerCase();
  return exports.filter((ex) => ex.toLowerCase().includes(query));
});

// ============================================================================
// Helper Functions
// ============================================================================

const isMatch = (fn: string) => {
  return localSearchQuery.value && fn.toLowerCase().includes(localSearchQuery.value.toLowerCase());
};
</script>

<style scoped>
/* Reference Section */
.reference-section {
  margin-top: 0;
  background: var(--color-contrast-100);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

.reference-header {
  padding: 0.625rem 1rem;
  background: var(--color-contrast-100);
  border-top: var(--border) solid var(--color-contrast-300);
  border-bottom: var(--border) solid var(--color-contrast-300);
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex-shrink: 0;
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
  width: 100%;
  display: block;
}

.search-container :deep(sg-input),
.search-container :deep(input) {
  width: 100%;
  box-sizing: border-box;
}

.function-categories {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem 1rem;
  overflow-y: auto;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: var(--color-contrast-300) transparent;
}

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: var(--text-color-tertiary);
  font-style: italic;
  background: var(--color-contrast-100);
  border-radius: var(--rounded-lg);
}

.category h4 {
  margin: 0 0 0.5rem;
  color: var(--text-color-secondary);
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.function-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.function-list :deep(sg-chip) {
  cursor: pointer;
}

.function-list :deep(sg-chip:hover) {
  --sg-chip-bg: color-mix(in oklch, var(--color-primary) 12%, transparent);
  --sg-chip-border: var(--color-primary);
  --sg-chip-color: var(--color-primary);
}
</style>
