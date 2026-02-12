<!-- eslint-disable no-undef -->
<template>
  <div id="repl-container" class="repl-container" :class="{ 'is-expanded': isExpanded }">
    <!-- Library Selector Card Grid -->
    <div class="library-grid">
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

    <div class="repl-layout">
      <!-- Code Editor -->
      <div class="editor-section">
        <div class="editor-header">
          <div class="header-title">
            <h3>Editor</h3>
          </div>
          <div class="header-actions">
            <select v-model="selectedExample" @change="loadExample" id="example-selector">
              <option value="">Choose an example...</option>
              <optgroup v-for="category in examplesByCategory" :key="category.name" :label="category.name">
                <option v-for="ex in category.examples" :key="ex.value" :value="ex.value">{{ ex.label }}</option>
              </optgroup>
            </select>
            <button @click="runCode" class="btn-primary btn-with-icon btn-run">
              <svg
                v-if="!isExecuting"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <svg
                v-else
                class="spinner"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>{{ isExecuting ? 'Running...' : 'Run' }}</span>
            </button>
            <button @click="toggleExpand" class="btn-icon expand-btn" :title="isExpanded ? 'Collapse' : 'Expand'">
              <svg
                v-if="!isExpanded"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="10" y1="14" x2="3" y2="21" />
              </svg>
            </button>
          </div>
        </div>
        <div class="editor-content-wrapper">
          <div ref="editorContainer" class="code-editor"></div>
          <div class="editor-floating-toolbar">
            <button @click="formatCode" class="btn-icon-alt" title="Format Code">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                version="1.1"
                id="svg8"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:svg="http://www.w3.org/2000/svg">
                <defs id="defs8" />
                <path
                  d="m 17.122614,2 5,5.0000001 L 7.1226139,22 2.1226137,17 Z"
                  id="path2"
                  style="stroke-width: 2.00057; stroke-dasharray: none" />
                <path d="M 15.981361,11.55223 12.594039,8.1175984" id="path1" />
              </svg>
            </button>
            <button @click="copyCode" class="btn-icon-alt" title="Copy to Clipboard">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
            <div class="toolbar-divider"></div>
            <button @click="resetEditor" class="btn-icon-alt" title="Reset to Default">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            <button @click="clearEditor" class="btn-icon-alt" title="Clear Editor">
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
                style="color: var(--vp-c-danger)">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Output -->
      <div class="output-section">
        <div class="output-header">
          <h3>Output</h3>
          <button @click="clearOutput" class="btn-icon" title="Clear Output">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          </button>
        </div>
        <div ref="outputContainer" class="output-area">
          <div class="output-placeholder">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <p>Ready to execute code...</p>
            <span>Press Run or Cmd+Enter to see results here</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Function Reference -->
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
          <input v-model="searchQuery" type="text" placeholder="Search exports..." class="search-input" />
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
              @click="insertFunction(fn)"
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
              @click="insertFunction(ex)"
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
          No exports found matching "{{ searchQuery }}"
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { examples } from './repl/examples';
import { libraryTypes, toolkitTypes } from './repl/types';

const editorContainer = ref(null);
const outputContainer = ref(null);
const selectedLibrary = ref('toolkit');
const selectedExample = ref('');
const isExpanded = ref(false);
const searchQuery = ref('');
const isDark = ref(true); // Default to dark, will sync on mount
let editor = null;
let currentLibraryModule = null;

// Library descriptions
const libraryDescriptions = {
  deposit: 'Type-safe local storage with schemas, expiration, and query building.',
  fetchit: 'Advanced HTTP client with caching, retries, and deduplication.',
  formit: 'Type-safe form state and validation for React and beyond.',
  i18nit: 'Internationalization library with TypeScript support.',
  logit: 'Beautiful console logging with styling and remote logging support.',
  permit: 'Role-based access control (RBAC) system for permissions.',
  stateit: 'Tiny, framework-agnostic state management with reactive subscriptions.',
  toolkit: 'A comprehensive utility library with functions for arrays, objects, and more.',
  validit: 'Type-safe schema validation with advanced error handling.',
  wireit: 'Lightweight dependency injection container with IoC principles.',
};

// Library loaders
const libraryLoaders = {
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
};

// Default code for each library
// Helper to get default code for a library from its examples
const getDefaultCode = (libName) => {
  const libExamples = examples[libName];
  if (libExamples) {
    const firstKey = Object.keys(libExamples)[0];
    if (firstKey) {
      return libExamples[firstKey].code;
    }
  }
  return '';
};

// Library exports reference
const libraryExports = ref({
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
});

// Toolkit categories
const toolkitCategories = [
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
  { name: 'String', functions: ['camelCase', 'kebabCase', 'pascalCase', 'similarity', 'snakeCase', 'truncate'] },
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
];

