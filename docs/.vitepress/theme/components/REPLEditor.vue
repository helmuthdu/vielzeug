<template>
  <bit-grid cols-md="2" cols="1" areas-md="'editor output'" areas="'editor' 'output'" gap="lg" fullwidth align="start"
    style="margin: 0.5rem 0; min-height: 500px">
    <!-- Code Editor -->
    <div class="editor-section" style="grid-area: editor">
      <bit-grid areas="'title selector actions'" style="grid-template-columns: auto 1fr" align="center" gap="md"
        class="section-header">
        <h3 class="section-label" style="grid-area: title">Editor</h3>
        <div class="header-actions" style="grid-area: selector">
          <bit-select fullwidth placeholder="Examples..." :value="localSelectedExample" @change="handleExampleSelect">
            <optgroup v-for="category in examplesByCategory" :key="category.name" :label="category.name">
              <option v-for="ex in category.examples" :key="ex.value" :value="ex.value">{{ ex.label }}</option>
            </optgroup>
          </bit-select>
        </div>
        <div class="header-actions" style="grid-area: actions">
          <bit-grid cols="1" justify="end" gap="md" flow="column">
            <bit-grid-item>
              <bit-button color="primary" variant="solid" v-bind="isExecuting ? { loading: true } : {}"
                @click="handleRunCode">
                <svg v-if="!isExecuting" slot="prefix" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run
              </bit-button>
            </bit-grid-item>
            <bit-grid-item>
              <bit-tooltip :content="isExpanded ? 'Collapse' : 'Expand'" placement="bottom">
                <bit-button icon-only variant="ghost" @click="emit('toggle-expand')">
                  <svg v-if="!isExpanded" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="10" y1="14" x2="3" y2="21" />
                  </svg>
                </bit-button>
              </bit-tooltip>
            </bit-grid-item>
          </bit-grid>
        </div>
      </bit-grid>
      <div class="editor-content-wrapper">
        <div ref="editorContainer" class="code-editor"></div>
        <div class="editor-floating-toolbar">
          <bit-tooltip content="Format Code" placement="top">
            <bit-button icon-only variant="ghost" size="sm" @click="formatCode">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" version="1.1" id="svg8"
                xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
                <defs id="defs8" />
                <path d="m 17.122614,2 5,5.0000001 L 7.1226139,22 2.1226137,17 Z" id="path2"
                  style="stroke-width: 2.00057; stroke-dasharray: none" />
                <path d="M 15.981361,11.55223 12.594039,8.1175984" id="path1" />
              </svg>
            </bit-button>
          </bit-tooltip>
          <bit-tooltip content="Copy to Clipboard" placement="top">
            <bit-button icon-only variant="ghost" size="sm" @click="copyCode">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </bit-button>
          </bit-tooltip>
          <bit-separator orientation="vertical" style="height: 14px; margin: 0 0.25rem"></bit-separator>
          <bit-tooltip content="Reset to Default" placement="top">
            <bit-button icon-only variant="ghost" size="sm" @click="resetEditor">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </bit-button>
          </bit-tooltip>
          <bit-tooltip content="Clear Editor" placement="top">
            <bit-button icon-only variant="ghost" size="sm" color="error" @click="clearEditor">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
            </bit-button>
          </bit-tooltip>
        </div>
      </div>
    </div>

    <!-- Output -->
    <div class="output-section" style="grid-area: output">
      <bit-grid areas="'title actions'" style="grid-template-columns: auto 1fr" align="center" gap="sm"
        class="section-header">
        <h3 class="section-label" style="grid-area: title">Output</h3>
        <div style="grid-area: actions; display: flex; justify-content: flex-end">
          <bit-tooltip content="Clear Output" placement="bottom">
            <bit-button icon-only variant="ghost" @click="handleClearOutput">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
            </bit-button>
          </bit-tooltip>
        </div>
      </bit-grid>
      <div ref="outputContainer" class="output-area">
        <div class="output-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <p>Ready to execute code...</p>
          <span>Press Run or Cmd+Enter to see results here</span>
        </div>
      </div>
    </div>
  </bit-grid>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

// ============================================================================
// Props & Emits
// ============================================================================

const props = defineProps<{
  selectedLibrary: string;
  selectedExample: string;
  isExpanded: boolean;
  examples: Record<string, any>;
  isDark: boolean;
  getDefaultCode: (libName: string) => string;
  updateMonacoTypes: (libName: string) => void;
  storagePrefix: string;
}>();

const emit = defineEmits<{
  'update:selectedExample': [value: string];
  'toggle-expand': [];
  'run-code': [];
  'clear-output': [];
}>();

// ============================================================================
// State
// ============================================================================

const editorContainer = ref<HTMLElement | null>(null);
const outputContainer = ref<HTMLElement | null>(null);
const isExecuting = ref(false);
const localSelectedExample = ref(props.selectedExample);

