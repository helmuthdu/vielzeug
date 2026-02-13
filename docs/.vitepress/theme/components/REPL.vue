<!-- eslint-disable no-undef -->
<template>
  <div id="repl-container" class="repl-container" :class="{ 'is-expanded': isExpanded }">
    <!-- Library Selector Card Grid -->
    <div v-if="!isExpanded" class="library-grid">
      <div
        v-for="(desc, lib) in libraryDescriptions"
        :key="lib"
        class="library-card"
        :class="{ active: selectedLibrary === lib }"
        @click="
          selectedLibrary = lib;
          switchLibrary();
        ">
        <div class="card-icon">
          <img :src="withBase(`/logo-${lib}.svg`)" :alt="`${lib} logo`" class="lib-logo" />
        </div>
        <div class="card-info">
          <span class="card-title">@vielzeug/{{ lib }}</span>
          <p class="card-desc">{{ desc }}</p>
        </div>
      </div>
    </div>

    <!-- Editor and Output Component -->
    <REPLEditor
      ref="editorRef"
      :selected-library="selectedLibrary"
      :selected-example="selectedExample"
      :is-expanded="isExpanded"
      :examples="examples"
      :is-dark="isDark"
      :get-default-code="getDefaultCode"
      :update-monaco-types="updateMonacoTypes"
      :storage-prefix="STORAGE_PREFIX"
      @update:selected-example="selectedExample = $event"
      @toggle-expand="toggleExpand"
      @run-code="onRunCode"
      @clear-output="onClearOutput" />

    <!-- Function Reference -->
    <REPLReference
      v-if="!isExpanded"
      :selected-library="selectedLibrary"
      :toolkit-categories="TOOLKIT_CATEGORIES"
      :library-exports="LIBRARY_EXPORTS"
      @insert-function="insertFunction" />
  </div>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import REPLEditor from './REPLEditor.vue';
import REPLReference from './REPLReference.vue';
import { examples } from './repl/examples';
import { libraryTypes, toolkitTypes } from './repl/types';

// ============================================================================
// Constants
// ============================================================================

const MONACO_CDN = 'https://unpkg.com/monaco-editor@0.55.1/min/vs';
const STORAGE_PREFIX = 'vielzeug-repl-code-';

const LIBRARY_DESCRIPTIONS = {
  deposit: 'Type-safe local storage with schemas, expiration, and query building.',
  fetchit: 'Advanced HTTP client with caching, retries, and deduplication.',
  formit: 'Type-safe form state and validation for React and beyond.',
  i18nit: 'Internationalization library with TypeScript support.',
  logit: 'Beautiful console logging with styling and remote logging support.',
  permit: 'Role-based access control (RBAC) system for permissions.',
  stateit: 'State management with reactive subscriptions.',
  toolkit: 'Utility library with functions for arrays, objects, and more.',
  validit: 'Type-safe schema validation with advanced error handling.',
  wireit: 'Lightweight dependency injection container with IoC principles.',
} as const;

const LIBRARY_LOADERS = {
  deposit: () => import('@vielzeug/deposit'),
  fetchit: () => import('@vielzeug/fetchit'),
  formit: () => import('@vielzeug/formit'),
  i18nit: () => import('@vielzeug/i18nit'),
  logit: () => import('@vielzeug/logit'),
  permit: () => import('@vielzeug/permit'),
  stateit: () => import('@vielzeug/stateit'),
  toolkit: () => import('@vielzeug/toolkit'),
  validit: () => import('@vielzeug/validit'),
  wireit: () => import('@vielzeug/wireit'),
} as const;

const LIBRARY_EXPORTS = {
  toolkit: [],
  deposit: ['Deposit'],
  fetchit: ['createHttpClient', 'createQueryClient'],
  formit: ['createForm'],
  i18nit: ['createI18n'],
  logit: ['Logit'],
  permit: ['Permit'],
  stateit: ['createStore', 'createTestStore', 'withMock', 'shallowEqual', 'shallowMerge', 'Store'],
  validit: ['v'],
  wireit: [
    'createContainer',
    'createToken',
    'createTestContainer',
    'withMock',
    'Container',
    'CircularDependencyError',
    'ProviderNotFoundError',
    'AsyncProviderError',
  ],
} as const;