const filteredCategories = computed(() => {
  if (selectedLibrary.value !== 'toolkit') return [];

  if (!searchQuery.value) return toolkitCategories;

  const query = searchQuery.value.toLowerCase();
  return toolkitCategories
    .map((cat) => ({
      ...cat,
      functions: cat.functions.filter((fn) => fn.toLowerCase().includes(query)),
    }))
    .filter((cat) => cat.functions.length > 0);
});

const filteredExports = computed(() => {
  const exports = libraryExports.value[selectedLibrary.value] || [];
  if (!searchQuery.value) return exports;

  const query = searchQuery.value.toLowerCase();
  return exports.filter((ex) => ex.toLowerCase().includes(query));
});

const examplesByCategory = computed(() => {
  const libExamples = examples[selectedLibrary.value] || {};

  const grouped = {};
  Object.entries(libExamples).forEach(([key, value]) => {
    const category = key.split('-')[0] || 'Other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({
      label: value.name || key,
      value: key,
    });
  });

  return Object.entries(grouped).map(([name, exampleList]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    examples: exampleList,
  }));
});

const isMatch = (fn: string) => {
  if (!searchQuery.value) return false;
  return fn.toLowerCase().includes(searchQuery.value.toLowerCase());
};

// Watch library changes
watch(selectedLibrary, () => {
  switchLibrary();
});

onMounted(() => {
  initializeREPL();
  syncTheme();

  // Watch for VitePress theme changes
  const observer = new MutationObserver(() => syncTheme());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  onBeforeUnmount(() => {
    observer.disconnect();
  });
});

const syncTheme = () => {
  isDark.value = document.documentElement.classList.contains('dark');
  if (window.monaco) {
    monaco.editor.setTheme(isDark.value ? 'vs-dark' : 'vs');
  }
};

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose();
  }
});

const initializeREPL = () => {
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/monaco-editor@0.55.1/min/vs/loader.js';
  script.onload = () => {
    require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.55.1/min/vs' } });

    require(['vs/editor/editor.main'], function () {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
      });

      updateMonacoTypes(selectedLibrary.value);

      const urlParams = new URLSearchParams(window.location.search);
      const sharedCode = urlParams.get('code');
      let initialCode = getDefaultCode(selectedLibrary.value);

      if (sharedCode) {
        try {
          initialCode = atob(sharedCode);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          console.error('Failed to decode shared code', e);
        }
      } else {
        const savedCode = localStorage.getItem(`vielzeug-repl-code-${selectedLibrary.value}`);
        if (savedCode) {
          initialCode = savedCode;
        }
      }

      editor = monaco.editor.create(editorContainer.value, {
        value: initialCode,
        language: 'typescript',
        theme: isDark.value ? 'vs-dark' : 'vs',
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        runCode();
      });

      loadLibrary(selectedLibrary.value);
    });
  };
  document.head.appendChild(script);
};

const switchLibrary = () => {
  selectedExample.value = '';
  if (editor) {
    const savedCode = localStorage.getItem(`vielzeug-repl-code-${selectedLibrary.value}`);
    editor.setValue(savedCode || getDefaultCode(selectedLibrary.value));
  }
  clearOutput();
  loadLibrary(selectedLibrary.value);
};

const updateMonacoTypes = (libName) => {
  if (!window.monaco) return;

  // Clear existing libs
  monaco.languages.typescript.typescriptDefaults.setExtraLibs([]);

  // Add toolkit types (always available as dependency)
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    toolkitTypes,
    'file:///node_modules/@vielzeug/toolkit/index.d.ts',
  );

  // Add selected library types if different from toolkit
  if (libName !== 'toolkit' && libraryTypes[libName]) {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      libraryTypes[libName],
      `file:///node_modules/@vielzeug/${libName}/index.d.ts`,
    );
  }
};

const loadLibrary = async (libName: string) => {
  try {
    const loader = (libraryLoaders as any)[libName];
    if (!loader) return;
    const module = await loader();
    currentLibraryModule = module;
    window[libName] = module;
    // Also expose variables globally for easier usage in REPL
    Object.entries(module).forEach(([key, val]) => {
      window[key] = val;
    });
    updateMonacoTypes(libName);
  } catch (err) {
    console.error(`Failed to load ${libName}:`, err);
    if (outputContainer.value) {
      outputContainer.value.innerHTML = `<div style='color:#ef4444;font-weight:bold;padding:1em;'>Failed to load library: ${libName}<br>${err?.message || err}</div>`;
    }
  }
};

