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
      :arsenal-categories="ARSENAL_CATEGORIES"
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
import { libraryTypes, arsenalTypes } from './repl/types';

// ============================================================================
// Constants
// ============================================================================

const MONACO_CDN = 'https://unpkg.com/monaco-editor@0.55.1/min/vs';
const STORAGE_PREFIX = 'vielzeug-repl-code-';

const LIBRARY_DESCRIPTIONS = {
  arsenal: 'Utility library with functions for arrays, objects, and more.',
  clockwork: 'Typed finite state machines with guards, async invokes, and more.',
  coins: 'Currency formatting and exchange utilities for monetary arithmetic.',
  conduit: 'Lightweight dependency injection container with IoC principles.',
  courier: 'Advanced HTTP client with caching, retries, mutations, and more.',
  familiar: 'Web Worker pool abstraction with queuing, timeout, and more.',
  forge: 'Form state management with reactive fields and async validation.',
  grip: 'Drag-and-drop primitives with file filtering and more.',
  herald: 'Publish/Subscribe event bus with async support.',
  lingua: 'Internationalization library with TypeScript support.',
  orbit: 'Lightweight floating-element positioning for elements.',
  ripple: 'Reactive state based on signals, with stores, derived state, and more.',
  rune: 'Structured logger with level filtering, scoped namespaces, and more.',
  scroll: 'Virtual list engine for performant rendering of large datasets.',
  sourcerer: 'Reactive query sources with pagination and URL state sync.',
  spell: 'Type-safe schema validation with advanced error handling.',
  tempo: 'Timezone-aware date/time library built on Temporal.',
  vault: 'Storage with schemas, TTL, and query building.',
  ward: 'Role-based access control (RBAC) system for permissions.',
  wayfinder: 'Routing library with nested routes and middleware support.',
} as const;

const LIBRARY_LOADERS = {
  arsenal: () => import('@vielzeug/arsenal'),
  clockwork: () => import('@vielzeug/clockwork'),
  coins: () => import('@vielzeug/coins'),
  conduit: () => import('@vielzeug/conduit'),
  courier: () => import('@vielzeug/courier'),
  familiar: () => import('@vielzeug/familiar'),
  forge: () => import('@vielzeug/forge'),
  grip: () => import('@vielzeug/grip'),
  herald: () => import('@vielzeug/herald'),
  lingua: () => import('@vielzeug/lingua'),
  orbit: async () => {
    const [main, presetsModule] = await Promise.all([import('@vielzeug/orbit'), import('@vielzeug/orbit/presets')]);
    return { ...main, ...presetsModule };
  },
  ripple: () => import('@vielzeug/ripple'),
  rune: () => import('@vielzeug/rune'),
  scroll: () => import('@vielzeug/scroll'),
  sourcerer: () => import('@vielzeug/sourcerer'),
  spell: () => import('@vielzeug/spell'),
  tempo: () => import('@vielzeug/tempo'),
  vault: () => import('@vielzeug/vault'),
  ward: () => import('@vielzeug/ward'),
  wayfinder: () => import('@vielzeug/wayfinder'),
} as const;