const TOOLKIT_CATEGORIES = [
  {
    name: 'Array',
    functions: [
      'aggregate',
      'alternate',
      'arrange',
      'chunk',
      'compact',
      'contains',
      'every',
      'filter',
      'find',
      'findIndex',
      'findLast',
      'flatten',
      'group',
      'list',
      'map',
      'pick',
      'reduce',
      'remoteList',
      'search',
      'select',
      'shift',
      'some',
      'sort',
      'substitute',
      'uniq',
    ],
  },
  {
    name: 'Object',
    functions: ['cache', 'clone', 'diff', 'entries', 'keys', 'merge', 'parseJSON', 'path', 'seek', 'values'],
  },
  {
    name: 'String',
    functions: ['camelCase', 'kebabCase', 'pascalCase', 'similarity', 'snakeCase', 'truncate'],
  },
  {
    name: 'Math',
    functions: [
      'abs',
      'add',
      'allocate',
      'average',
      'boil',
      'clamp',
      'distribute',
      'divide',
      'max',
      'median',
      'min',
      'multiply',
      'range',
      'rate',
      'round',
      'subtract',
      'sum',
    ],
  },
  { name: 'Date', functions: ['expires', 'interval', 'timeDiff'] },
  { name: 'Money', functions: ['currency', 'exchange'] },
  {
    name: 'Function',
    functions: [
      'assert',
      'assertParams',
      'attempt',
      'compare',
      'compareBy',
      'compose',
      'curry',
      'debounce',
      'delay',
      'fp',
      'memo',
      'once',
      'pipe',
      'proxy',
      'prune',
      'throttle',
      'worker',
    ],
  },
  {
    name: 'Async',
    functions: ['defer', 'delay', 'parallel', 'pool', 'predict', 'queue', 'race', 'retry', 'sleep', 'waitFor'],
  },
  {
    name: 'Typed',
    functions: [
      'ge',
      'gt',
      'is',
      'isArray',
      'isBoolean',
      'isDate',
      'isDefined',
      'isEmpty',
      'isEqual',
      'isEven',
      'isFunction',
      'isMatch',
      'isNegative',
      'isNil',
      'isNumber',
      'isObject',
      'isOdd',
      'isPositive',
      'isPrimitive',
      'isPromise',
      'isRegex',
      'isString',
      'isWithin',
      'isZero',
      'le',
      'lt',
      'typeOf',
    ],
  },
  { name: 'Random', functions: ['draw', 'random', 'shuffle', 'uuid'] },
] as const;

// ============================================================================
// State
// ============================================================================

const editorRef = ref<InstanceType<typeof REPLEditor> | null>(null);
const selectedLibrary = ref('toolkit');
const selectedExample = ref('');
const isExpanded = ref(false);
const isDark = ref(true);

// Constants exposed for template
const libraryDescriptions = LIBRARY_DESCRIPTIONS;

// ============================================================================
// Helper Functions
// ============================================================================

const getDefaultCode = (libName: string) => {
  const libExamples = examples[libName];
  const firstKey = libExamples ? Object.keys(libExamples)[0] : null;
  return firstKey ? libExamples[firstKey].code : '';
};

const syncTheme = () => {
  isDark.value = document.documentElement.classList.contains('dark');
};

const updateMonacoTypes = (libName: string) => {
  if (!window.monaco) return;

  monaco.languages.typescript.typescriptDefaults.setExtraLibs([]);
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    toolkitTypes,
    'file:///node_modules/@vielzeug/toolkit/index.d.ts',
  );

  if (libName !== 'toolkit' && libraryTypes[libName]) {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      libraryTypes[libName],
      `file:///node_modules/@vielzeug/${libName}/index.d.ts`,
    );
  }
};

const loadLibrary = async (libName: string) => {
  try {
    const loader = LIBRARY_LOADERS[libName];
    if (!loader) return;

    const module = await loader();
    window[libName] = module;
    Object.entries(module).forEach(([key, val]) => {
      window[key] = val;
    });
    updateMonacoTypes(libName);
  } catch (err) {
    console.error(`Failed to load ${libName}:`, err);
  }
};

const switchLibrary = () => {
  selectedExample.value = '';
  loadLibrary(selectedLibrary.value);
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const insertFunction = (item: string) => {
  editorRef.value?.insertTextAtCursor(item);
};

const onRunCode = () => {
  // Code execution is handled by REPLEditor
};

const onClearOutput = () => {
  // Output clearing is handled by REPLEditor
};

// ============================================================================
// Monaco & Editor Setup
// ============================================================================

const initializeREPL = () => {
  const script = document.createElement('script');
  script.src = `${MONACO_CDN}/loader.js`;
  script.onload = () => {
    require.config({ paths: { vs: MONACO_CDN } });

    (require as any)(['vs/editor/editor.main'], () => {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
      });

      updateMonacoTypes(selectedLibrary.value);

      // Initialize the REPLEditor component
      editorRef.value?.initializeEditor();
      loadLibrary(selectedLibrary.value);
    });
  };
  document.head.appendChild(script);
};

// ============================================================================
// Lifecycle Hooks
// ============================================================================

watch(() => selectedLibrary.value, switchLibrary);

onMounted(() => {
  initializeREPL();
  syncTheme();

  const observer = new MutationObserver(syncTheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  onBeforeUnmount(() => observer.disconnect());
});
</script>

<style scoped>
/* Library Grid */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.library-card {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
  padding: 1.25rem;
  border-radius: 16px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.library-card:hover,
.library-card.active {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

.library-card:hover {
  transform: translateY(-4px);
}

.library-card.active::after {
  content: '';
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 8px var(--vp-c-brand-1);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.lib-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.library-card:hover .card-icon {
  border-color: var(--vp-c-brand-1);
  transform: scale(1.1) rotate(5deg);
}

.library-card.active .card-icon {
  border-color: var(--vp-c-brand-1);
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.card-desc {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
  margin: 0;
}

/* REPL Layout - Expanded Mode Adjustments */
.is-expanded {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: var(--vp-c-bg);
  padding: 1rem;
  overflow: auto;
}

.is-expanded :deep(.repl-layout) {
  height: calc(100vh - 4rem);
  min-height: auto;
  max-height: calc(100vh - 4rem);
}

.is-expanded :deep(.editor-section),
.is-expanded :deep(.output-section) {
  height: 100%;
  max-height: calc(100vh - 2rem);
}

.is-expanded :deep(.code-editor),
.is-expanded :deep(.output-area) {
  height: calc(100vh - 8rem);
}
</style>