let editor: any = null;
let lastCursorPosition: any = null; // Track last cursor position
let consoleIntercepted = false;
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
};

// ============================================================================
// Computed Properties
// ============================================================================

const examplesByCategory = computed(() => {
  const libExamples = props.examples[props.selectedLibrary] || {};
  const grouped: Record<string, any[]> = {};

  for (const [key, value] of Object.entries(libExamples)) {
    const category = key.split('-')[0] || 'Other';
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({ label: (value as any).name || key, value: key });
  }

  return Object.entries(grouped).map(([name, exampleList]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    examples: exampleList,
  }));
});

// ============================================================================
// Watchers
// ============================================================================

watch(
  () => props.selectedExample,
  (newVal) => {
    localSelectedExample.value = newVal;
  },
);

watch(localSelectedExample, (newVal) => {
  if (newVal) loadExample();
});

watch(
  () => props.selectedLibrary,
  () => {
    localSelectedExample.value = '';
    if (editor) {
      const savedCode = localStorage.getItem(`${props.storagePrefix}${props.selectedLibrary}`);
      editor.setValue(savedCode || props.getDefaultCode(props.selectedLibrary));
    }
    handleClearOutput();
  },
);

watch(
  () => props.isDark,
  (newVal) => {
    if (window.monaco && editor) {
      monaco.editor.setTheme(newVal ? 'vs-dark' : 'vs');
    }
  },
);

// ============================================================================
// Helper Functions
// ============================================================================

const stringify = (item: unknown) => {
  if (item === undefined) return 'undefined';
  if (item === null) return 'null';
  if (typeof item === 'string') return `'${item}'`;
  if (typeof item === 'object') {
    try {
      if (item instanceof Date) return `Date(${item.toISOString()})`;
      if (item instanceof Error) return `Error: ${item.message}`;
      if (item instanceof RegExp) return String(item);
      return JSON.stringify(item, null, 2);
    } catch {
      return String(item);
    }
  }
  return String(item);
};

const createOutputLine = (content: string[], type: 'log' | 'error' | 'warn' | 'result') => {
  const output = outputContainer.value;
  if (!output) {
    console.warn('Output container not found');
    return;
  }

  const line = document.createElement('div');
  line.className = `output-line output-${type}`;

  if (type !== 'result') {
    const time = document.createElement('span');
    time.className = 'log-timestamp';
    time.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
    line.appendChild(time);
  }

  const icon = document.createElement('span');
  icon.className = 'log-icon';
  icon.textContent = type === 'log' ? '▸' : type === 'error' ? '✖' : type === 'warn' ? '⚠' : '→';
  line.appendChild(icon);

  const contentSpan = document.createElement('span');
  contentSpan.className = 'log-content';
  contentSpan.textContent = content.join(' ');
  line.appendChild(contentSpan);

  // Check for placeholder - use querySelector to avoid whitespace text node issues
  const placeholder = output.querySelector('.output-placeholder');
  if (placeholder) {
    output.innerHTML = '';
  }

  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
};

const interceptConsole = () => {
  if (consoleIntercepted) return;
  consoleIntercepted = true;

  console.log = (...args) => {
    createOutputLine(args.map(stringify), 'log');
    originalConsole.log(...args);
  };
  console.error = (...args) => {
    createOutputLine(args.map(stringify), 'error');
    originalConsole.error(...args);
  };
  console.warn = (...args) => {
    createOutputLine(args.map(stringify), 'warn');
    originalConsole.warn(...args);
  };
};

const restoreConsole = () => {
  if (!consoleIntercepted) return;
  consoleIntercepted = false;
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
};

// ============================================================================
// Editor Actions
// ============================================================================

