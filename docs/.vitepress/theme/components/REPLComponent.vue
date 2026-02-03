<template>
  <div id="repl-container" class="repl-container" :class="{ 'is-expanded': isExpanded }">
    <div class="repl-layout">
      <!-- Code Editor -->
      <div class="editor-section">
        <div class="editor-header">
          <div class="header-title">
            <h3>Editor</h3>
            <button @click="toggleExpand" class="btn-icon" :title="isExpanded ? 'Collapse' : 'Expand'">
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
          <div class="controls">
            <button @click="formatCode" class="btn-icon" title="Format Code">
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
                <path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2" />
                <path d="M12 7v10" />
                <path d="M8 11l4 4 4-4" />
              </svg>
            </button>
            <button @click="copyCode" class="btn-icon" title="Copy to Clipboard">
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
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
            <button @click="shareCode" class="btn-icon" title="Share Code">
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
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
              </svg>
            </button>
            <button @click="resetEditor" class="btn-icon" title="Reset to Default">
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
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            <button @click="clearEditor" class="btn-icon" title="Clear Editor">
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
            <button @click="runCode" class="btn-primary btn-with-icon">
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
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Run</span>
            </button>
            <select v-model="selectedExample" @change="loadExample" id="example-selector">
              <option value="">Choose an example...</option>
              <optgroup label="Array">
                <option value="array-chunk">chunk - Split array into chunks</option>
                <option value="array-filter">filter - Filter array elements</option>
                <option value="array-map">map - Transform array elements</option>
                <option value="array-group">group - Group array by key</option>
                <option value="array-sort">sort - Sort array</option>
                <option value="array-alternate">alternate - Alternate arrays</option>
              </optgroup>
              <optgroup label="Object">
                <option value="object-merge">merge - Deep merge objects</option>
                <option value="object-clone">clone - Deep clone object</option>
                <option value="object-path">path - Get nested value</option>
                <option value="object-diff">diff - Compare objects</option>
              </optgroup>
              <optgroup label="String">
                <option value="string-camelcase">camelCase - Convert to camelCase</option>
                <option value="string-kebabcase">kebabCase - Convert to kebab-case</option>
                <option value="string-truncate">truncate - Truncate string</option>
              </optgroup>
              <optgroup label="Math">
                <option value="math-average">average - Calculate average</option>
                <option value="math-clamp">clamp - Clamp number</option>
                <option value="math-range">range - Generate number range</option>
              </optgroup>
              <optgroup label="Date">
                <option value="date-expires">expires - Check if date expired</option>
                <option value="date-timediff">timeDiff - Calculate time difference</option>
              </optgroup>
              <optgroup label="Function">
                <option value="function-debounce">debounce - Debounce function</option>
                <option value="function-throttle">throttle - Throttle function</option>
                <option value="function-pipe">pipe - Compose functions</option>
              </optgroup>
              <optgroup label="Typed">
                <option value="typed-is">is - General type check</option>
                <option value="typed-ismatch">isMatch - Pattern match</option>
                <option value="typed-isarray">isArray - Check if array</option>
                <option value="typed-isempty">isEmpty - Check if empty</option>
                <option value="typed-isequal">isEqual - Deep equality check</option>
              </optgroup>
              <optgroup label="Random">
                <option value="random-utils">random - Random utilities</option>
                <option value="random-draw">draw - Draw random element</option>
              </optgroup>
            </select>
          </div>
        </div>
        <div ref="editorContainer" class="code-editor"></div>
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
        <div ref="outputContainer" class="output-area"></div>
      </div>
    </div>

    <!-- Function Reference -->
    <div class="reference-section">
      <div class="reference-header">
        <h3>Available Functions</h3>
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
          <input v-model="searchQuery" type="text" placeholder="Search functions..." class="search-input" />
        </div>
      </div>
      <div class="function-categories">
        <div v-for="category in filteredCategories" :key="category.name" class="category">
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
        <div v-if="filteredCategories.length === 0" class="no-results">
          No functions found matching "{{ searchQuery }}"
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import * as toolkit from '../../../../packages/toolkit/src/index';
import { examples } from './repl/examples';
import { toolkitTypes } from './repl/types';

