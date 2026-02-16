<template>
  <div class="reference-section">
    <div class="reference-header">
      <h3>{{ selectedLibrary === 'toolkit' ? 'Available Functions' : 'Available Exports' }}</h3>
      <div class="search-container">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="search-icon">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input v-model="localSearchQuery" type="text" placeholder="Search exports..." class="search-input" />
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
          <code
            v-for="fn in category.functions"
            :key="fn"
            @click="emit('insert-function', fn)"
            class="clickable-fn"
            :class="{ 'is-match': isMatch(fn) }"
            title="Click to insert"
            >{{ fn }}</code
          >
        </div>
      </div>
      <div v-else class="category">
        <h4>Exports ({{ filteredExports.length }} available)</h4>
        <div class="function-list">
          <code
            v-for="ex in filteredExports"
            :key="ex"
            @click="emit('insert-function', ex)"
            class="clickable-fn"
            :class="{ 'is-match': isMatch(ex) }"
            title="Click to insert"
            >{{ ex }}</code
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
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.search-input {
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  width: 240px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-input:focus {
  border-color: var(--vp-c-brand-1);
  outline: none;
  width: 320px;
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
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
  gap: 0.6rem;
}

.function-list code {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  border: 1px solid var(--vp-c-divider);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.clickable-fn {
  cursor: pointer;
}

.clickable-fn:hover,
.clickable-fn.is-match {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.clickable-fn:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.clickable-fn.is-match {
  font-weight: 600;
}
</style>