const handleRunCode = async () => {
  // This should ALWAYS log when Run is clicked
  console.log('🎯 RUN BUTTON CLICKED - handleRunCode executing');
  console.log('Editor exists:', !!editor);
  console.log('Output container exists:', !!outputContainer.value);

  if (!editor) {
    originalConsole.warn('Editor not initialized');
    if (outputContainer.value) {
      createOutputLine(['⚠️ Editor not initialized'], 'error');
    }
    return;
  }

  originalConsole.log('🚀 Running code...');
  isExecuting.value = true;

  // Clear output first
  handleClearOutput();

  // Intercept console
  interceptConsole();

  try {
    let code = editor.getValue();
    originalConsole.log('📝 Original code:', code);

    // Check if code is empty
    if (!code || code.trim() === '') {
      createOutputLine(['⚠️ No code to execute'], 'warn');
      setTimeout(() => {
        isExecuting.value = false;
        restoreConsole();
      }, 100);
      emit('run-code');
      return;
    }

    localStorage.setItem(`${props.storagePrefix}${props.selectedLibrary}`, code);

    // Transform import statements to use global variables
    // Example: import { Deposit } from '@vielzeug/deposit' -> const { Deposit } = window.deposit || {}
    code = code.replace(/import\s+{([^}]+)}\s+from\s+['"]@vielzeug\/([^'"]+)['"]/g, (match, imports, libName) => {
      // Clean up imports and create a destructuring assignment
      const cleanImports = imports.trim();
      return `const { ${cleanImports} } = window.${libName} || window || {}`;
    });

    // Also handle default imports: import Lib from '@vielzeug/lib' -> const Lib = window.lib
    code = code.replace(/import\s+(\w+)\s+from\s+['"]@vielzeug\/([^'"]+)['"]/g, (match, defaultImport, libName) => {
      return `const ${defaultImport} = window.${libName}`;
    });

    // Remove any remaining import statements that might not be @vielzeug
    code = code.replace(/import\s+.+\s+from\s+['"][^'"]+['"]\s*;?\s*/g, '');

    originalConsole.log('🔄 Transformed code:', code);
    originalConsole.log('🌍 Available globals:', {
      [props.selectedLibrary]: window[props.selectedLibrary] ? '✅' : '❌',
    });

    // Create function with access to window globals
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
    const fn = new AsyncFunction(code);
    const result = await fn.call(window);

    originalConsole.log('✅ Execution result:', result);

    if (result !== undefined) {
      createOutputLine([stringify(result)], 'result');
    }
  } catch (err: any) {
    // Better error reporting
    const errorMessage = err?.stack || err?.message || String(err);
    createOutputLine([errorMessage], 'error');
    originalConsole.error('❌ Code execution error:', err);
  } finally {
    setTimeout(() => {
      isExecuting.value = false;
      restoreConsole();
    }, 100);
  }

  emit('run-code');
};

const formatCode = async () => {
  if (!editor) return;
  await editor.getAction('editor.action.formatDocument')?.run();
};

const copyCode = async () => {
  if (!editor) return;
  const code = editor.getValue();
  try {
    await navigator.clipboard.writeText(code);
  } catch (err) {
    console.error('Failed to copy code', err);
  }
};

const resetEditor = () => {
  if (!editor) return;
  const defaultCode = props.getDefaultCode(props.selectedLibrary);
  editor.setValue(defaultCode);
  localStorage.setItem(`${props.storagePrefix}${props.selectedLibrary}`, defaultCode);
};

const clearEditor = () => {
  if (!editor) return;
  editor.setValue('');
  localStorage.removeItem(`${props.storagePrefix}${props.selectedLibrary}`);
};

const handleClearOutput = () => {
  if (!outputContainer.value) return;
  outputContainer.value.innerHTML = `
    <div class="output-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
      <p>Ready to execute code...</p>
      <span>Press Run or Cmd+Enter to see results here</span>
    </div>
  `;
  emit('clear-output');
};

const handleExampleSelect = (e: Event) => {
  const detail = (e as CustomEvent<{ value: string }>).detail;
  localSelectedExample.value = detail?.value ?? '';
};

const loadExample = () => {
  if (!editor || !localSelectedExample.value) return;

  const libExamples = props.examples[props.selectedLibrary];
  const example = libExamples?.[localSelectedExample.value];

  if (example?.code) {
    editor.setValue(example.code);
    localStorage.setItem(`${props.storagePrefix}${props.selectedLibrary}`, example.code);
  }

  emit('update:selectedExample', localSelectedExample.value);
};

// ============================================================================
// Monaco Editor Setup
// ============================================================================

const initializeEditor = () => {
  if (!editorContainer.value || !window.monaco) return;

  const initialCode = getInitialCode();
  editor = monaco.editor.create(editorContainer.value, {
    value: initialCode,
    language: 'typescript',
    theme: props.isDark ? 'vs-dark' : 'vs',
    fontSize: 14,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleRunCode);

  // Track cursor position changes
  editor.onDidChangeCursorPosition((e: any) => {
    lastCursorPosition = e.position;
  });

  // Store cursor position when editor loses focus
  editor.onDidBlurEditorText(() => {
    const position = editor.getPosition();
    if (position) {
      lastCursorPosition = position;
    }
  });

  // Initialize the last cursor position
  const position = editor.getPosition();
  if (position) {
    lastCursorPosition = position;
  }

  // Prevent VitePress command menu from appearing when typing "/" in the editor
  // Listen for keydown events on the editor DOM node
  const editorDomNode = editor.getDomNode();
  if (editorDomNode) {
    editorDomNode.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        // Stop propagation for the "/" key to prevent VitePress command menu
        if (e.key === '/' || e.code === 'Slash') {
          e.stopPropagation();
        }
        // Also prevent other VitePress shortcuts when the editor is focused
        // Ctrl/Cmd + K (command palette)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.stopPropagation();
        }
      },
      true,
    ); // Use the capture phase to intercept before VitePress
  }
};