const editorContainer = ref(null);
const outputContainer = ref(null);
const selectedExample = ref('');
const isExpanded = ref(false);
const searchQuery = ref('');

const DEFAULT_CODE = `// Welcome to the Vielzeug REPL!
// All toolkit functions are available globally.
// Try some examples:

import { chunk, map, filter } from '@vielzeug/toolkit'

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Split into chunks of 3
const chunks = chunk(numbers, 3)
console.log('Chunks:', chunks)

// Filter even numbers and double them
const evenDoubled = map(filter(numbers, n => n % 2 === 0), n => n * 2)
console.log('Even numbers doubled:', evenDoubled)

// Try more functions!
`;

// Group toolkit functions by category for the reference section
const categories = [
  {
    name: 'Array',
    functions: [
      'aggregate',
      'alternate',
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
      'search',
      'select',
      'shift',
      'some',
      'sort',
      'sortBy',
      'substitute',
      'uniq',
    ],
  },
  {
    name: 'Object',
    functions: ['clone', 'diff', 'entries', 'keys', 'merge', 'parseJSON', 'path', 'seek', 'values'],
  },
  {
    name: 'String',
    functions: ['camelCase', 'kebabCase', 'pascalCase', 'similarity', 'snakeCase', 'truncate'],
  },
  {
    name: 'Math',
    functions: ['average', 'boil', 'clamp', 'max', 'median', 'min', 'range', 'rate', 'round', 'sum'],
  },
  {
    name: 'Date',
    functions: ['expires', 'interval', 'timeDiff'],
  },
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
      'predict',
      'proxy',
      'retry',
      'sleep',
      'throttle',
      'worker',
    ],
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
  {
    name: 'Random',
    functions: ['draw', 'random', 'shuffle', 'uuid'],
  },
];

const allExportedFunctions = Object.keys(toolkit);
const categorizedFunctions = categories.flatMap((c) => c.functions);
const missingFunctions = allExportedFunctions.filter((f) => !categorizedFunctions.includes(f) && f !== 'default');

if (missingFunctions.length > 0) {
  console.warn(
    'The following functions are exported from the toolkit but not categorized in the REPL:',
    missingFunctions,
  );
}

const filteredCategories = computed(() => {
  if (!searchQuery.value) return categories;

  const query = searchQuery.value.toLowerCase();
  return categories
    .map((cat) => ({
      ...cat,
      functions: cat.functions.filter((fn) => fn.toLowerCase().includes(query)),
    }))
    .filter((cat) => cat.functions.length > 0);
});

const isMatch = (fn) => {
  if (!searchQuery.value) return false;
  return fn.toLowerCase().includes(searchQuery.value.toLowerCase());
};

let editor = null;

onMounted(() => {
  initializeREPL();
});

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose();
  }
});

const initializeREPL = () => {
  // Load Monaco Editor
  window.toolkit = toolkit;
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/monaco-editor@0.55.1/min/vs/loader.js';
  script.onload = () => {
    require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.55.1/min/vs' } });

    require(['vs/editor/editor.main'], function () {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        toolkitTypes,
        'file:///node_modules/@vielzeug/toolkit/index.d.ts',
      );

      // Check for code in URL first, then localStorage, then default
      const urlParams = new URLSearchParams(window.location.search);
      const sharedCode = urlParams.get('code');
      let initialCode = DEFAULT_CODE;

      if (sharedCode) {
        try {
          initialCode = atob(sharedCode);
          // Clear URL to avoid carrying it around
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          console.error('Failed to decode shared code', e);
        }
      } else {
        const savedCode = localStorage.getItem('vielzeug-repl-code');
        if (savedCode) {
          initialCode = savedCode;
        }
      }

      // Create editor
      editor = monaco.editor.create(editorContainer.value, {
        value: initialCode,
        language: 'typescript',
        theme: 'vs-dark',
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      // Save to localStorage on change
      editor.onDidChangeModelContent(() => {
        localStorage.setItem('vielzeug-repl-code', editor.getValue());
      });

      // Auto-run on Ctrl+Enter
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        runCode();
      });
    });
  };
  document.head.appendChild(script);

  // Load toolkit library dynamically
  const toolkitScript = document.createElement('script');
  toolkitScript.type = 'module';
  toolkitScript.textContent = `
    import * as toolkit from 'https://unpkg.com/@vielzeug/toolkit@latest/dist/index.js'
    window.toolkit = toolkit
    // Make all functions globally available
    Object.assign(window, toolkit)
  `;
  document.head.appendChild(toolkitScript);
};