const LIBRARY_EXPORTS = {
  vault: ['createLocalStorage', 'createIndexedDB', 'createMemory', 'createSessionStorage', 'table', 'ttl'],
  grip: ['createDropZone', 'createSortable', 'createSortableScope', 'applyReorder'],
  herald: ['createBus', 'BusDisposedError'],
  courier: ['createApi', 'createQuery', 'createMutation', 'createCourier', 'HttpError'],
  orbit: [
    'float',
    'computePosition',
    'computeOnce',
    'autoUpdate',
    'detectOverflow',
    'getSide',
    'getAlignment',
    'compose',
    'offset',
    'flip',
    'autoPlacement',
    'shift',
    'size',
    'arrow',
    'hide',
    'limitShift',
    'inline',
    'tooltip',
    'dropdown',
    'popover',
    'contextMenu',
  ],
  forge: ['FORM_ERROR', 'createForm', 'schemaValidator', 'toFormData'],
  lingua: ['createI18n'],
  rune: [
    'Rune',
    'createLogger',
    'lazy',
    'consoleTransport',
    'remoteTransport',
    'jsonTransport',
    'batchTransport',
    'sampleTransport',
    'redactTransport',
  ],
  clockwork: ['defineMachine', 'interpret', 'resolveTransition', 'assign', 'MachineError'],
  ward: ['createWard', 'owns', 'WILDCARD', 'ANONYMOUS'],
  wayfinder: ['createRouter', 'createBrowserHistory', 'createMemoryHistory', 'redirectTo', 'Router'],
  sourcerer: [
    'createLocalSource',
    'createRemoteSource',
    'subscribeSelector',
    'decodeLocalQueryParams',
    'encodeLocalQueryParams',
    'decodeRemoteQueryParams',
    'decodeRemoteQueryParamsStrict',
    'encodeRemoteQueryParams',
    'filterContains',
    'filterEquals',
    'filterRange',
    'sortBy',
  ],
  ripple: [
    'signal',
    'computed',
    'effect',
    'effectAsync',
    'watch',
    'batch',
    'untrack',
    'store',
    'readonly',
    'isSignal',
    'isComputed',
    'isStore',
    'onCleanup',
    'scope',
    'StateError',
  ],
  tempo: [
    'clamp',
    'classify',
    'dateRange',
    'difference',
    'endOf',
    'expires',
    'format',
    'formatDuration',
    'formatInstant',
    'formatParts',
    'formatRange',
    'formatRangeParts',
    'formatRelative',
    'formatZoned',
    'humanize',
    'isAfter',
    'isBefore',
    'isSame',
    'isValid',
    'now',
    'nowInstant',
    'parseDate',
    'parseDuration',
    'parseInstant',
    'parsePlainDate',
    'parsePlainDateTime',
    'parseZoned',
    'recurrence',
    'shift',
    'startOf',
    'timeDiff',
    'toInstant',
    'toZoned',
    'within',
  ],
  arsenal: [
    'chunk',
    'compact',
    'contains',
    'countBy',
    'difference',
    'drop',
    'dropLast',
    'filterMap',
    'first',
    'flatten',
    'groupBy',
    'indexBy',
    'intersection',
    'last',
    'partition',
    'replace',
    'rotate',
    'sample',
    'search',
    'sort',
    'take',
    'takeLast',
    'toggle',
    'union',
    'uniq',
    'unzip',
    'zip',
    'abortable',
    'attempt',
    'defer',
    'parallel',
    'queue',
    'retry',
    'sleep',
    'timeout',
    'waitFor',
    'Scheduler',
    'polyfillScheduler',
    'assert',
    'assertAll',
    'allOf',
    'anyOf',
    'noneOf',
    'compare',
    'compareBy',
    'compose',
    'constant',
    'curry',
    'debounce',
    'identity',
    'memo',
    'once',
    'partial',
    'pipe',
    'tap',
    'throttle',
    'abs',
    'allocate',
    'average',
    'clamp',
    'gcd',
    'lcm',
    'lerp',
    'linspace',
    'max',
    'median',
    'min',
    'mod',
    'normalize',
    'percent',
    'range',
    'round',
    'standardDeviation',
    'sum',
    'variance',
    'currency',
    'exchange',
    'stash',
    'deepClone',
    'defaults',
    'diff',
    'deepMerge',
    'shallowMerge',
    'entries',
    'filterValues',
    'fromEntries',
    'get',
    'has',
    'invert',
    'keys',
    'mapKeys',
    'mapValues',
    'omit',
    'parseJSON',
    'pick',
    'prune',
    'values',
    'draw',
    'random',
    'shuffle',
    'uuid',
    'camelCase',
    'endsWith',
    'escape',
    'kebabCase',
    'pad',
    'pascalCase',
    'similarity',
    'snakeCase',
    'startsWith',
    'titleCase',
    'truncate',
    'unescape',
    'words',
    'is',
    'isArray',
    'isBoolean',
    'isDate',
    'isDefined',
    'isEmpty',
    'isEqual',
    'isFunction',
    'isGreaterThan',
    'isGreaterThanOrEqual',
    'isLessThan',
    'isLessThanOrEqual',
    'isMatch',
    'isNil',
    'isNumber',
    'isObject',
    'isPrimitive',
    'isPromise',
    'isRegex',
    'isString',
    'isWithin',
    'typeOf',
  ],
  spell: ['s', 'ValidationError', 'ErrorCode', 'errorsAt', 'configure'],
  coins: [
    'money',
    'format',
    'formatParts',
    'exchange',
    'add',
    'subtract',
    'multiply',
    'divide',
    'allocate',
    'splitEvenly',
    'sum',
    'toDecimal',
    'toJSON',
    'fromJSON',
    'toCurrencyCode',
    'compare',
    'negate',
    'abs',
  ],
  scroll: ['createVirtualizer'],
  conduit: [
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
  familiar: ['createWorker', 'WorkerError'],
} as const;

const ARSENAL_CATEGORIES = [
  {
    name: 'Array',
    functions: [
      'chunk',
      'compact',
      'contains',
      'countBy',
      'difference',
      'drop',
      'dropLast',
      'filterMap',
      'first',
      'flatten',
      'groupBy',
      'indexBy',
      'intersection',
      'last',
      'partition',
      'replace',
      'rotate',
      'sample',
      'search',
      'sort',
      'take',
      'takeLast',
      'toggle',
      'union',
      'uniq',
      'unzip',
      'zip',
    ],
  },
  {
    name: 'Async',
    functions: [
      'abortable',
      'attempt',
      'defer',
      'parallel',
      'queue',
      'retry',
      'sleep',
      'timeout',
      'waitFor',
      'Scheduler',
      'polyfillScheduler',
    ],
  },
  {
    name: 'Function',
    functions: [
      'allOf',
      'anyOf',
      'assert',
      'assertAll',
      'compare',
      'compareBy',
      'compose',
      'constant',
      'curry',
      'debounce',
      'identity',
      'memo',
      'noneOf',
      'once',
      'partial',
      'pipe',
      'tap',
      'throttle',
    ],
  },
  {
    name: 'Math',
    functions: [
      'abs',
      'allocate',
      'average',
      'clamp',
      'gcd',
      'lcm',
      'lerp',
      'linspace',
      'max',
      'median',
      'min',
      'mod',
      'normalize',
      'percent',
      'range',
      'round',
      'standardDeviation',
      'sum',
      'variance',
    ],
  },
  { name: 'Money', functions: ['currency', 'exchange'] },
  {
    name: 'Object',
    functions: [
      'deepClone',
      'deepMerge',
      'defaults',
      'diff',
      'entries',
      'filterValues',
      'fromEntries',
      'get',
      'has',
      'invert',
      'keys',
      'mapKeys',
      'mapValues',
      'omit',
      'parseJSON',
      'pick',
      'prune',
      'shallowMerge',
      'stash',
      'values',
    ],
  },
  { name: 'Random', functions: ['draw', 'random', 'shuffle', 'uuid'] },
  {
    name: 'String',
    functions: [
      'camelCase',
      'endsWith',
      'escape',
      'kebabCase',
      'pad',
      'pascalCase',
      'similarity',
      'snakeCase',
      'startsWith',
      'titleCase',
      'truncate',
      'unescape',
      'words',
    ],
  },
  {
    name: 'Typed',
    functions: [
      'is',
      'isArray',
      'isBoolean',
      'isDate',
      'isDefined',
      'isEmpty',
      'isEqual',
      'isFunction',
      'isGreaterThan',
      'isGreaterThanOrEqual',
      'isLessThan',
      'isLessThanOrEqual',
      'isMatch',
      'isNil',
      'isNumber',
      'isObject',
      'isPrimitive',
      'isPromise',
      'isRegex',
      'isString',
      'isWithin',
      'typeOf',
    ],
  },
] as const;

// ============================================================================
// State
// ============================================================================

const editorRef = ref<InstanceType<typeof REPLEditor> | null>(null);
const selectedLibrary = ref('arsenal');
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
    arsenalTypes,
    'file:///node_modules/@vielzeug/arsenal/index.d.ts',
  );

  if (libName !== 'arsenal' && libraryTypes[libName]) {
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