const getInitialCode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sharedCode = urlParams.get('code');

  if (sharedCode) {
    try {
      const decoded = atob(sharedCode);
      window.history.replaceState({}, document.title, window.location.pathname);
      return decoded;
    } catch (e) {
      console.error('Failed to decode shared code', e);
    }
  }

  const savedCode = localStorage.getItem(`${props.storagePrefix}${props.selectedLibrary}`);
  return savedCode || props.getDefaultCode(props.selectedLibrary);
};

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  if (window.monaco) {
    initializeEditor();
  }
});

onBeforeUnmount(() => {
  restoreConsole();
  if (editor) {
    editor.dispose();
    editor = null;
  }
});

// ============================================================================
// Expose Methods
// ============================================================================

const insertTextAtCursor = (text: string) => {
  if (!editor || !window.monaco) return;

  // Use last known cursor position if available, otherwise get current
  const position = lastCursorPosition || editor.getPosition();
  if (!position) return;

  // Create a range at the cursor position
  const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);

  // Execute the edit
  editor.executeEdits('insert-text', [
    {
      range,
      text,
      forceMoveMarkers: true,
    },
  ]);

  // Calculate new cursor position after insertion
  const newPosition = {
    lineNumber: position.lineNumber,
    column: position.column + text.length,
  };

  // Set cursor to new position and reveal it
  editor.setPosition(newPosition);
  editor.revealPositionInCenter(newPosition);

  // Update last cursor position
  lastCursorPosition = newPosition;

  // Focus the editor
  editor.focus();
};

defineExpose({
  initializeEditor,
  getEditor: () => editor,
  clearOutput: handleClearOutput,
  insertTextAtCursor,
});
</script>

<style scoped>
/* REPL Layout */
.editor-section,
.output-section {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  overflow: hidden;
  background: var(--vp-c-bg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  transition:
    border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.editor-section:hover,
.output-section:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

/* Headers */
.section-header {
  background: var(--vp-c-bg-soft);
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--vp-c-divider);
  min-height: 56px;
}

.section-label {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--vp-c-text-2);
  white-space: nowrap;
}

/* Editor & Output Areas */
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
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
  opacity: 0.9;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.editor-floating-toolbar:hover {
  opacity: 1;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  border-color: var(--vp-c-brand-1);
}

.code-editor,
.output-area {
  height: 450px;
  font-family: var(--vp-font-family-mono);
}

.code-editor {
  background: var(--vp-code-bg);
}

.output-area {
  padding: 1.25rem;
  background: var(--vp-c-bg-alt);
  overflow-y: auto;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Output Styles - for dynamically created DOM elements */
.output-area :deep(.output-line) {
  margin: 0.4rem 0;
  padding: 0.2rem 0;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  opacity: 0.9;
}

.output-area :deep(.log-timestamp) {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  min-width: 70px;
  font-variant-numeric: tabular-nums;
}

.output-area :deep(.log-icon) {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  min-width: 16px;
  text-align: center;
}

.output-area :deep(.log-content) {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
  color: var(--vp-c-text-1);
}

.output-area :deep(.log-text) {
  word-break: break-all;
  white-space: pre-wrap;
}

.output-area :deep(.output-result .log-text) {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-size: 1rem;
}

.output-area :deep(.output-error),
.output-area :deep(.output-warn) {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.output-area :deep(.output-error) {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border-left: 4px solid #ef4444;
}

.output-area :deep(.output-warn) {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
  border-left: 4px solid #f59e0b;
}

.output-area :deep(.output-result) {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.output-area :deep(.output-log) {
  color: var(--vp-c-text-1);
}
</style>

<style>
/* Global styles for dynamically created output elements */
/* These need to be global because they're created via document.createElement */
.output-area .output-line {
  margin: 0.4rem 0;
  padding: 0.2rem 0;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  opacity: 0.9;
}

.output-area .log-timestamp {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  min-width: 70px;
  font-variant-numeric: tabular-nums;
}

.output-area .log-icon {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  min-width: 16px;
  text-align: center;
}

.output-area .log-content {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
  color: var(--vp-c-text-1);
}

.output-area .log-text {
  word-break: break-all;
  white-space: pre-wrap;
}

.output-area .output-result .log-text {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  font-size: 1rem;
}

.output-area .output-error,
.output-area .output-warn {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.output-area .output-error {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border-left: 4px solid #ef4444;
}

.output-area .output-warn {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
  border-left: 4px solid #f59e0b;
}

.output-area .output-result {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.output-area .output-log {
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

/* Animations */
.spinner {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
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
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