const runCode = () => {
  if (!editor) return;

  const code = editor.getValue();
  const output = outputContainer.value;

  output.innerHTML = '';

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const stringify = (item) => {
    if (item === undefined) return 'undefined';
    if (item === null) return 'null';
    if (typeof item === 'object') {
      try {
        if (item instanceof Date) return `Date(${item.toISOString()})`;
        if (item instanceof Error) return `Error: ${item.message}`;
        if (item instanceof RegExp) return String(item);
        return JSON.stringify(item, null, 2);
      } catch (e) {
        return String(item);
      }
    }
    if (typeof item === 'string') return `'${item}'`;
    return String(item);
  };

  const addOutput = (content: string[], type = 'log') => {
    const line = document.createElement('div');
    line.className = `output-line output-${type}`;

    if (type !== 'result') {
      const time = document.createElement('span');
      time.className = 'log-timestamp';
      time.textContent = new Date().toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      line.appendChild(time);
    }

    const text = document.createElement('span');
    text.className = 'log-text';
    text.textContent = type === 'result' ? `→ ${content.map(stringify).join(' ')}` : content.map(stringify).join(' ');
    line.appendChild(text);

    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  };

  console.log = (...args) => {
    addOutput(args, 'log');
  };

  console.error = (...args) => {
    addOutput(args, 'error');
  };

  console.warn = (...args) => {
    addOutput(args, 'warn');
  };

  try {
    let transformedCode = code;

    // Transform import statements for all libraries
    Object.keys(libraryLoaders).forEach((lib) => {
      transformedCode = transformedCode
        .replace(new RegExp(`import\\s*{([^}]+)}\\s*from\\s*['"]@vielzeug/${lib}['"]`, 'g'), (match, imports) => {
          const importList = imports.split(',').map((i) => i.trim());
          return `const { ${importList.join(', ')} } = window.${lib} || {}`;
        })
        .replace(
          new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s*from\\s*['"]@vielzeug/${lib}['"]`, 'g'),
          `const $1 = window.${lib} || {}`,
        );
    });

    if (transformedCode.includes('await')) {
      transformedCode = `(async () => { ${transformedCode} })()`;
    }

    const result = eval(transformedCode);

    if (result instanceof Promise) {
      result
        .then((res) => {
          if (res !== undefined) {
            addOutput(['→', res], 'result');
          }
        })
        .catch((err) => {
          addOutput(['Error:', err.message], 'error');
        });
    } else if (result !== undefined) {
      addOutput(['→', result], 'result');
    }
  } catch (error) {
    addOutput(['Error:', error.message], 'error');
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
};

const clearEditor = () => {
  if (editor) {
    editor.setValue('');
  }
};

const clearOutput = () => {
  if (outputContainer.value) {
    outputContainer.value.innerHTML = '';
  }
};

const loadExample = () => {
  if (
    selectedExample.value &&
    examples[selectedLibrary.value] &&
    examples[selectedLibrary.value][selectedExample.value] &&
    editor
  ) {
    const exampleCode = examples[selectedLibrary.value][selectedExample.value].code;
    editor.setValue(exampleCode);
    runCode();
  }
};

const formatCode = () => {
  if (editor) {
    editor.getAction('editor.action.formatDocument').run();
  }
};

const copyCode = () => {
  if (editor) {
    const code = editor.getValue();
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied to clipboard!');
    });
  }
};

const resetEditor = () => {
  if (editor && confirm('Are you sure you want to reset the editor to default?')) {
    editor.setValue(getDefaultCode(selectedLibrary.value));
    localStorage.removeItem(`vielzeug-repl-code-${selectedLibrary.value}`);
    runCode();
  }
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  if (editor) {
    setTimeout(() => {
      editor.layout();
    }, 100);
  }
};

const insertFunction = (item: string) => {
  if (editor) {
    const selection = editor.getSelection();
    const range = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn,
    );
    const text = item;
    editor.executeEdits('insert-function', [{ range: range, text: text, forceMoveMarkers: true }]);
    editor.focus();
  }
};
</script>

