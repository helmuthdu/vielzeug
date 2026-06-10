<!-- eslint-disable no-undef -->
<template>
  <div id="repl-container" class="repl-container">
    <!-- IDE layout: sidebar + main -->
    <div class="ide-layout">
      <!-- Sidebar: library list -->
      <aside class="ide-sidebar">
        <div class="sidebar-header">
          <img :src="withBase(`/logo-${selectedLibrary}.svg`)" :alt="selectedLibrary" class="sidebar-active-logo" />
          <span class="sidebar-active-name">@vielzeug/<strong>{{ selectedLibrary }}</strong></span>
        </div>
        <nav class="sidebar-nav">
          <button
            v-for="(desc, lib) in libraryDescriptions"
            :key="lib"
            class="sidebar-item"
            :class="{ 'is-active': selectedLibrary === lib }"
            :title="desc"
            @click="selectedLibrary = lib; switchLibrary()">
            <img :src="withBase(`/logo-${lib}.svg`)" :alt="`${lib} logo`" class="sidebar-logo" />
            <span class="sidebar-info">
              <span class="sidebar-name">{{ lib }}</span>
              <span class="sidebar-desc">{{ desc }}</span>
            </span>
          </button>
        </nav>
        <div class="sidebar-ref">
          <REPLReference
            :selected-library="selectedLibrary"
            :arsenal-categories="ARSENAL_CATEGORIES"
            :library-exports="LIBRARY_EXPORTS"
            @insert-function="insertFunction" />
        </div>
      </aside>

      <!-- Main: editor + output -->
      <div class="ide-main">
        <REPLEditor
          ref="editorRef"
          :selected-library="selectedLibrary"
          :selected-example="selectedExample"
          :examples="examples"
          :is-dark="isDark"
          :get-default-code="getDefaultCode"
          :update-monaco-types="updateMonacoTypes"
          :storage-prefix="STORAGE_PREFIX"
          @update:selected-example="selectedExample = $event"
          @run-code="onRunCode"
          @clear-output="onClearOutput" />
      </div>
    </div>
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
  clockwork: ['defineMachine', 'interpret', 'resolveTransition', 'MachineError'],
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
/* ── IDE shell ─────────────────────────────────────────── */
.repl-container {
  --sidebar-w: 280px;
  overflow: hidden;
  background: var(--vp-c-bg);
  height: calc(100vh - var(--vp-nav-height, 64px));
}

.ide-layout {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  height: 100%;
}

.ide-main {
  min-width: 0;
  overflow: hidden;
}

/* ── Sidebar ───────────────────────────────────────────── */
.ide-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-alt);
  overflow: hidden;
  height: 100%;
  border-right: 1px solid var(--vp-c-divider);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
  background: var(--vp-c-bg-soft);
  height: 52px;
}

.sidebar-active-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

.sidebar-active-name {
  font-size: 0.8125rem;
  color: var(--vp-c-text-2);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-active-name strong {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.sidebar-nav {
  flex: 1 1 0;
  min-height: 120px;
  overflow-y: auto;
  padding: 0.375rem 0;
  scrollbar-width: thin;
  scrollbar-color: var(--vp-c-divider) transparent;
  border-bottom: 1px solid var(--vp-c-divider);
}

.sidebar-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.8125rem;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: color 0.15s, background 0.15s;
}

.sidebar-item:hover {
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 6%, transparent);
}

.sidebar-item.is-active {
  color: var(--vp-c-brand-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
  font-weight: 600;
}

.sidebar-item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  height: 60%;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--vp-c-brand-1);
}

.sidebar-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
  opacity: 0.8;
  margin-top: 1px;
}

.sidebar-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.sidebar-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.sidebar-item:not(.is-active) .sidebar-name {
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.sidebar-desc {
  font-size: 0.6875rem;
  color: var(--vp-c-text-3);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-item.is-active .sidebar-logo {
  opacity: 1;
}

.sidebar-ref {
  flex: 1 1 0;
  min-height: 200px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}


/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
  .ide-layout {
    grid-template-columns: 1fr;
  }

  .ide-sidebar {
    border-left: none;
    border-bottom: 1px solid var(--vp-c-divider);
    max-height: 180px;
  }

  .sidebar-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.5rem;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .sidebar-item {
    width: auto;
    padding: 0.3rem 0.625rem;
    border-radius: 6px;
  }

  .sidebar-item.is-active::before {
    display: none;
  }

  .ide-main {
    border-left: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-item {
    transition: none;
  }
}
</style>
