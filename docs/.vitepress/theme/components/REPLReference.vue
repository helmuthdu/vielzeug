<template>
  <div class="reference-section">
    <div class="reference-header">
      <h3>{{ selectedLibrary === 'toolkit' ? 'Available Functions' : 'Available Exports' }}</h3>
      <div class="search-container">
        <bit-input :value="localSearchQuery" placeholder="Search exports..." @input="handleSearchInput"> </bit-input>
      </div>
    </div>
    <div class="function-categories">
      <div
        v-if="selectedLibrary === 'toolkit'"
        v-for="category in filteredCategories"
        :key="category.name"
        class="category">
        <h4>{{ category.name }} ({{ category.functions.length }} functions)</h4>
        <div class="function-list">
          <bit-chip
            v-for="fn in category.functions"
            :key="fn"
            mode="action"
            size="sm"
            variant="outline"
            @click="emit('insert-function', fn)"
            title="Click to insert"
            >{{ fn }}</bit-chip
          >
        </div>
      </div>
      <div v-else class="category">
        <h4>Exports ({{ filteredExports.length }} available)</h4>
        <div class="function-list">
          <bit-chip
            v-for="ex in filteredExports"
            :key="ex"
            mode="static"
            size="sm"
            :color="isMatch(ex) ? 'primary' : undefined"
            style="cursor: pointer"
            @click="emit('insert-function', ex)"
            title="Click to insert"
            >{{ ex }}</bit-chip
          >
        </div>
      </div>
      <div
        v-if="(selectedLibrary === 'toolkit' ? filteredCategories.length : filteredExports.length) === 0"
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
  toolkitCategories: ReadonlyArray<{
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
  if (props.selectedLibrary !== 'toolkit' || !localSearchQuery.value) {
    return props.selectedLibrary === 'toolkit' ? props.toolkitCategories : [];
  }

  const query = localSearchQuery.value.toLowerCase();
  return props.toolkitCategories
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
  margin-top: 3rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg);
  overflow: hidden;
  transition: border-color 0.3s;
}

.reference-section:focus-within {
  border-color: var(--vp-c-brand-1);
}

.reference-header {
  padding: 1rem 1.5rem;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.reference-header h3 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vp-c-text-2);
}

.search-container {
  min-width: 240px;
  display: flex;
  justify-content: flex-end;
}

.function-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: var(--vp-c-text-3);
  font-style: italic;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

.category h4 {
  margin: 0 0 1rem;
  color: var(--vp-c-brand-1);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.5rem;
}

.function-list {
  font-size: 0.85rem;
  line-height: 1.6;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