<style scoped>
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.library-card:hover {
  transform: translateY(-4px);
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.library-card.active {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 8px 16px var(--vp-c-default-soft);
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
  transition: all 0.3s ease;
}

.lib-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.library-card:hover .card-icon {
  border: 1px solid var(--vp-c-brand-1);
  color: white;
  transform: scale(1.1) rotate(5deg);
}

.library-card.active .card-icon {
  border: 1px solid var(--vp-c-brand-1);
  color: white;
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

.repl-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin: 1.5rem 0;
  min-height: 500px;
}

.editor-section,
.output-section {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  overflow: hidden;
  background: var(--vp-c-bg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.editor-section:hover,
.output-section:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.editor-header,
.output-header {
  background: var(--vp-c-bg-soft);
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 56px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-right: 1rem;
}

.editor-header h3,
.output-header h3 {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vp-c-text-2);
}

.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.save-indicator {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  transition: all 0.3s ease;
  opacity: 0.7;
}

.save-indicator.is-saving {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  opacity: 1;
}

.save-indicator span {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

#example-selector {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  outline: none;
  transition: all 0.2s ease;
  min-width: 180px;
}

#example-selector:hover {
  border-color: var(--vp-c-brand-1);
}

.btn-run {
  padding: 0.35rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  height: 32px;
}

.expand-btn {
  margin-left: 0.25rem;
  opacity: 0.6;
}

.expand-btn:hover {
  opacity: 1;
}

.editor-content-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-floating-toolbar {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--vp-c-bg-soft);
  backdrop-filter: blur(12px);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  opacity: 0.9;
  transition: all 0.2s ease;
}

.editor-floating-toolbar:hover {
  opacity: 1;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  border-color: var(--vp-c-brand-1);
}

.btn-icon-alt {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--vp-c-text-2);
  transition: all 0.2s ease;
  border: none;
  background: transparent;
  cursor: pointer;
}

.btn-icon-alt:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-brand-1);
}

.toolbar-divider {
  width: 1px;
  height: 14px;
  background: var(--vp-c-divider);
  margin: 0 0.25rem;
}

.spinner {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.shortcut-hint {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-alt);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-weight: 500;
  border: 1px solid var(--vp-c-divider);
  opacity: 0.8;
}

.btn-primary,
.btn-secondary,
.btn-icon {
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  background: transparent;
  color: var(--vp-c-text-2);
  border: 1px solid transparent;
}

.btn-icon:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-divider);
}

.btn-with-icon {
  gap: 0.5rem;
  padding: 0.5rem 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  color: white;
  box-shadow: 0 4px 12px var(--vp-c-brand-soft);
  border: none;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--vp-c-brand-soft);
}

.btn-run {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1.125rem 1rem;
}

.btn-primary:active {
  transform: translateY(0);
}

.repl-container.is-expanded {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: var(--vp-c-bg);
  padding: 2rem;
  margin: 0;
}

.is-expanded .repl-layout {
  height: calc(100vh - 160px);
  min-height: auto;
}

.is-expanded .editor-section,
.is-expanded .output-section {
  height: 70%;
}

.is-expanded .code-editor,
.is-expanded .output-area {
  height: calc(100% - 56px);
}

.is-expanded .reference-section {
  display: none;
}

#example-selector {
  padding: 0.325rem 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
  min-width: 200px;
}

#example-selector:focus {
  border-color: var(--vp-c-brand-1);
}

.code-editor {
  height: 450px;
  font-family: var(--vp-font-family-mono);
  background: var(--vp-code-bg);
}

.output-area {
  height: 450px;
  padding: 1.25rem;
  background: var(--vp-c-bg-alt);
  overflow-y: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  line-height: 1.6;
}

.reference-section {
  margin-top: 3rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: var(--vp-c-bg);
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
  transition: border-color 0.3s ease;
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
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  margin: 0 0 1rem 0;
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
  transition: all 0.2s;
}

.clickable-fn {
  cursor: pointer;
}

.clickable-fn:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.clickable-fn.is-match {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

:deep(.output-line) {
  margin: 0.4rem 0;
  padding: 0.2rem 0;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  opacity: 0.9;
}

:deep(.log-timestamp) {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  min-width: 70px;
  font-variant-numeric: tabular-nums;
}

:deep(.log-text) {
  word-break: break-all;
  white-space: pre-wrap;
}

:deep(.output-result .log-text) {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-size: 1rem;
}

:deep(.output-error) {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border-left: 4px solid #ef4444;
  margin: 1rem 0;
}

:deep(.output-warn) {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
  margin: 1rem 0;
}

:deep(.output-result) {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

:deep(.output-log) {
  color: var(--vp-c-text-1);
}

.output-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vp-c-text-3);
  text-align: center;
  gap: 0.75rem;
  opacity: 0.6;
  user-select: none;
}

.output-placeholder p {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}

.output-placeholder span {
  font-size: 0.8rem;
}

@media (max-width: 960px) {
  .repl-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    height: auto;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
    gap: 0.5rem;
  }

  #example-selector {
    flex: 1;
    min-width: 0;
  }

  .btn-run {
    flex-shrink: 0;
  }
}

@media (max-width: 480px) {
  .header-actions {
    flex-wrap: wrap;
  }

  #example-selector {
    width: 100%;
    order: 2;
  }

  .btn-run {
    order: 1;
    width: auto;
  }

  .expand-btn {
    order: 1;
  }
}
</style>
