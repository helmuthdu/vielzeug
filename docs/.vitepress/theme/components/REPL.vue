<!-- eslint-disable no-undef -->
<template>
  <div id="repl-container" class="repl-container" :class="{ 'is-expanded': isExpanded }">
    <!-- Library Selector Card Grid -->
    <bit-grid v-if="!isExpanded" responsive gap="md" min-col-width="280px" style="margin-bottom: 2rem">
      <bit-card
        v-for="(desc, lib) in libraryDescriptions"
        :key="lib"
        interactive
        variant="flat"
        padding="md"
        :color="selectedLibrary === lib ? 'primary' : undefined"
        @click="
          selectedLibrary = lib;
          switchLibrary();
        ">
        <div class="lib-card-body">
          <div class="card-icon">
            <img :src="withBase(`/logo-${lib}.svg`)" :alt="`${lib} logo`" class="lib-logo" />
          </div>
          <div class="card-info">
            <span class="card-title">@vielzeug/{{ lib }}</span>
            <p class="card-desc">{{ desc }}</p>
          </div>
        </div>
      </bit-card>
    </bit-grid>

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
  craftit: 'Lightweight, type-safe web components with reactive state.',
  deposit: 'Storage with schemas, TTL, and query building.',
  dragit: 'Framework-agnostic drag-and-drop primitives with file filtering and more.',
  eventit: 'Publish/Subscribe event bus with async support.',
  fetchit: 'Advanced HTTP client with caching, retries, mutations, and more.',
  floatit: 'Lightweight floating-element positioning for elements.',
  formit: 'Form state management with reactive fields and async validation.',
  i18nit: 'Internationalization library with TypeScript support.',
  logit: 'Beautiful console logging with styling and remote logging support.',
  permit: 'Role-based access control (RBAC) system for permissions.',
  routeit: 'Client-side routing library with nested routes and middleware support.',
  stateit: 'Reactive state based on signals, with stores, derived state, and more.',
  timit: 'Timezone-aware date/time toolkit built on Temporal.',
  toolkit: 'Utility library with functions for arrays, objects, and more.',
  validit: 'Type-safe schema validation with advanced error handling.',
  virtualit: 'Virtual list engine for performant rendering of large datasets.',
  wireit: 'Lightweight dependency injection container with IoC principles.',
  workit: 'Web Worker pool abstraction with queuing, timeout, and more.',
} as const;

const LIBRARY_LOADERS = {
  craftit: () => import('@vielzeug/craftit'),
  deposit: () => import('@vielzeug/deposit'),
  dragit: () => import('@vielzeug/dragit'),
  eventit: () => import('@vielzeug/eventit'),
  fetchit: () => import('@vielzeug/fetchit'),
  floatit: () => import('@vielzeug/floatit'),
  formit: () => import('@vielzeug/formit'),
  i18nit: () => import('@vielzeug/i18nit'),
  logit: () => import('@vielzeug/logit'),
  permit: () => import('@vielzeug/permit'),
  routeit: () => import('@vielzeug/routeit'),
  stateit: () => import('@vielzeug/stateit'),
  timit: () => import('@vielzeug/timit'),
  toolkit: () => import('@vielzeug/toolkit'),
  validit: () => import('@vielzeug/validit'),
  virtualit: () => import('@vielzeug/virtualit'),
  wireit: () => import('@vielzeug/wireit'),
  workit: () => import('@vielzeug/workit'),
} as const;

const LIBRARY_EXPORTS = {
  craftit: [
    'define',
    'signal',
    'computed',
    'effect',
    'watch',
    'batch',
    'untrack',
    'readonly',
    'isSignal',
    'toValue',
    'html',
    'css',
    'prop',
    'defineProps',
    'ref',
    'refs',
    'provide',
    'inject',
    'createContext',
    'defineSlots',
    'defineEmits',
    'onMount',
    'onUnmount',
    'onUpdated',
    'onCleanup',
    'handle',
    'aria',
    'field',
  ],
  deposit: ['createLocalStorage', 'createIndexedDB', 'defineSchema', 'ttl', 'storeField'],
  dragit: ['createDropZone', 'createSortable'],
  eventit: ['createBus', 'BusDisposedError'],
  fetchit: ['createApi', 'createQuery', 'createMutation', 'HttpError', 'serializeKey'],
  floatit: ['positionFloat', 'computePosition', 'autoUpdate', 'offset', 'flip', 'shift', 'size'],
  formit: ['createForm', 'fromSchema', 'toFormData', 'FormValidationError', 'SubmitError'],
  i18nit: ['createI18n'],
  logit: ['Logit'],
  permit: ['createPermit', 'Permit', 'WILDCARD', 'ANONYMOUS'],
  routeit: ['createRouter', 'Router'],
  stateit: [
    'signal',
    'computed',
    'effect',
    'watch',
    'batch',
    'untrack',
    'store',
    'derived',
    'writable',
    'readonly',
    'isSignal',
    'isStore',
    'toValue',
    'nextValue',
    'shallowEqual',
    'onCleanup',
    'configureStateit',
  ],
  timit: [
    'Temporal',
    'd',
    'now',
    'asInstant',
    'asZoned',
    'add',
    'subtract',
    'diff',
    'within',
    'format',
    'formatRange',
  ],
  toolkit: [],
  validit: ['v', 'ValidationError', 'ErrorCode'],
  virtualit: ['createVirtualizer', 'Virtualizer'],
  wireit: [
    'createContainer',
    'createToken',
    'createTestContainer',
    'Container',
    'CircularDependencyError',
    'ProviderNotFoundError',
    'AsyncProviderError',
    'AliasCycleError',
    'ContainerDisposedError',
  ],
  workit: ['createWorker', 'WorkerError', 'TaskTimeoutError', 'TerminatedError', 'TaskError'],
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
/* Card body layout inside bit-card */
.lib-card-body {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 48px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--color-contrast-50);
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
}

.lib-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
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