const runCode = () => {
  if (!editor) return;

  const code = editor.getValue();
  const output = outputContainer.value;

  // Clear previous output
  output.innerHTML = '';

  // Capture console output
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const stringify = (item) => {
    if (item === undefined) return 'undefined';
    if (item === null) return 'null';
    if (typeof item === 'object') {
      try {
        // Handle Date objects
        if (item instanceof Date) return `Date(${item.toISOString()})`;
        // Handle Error objects
        if (item instanceof Error) return `Error: ${item.message}`;
        // Handle RegEx
        if (item instanceof RegExp) return String(item);

        return JSON.stringify(item, null, 2);
      } catch (e) {
        return String(item);
      }
    }
    if (typeof item === 'string') return `'${item}'`;
    return String(item);
  };

  const addOutput = (content, type = 'log') => {
    const line = document.createElement('div');
    line.className = `output-line output-${type}`;
    line.textContent = content.map(stringify).join(' ');

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
    // Transform import statements to use global toolkit
    let transformedCode = code
      .replace(/import\s*{([^}]+)}\s*from\s*['"]@vielzeug\/toolkit['"]/g, (match, imports) => {
        const importList = imports.split(',').map((i) => i.trim());
        return `const { ${importList.join(', ')} } = window.toolkit || {}`;
      })
      .replace(/import\s*\*\s*as\s+(\w+)\s*from\s*['"]@vielzeug\/toolkit['"]/g, 'const $1 = window.toolkit || {}');

    // Use a self-invoking async function to support top-level await if needed
    if (transformedCode.includes('await')) {
      transformedCode = `(async () => { ${transformedCode} })()`;
    }

    // Execute the code
    const result = eval(transformedCode);

    // If it's a promise (from the async wrapper), handle it
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
    // Restore console
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
  if (selectedExample.value && examples[selectedExample.value] && editor) {
    editor.setValue(examples[selectedExample.value]);
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

const shareCode = () => {
  if (editor) {
    const code = editor.getValue();
    const encoded = btoa(code);
    const url = new URL(window.location.href);
    url.searchParams.set('code', encoded);
    navigator.clipboard.writeText(url.toString()).then(() => {
      alert('Shareable URL copied to clipboard!');
    });
  }
};

const resetEditor = () => {
  if (editor && confirm('Are you sure you want to reset the editor to default?')) {
    editor.setValue(DEFAULT_CODE);
    localStorage.removeItem('vielzeug-repl-code');
    runCode();
  }
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  // Trigger layout recalculation for Monaco
  if (editor) {
    setTimeout(() => {
      editor.layout();
    }, 100);
  }
};

const insertFunction = (fnName) => {
  if (editor) {
    const selection = editor.getSelection();
    const range = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.endLineNumber,
      selection.endColumn,
    );
    const text = `${fnName}()`;
    editor.executeEdits('insert-function', [{ range: range, text: text, forceMoveMarkers: true }]);
    editor.focus();
  }
};
</script>

<style scoped>
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
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.editor-section:hover,
.output-section:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
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
  background: var(--vp-c-brand-1);
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.btn-secondary:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand-1);
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
  height: 100%;
}

.is-expanded .code-editor,
.is-expanded .output-area {
  height: calc(100% - 56px);
}

.is-expanded .reference-section {
  display: none;
}

#example-selector {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
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
  border-radius: 12px;
  background: var(--vp-c-bg);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
  margin: 0.75rem 0;
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
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

@media (max-width: 960px) {
  .repl-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .controls {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  #example-selector {
    width: 100%;
    order: 10;
  }
}
</style>
