<template>
  <div class="repl-panes" :class="{ 'has-output': hasOutput }">
    <!-- Shared toolbar: Examples (left) + Run (right) -->
    <div class="editor-toolbar">
      <ore-select
        label-placement="inset"
        style="width: 180px"
        placeholder="Examples..."
        :value="localSelectedExample"
        @change="handleExampleSelect">
        <optgroup v-for="category in examplesByCategory" :key="category.name" :label="category.name">
          <option v-for="ex in category.examples" :key="ex.value" :value="ex.value">{{ ex.label }}</option>
        </optgroup>
      </ore-select>
      <div class="toolbar-spacer" />
      <span class="toolbar-shortcut"><kbd>⌘</kbd><kbd>Return</kbd></span>
      <ore-button
        size="sm"
        color="primary"
        variant="solid"
        v-bind="isExecuting ? { loading: true } : {}"
        @click="handleRunCode">
        <svg
          v-if="!isExecuting"
          slot="prefix"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Run
      </ore-button>
    </div>

    <!-- Code Editor -->
    <div class="editor-section">
      <div class="editor-content-wrapper">
        <div ref="editorContainer" class="code-editor"></div>
        <div class="editor-floating-toolbar">
          <ore-tooltip content="Format Code" placement="top">
            <ore-button icon-only variant="ghost" size="sm" @click="formatCode">
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
            </ore-button>
          </ore-tooltip>
          <ore-tooltip content="Copy to Clipboard" placement="top">
            <ore-button icon-only variant="ghost" size="sm" @click="copyCode">
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
            </ore-button>
          </ore-tooltip>
          <ore-separator orientation="vertical" style="height: 14px; margin: 0 0.25rem"></ore-separator>
          <ore-tooltip content="Reset to Default" placement="top">
            <ore-button icon-only variant="ghost" size="sm" @click="resetEditor">
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
            </ore-button>
          </ore-tooltip>
          <ore-tooltip content="Clear Editor" placement="top">
            <ore-button icon-only variant="ghost" size="sm" color="error" @click="clearEditor">
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
            </ore-button>
          </ore-tooltip>
        </div>
      </div>
    </div>

    <!-- Output -->
    <div class="output-section">
      <div class="output-header">
        <span class="output-label">Output</span>
        <ore-tooltip content="Clear Output" placement="bottom">
          <ore-button icon-only variant="ghost" size="sm" @click="handleClearOutput">
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
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          </ore-button>
        </ore-tooltip>
      </div>
      <div ref="outputContainer" class="output-area">
        <div class="output-placeholder">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <p>Run code to see output</p>
          <ul class="placeholder-steps">
            <li><span class="step-num">1</span> Edit the code in the editor above</li>
            <li><span class="step-num">2</span> Press <kbd>⌘</kbd><kbd>Return</kbd> or click <strong>Run</strong></li>
            <li><span class="step-num">3</span> Results and logs appear here</li>
          </ul>
          <span class="placeholder-note">Your edits are saved automatically in the browser</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

// ============================================================================
// Props & Emits
// ============================================================================

const props = defineProps<{
  selectedLibrary: string;
  selectedExample: string;
  examples: Record<string, any>;
  isDark: boolean;
  getDefaultCode: (libName: string) => string;
  updateMonacoTypes: (libName: string) => void;
  storagePrefix: string;
}>();

const emit = defineEmits<{
  'update:selectedExample': [value: string];
  'run-code': [];
  'clear-output': [];
}>();

// ============================================================================
// State
// ============================================================================

const editorContainer = ref<HTMLElement | null>(null);
const outputContainer = ref<HTMLElement | null>(null);
const isExecuting = ref(false);
const hasOutput = ref(false);
const localSelectedExample = ref(props.selectedExample);

let editor: any = null;
let lastCursorPosition: any = null; // Track last cursor position
let consoleIntercepted = false;
let pendingExample: string | null = null; // Example queued before editor was ready
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
  if (newVal) loadExample(props.selectedLibrary);
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
  { flush: 'sync' },
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
  hasOutput.value = true;
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

    // Strip TypeScript-only syntax so cached or hand-typed TS code still runs.
    // 1. Remove 'type X = ...' declarations, including multiline union types.
    code = code.replace(/^type\s+\w[^\n]*(?:\n[ \t]+[|&][^\n]*)*/gm, '');
    // 2. Remove 'as TYPE' casts — 'as' is not a valid JS operator, always safe to drop.
    //    Handles: 'as any', 'as Foo', 'as Foo[]', 'as A | B', 'as { ... }', 'as { ... }[]'
    code = code.replace(
      /\bas\s+(?:\{[^}]*\}(?:\[\])*|[\w$][\w$.<>\[\]]*(?:\s*\|\s*(?:null|undefined|[\w$][\w$.<>\[\]]*))*)/g,
      '',
    );
    // 3. Remove ': any' parameter/variable type annotations.
    code = code.replace(/:\s*any\b/g, '');

    // Transform import statements to use global variables
    // Example: import { Vault } from '@vielzeug/vault' -> const { Vault } = window.vault || {}
    code = code.replace(/import\s+{([^}]+)}\s+from\s+['"]@vielzeug\/([^'"]+)['"]/g, (match, imports, libName) => {
      // Keep only runtime imports (drop type-only specifiers) and map "a as b" to object destructuring alias "a: b".
      const runtimeImports = imports
        .split(',')
        .map((entry: string) => entry.trim())
        .filter((entry: string) => entry.length > 0)
        .filter((entry: string) => !entry.startsWith('type '))
        .map((entry: string) => entry.replace(/^type\s+/, ''))
        .map((entry: string) => entry.replace(/\s+as\s+/g, ': '));

      if (runtimeImports.length === 0) {
        return '';
      }

      return `const { ${runtimeImports.join(', ')} } = window.${libName} || window || {}`;
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
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
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
  hasOutput.value = false;
  outputContainer.value.innerHTML = `
    <div class="output-placeholder">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
      <p>Output cleared</p>
      <span>Press <kbd>⌘ Enter</kbd> or click <strong>Run</strong> to execute</span>
    </div>
  `;
  emit('clear-output');
};

const handleExampleSelect = (e: Event) => {
  const detail = (e as CustomEvent<{ values: string[] }>).detail;
  const newValue = detail?.values?.[0] ?? '';
  localSelectedExample.value = newValue;
  // Always call loadExample directly so that re-selecting the *same* example
  // also reloads the editor — the watcher only fires when the value changes.
  if (newValue) loadExample(props.selectedLibrary);
};

const loadExample = (forLibrary = props.selectedLibrary) => {
  if (!localSelectedExample.value) return;

  // Editor not ready yet — remember and apply once initializeEditor runs.
  if (!editor) {
    pendingExample = localSelectedExample.value;
    return;
  }

  // Bail if the library changed by the time this runs (watcher race guard)
  if (forLibrary !== props.selectedLibrary) return;

  const libExamples = props.examples[forLibrary];
  const example = libExamples?.[localSelectedExample.value];

  if (example?.code) {
    editor.setValue(example.code);
    localStorage.setItem(`${props.storagePrefix}${forLibrary}`, example.code);
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

  // Apply any example that was selected before the editor finished initializing.
  if (pendingExample) {
    localSelectedExample.value = pendingExample;
    pendingExample = null;
    loadExample();
  }

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleRunCode);

  // Native fallback: catch ⌘+Enter (Mac) and Ctrl+Enter before browser intercepts
  editorContainer.value?.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleRunCode();
      }
    },
    { capture: true },
  );

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
/* ── Outer container ────────────────────────────────── */
.repl-panes {
  display: grid;
  grid-template-rows: 52px 1fr 0.35fr;
  height: 100%;
  min-height: 0;
  transition: grid-template-rows 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}

.repl-panes.has-output {
  grid-template-rows: 52px 1fr 0.55fr;
}

/* ── Shared toolbar ───────────────────────────────── */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
  height: 52px;
  flex-shrink: 0;
  border-bottom: var(--border) solid var(--color-contrast-300);
  background: var(--color-contrast-100);
}

.editor-toolbar > * {
  align-self: center;
  margin: 0;
}

.editor-toolbar :deep(ore-select),
.editor-toolbar :deep(ore-button) {
  align-self: center;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-shortcut {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  margin-right: 0.25rem;
}

.toolbar-shortcut kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  line-height: 1;
  padding: 0.2rem 0.35rem;
  background: var(--color-contrast-100);
  border: var(--border) solid var(--color-contrast-300);
  border-radius: var(--rounded-sm);
  color: var(--text-color-tertiary);
  box-shadow: 0 1px 0 var(--color-contrast-300);
}

.editor-section {
  min-height: 0;
  overflow: hidden;
  background: var(--color-canvas);
  display: flex;
  flex-direction: column;
}

.output-section {
  min-height: 0;
  overflow: hidden;
  background: var(--color-contrast-100);
  display: flex;
  flex-direction: column;
  border-top: var(--border) solid var(--color-contrast-300);
}

@media (prefers-reduced-motion: reduce) {
  .repl-panes {
    transition: none;
  }
}

/* ── Output header bar ──────────────────────────────── */
.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.75rem;
  height: 32px;
  flex-shrink: 0;
  border-bottom: var(--border) solid var(--color-contrast-300);
  background: var(--color-contrast-100);
}

.output-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-color-tertiary);
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
  background: var(--color-contrast-200);
  border: var(--border) solid var(--color-contrast-300);
  border-radius: var(--rounded-xl);
  box-shadow: var(--shadow-sm);
  z-index: 10;
  opacity: 0.55;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
}

.editor-floating-toolbar:hover {
  opacity: 1;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.code-editor,
.output-area {
  flex: 1;
  min-height: 0;
  font-family: var(--font-mono);
}

.code-editor {
  background: var(--color-contrast-100);
}

.output-area {
  padding: var(--size-5);
  background: var(--color-contrast-100);
  overflow-y: auto;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

/* Output Styles - for dynamically created DOM elements */
.output-area :deep(.output-line) {
  margin: var(--size-1-5) 0;
  padding: var(--size-0-5) 0;
  display: flex;
  align-items: flex-start;
  gap: var(--size-4);
  border-bottom: var(--border) solid var(--color-contrast-300);
  opacity: 0.9;
}

.output-area :deep(.log-timestamp) {
  font-size: var(--text-xs);
  color: var(--text-color-tertiary);
  min-width: 70px;
  font-variant-numeric: tabular-nums;
}

.output-area :deep(.log-icon) {
  font-size: var(--text-sm);
  color: var(--text-color-secondary);
  min-width: 16px;
  text-align: center;
}

.output-area :deep(.log-content) {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
  color: var(--text-color-body);
}

.output-area :deep(.log-text) {
  word-break: break-all;
  white-space: pre-wrap;
}

.output-area :deep(.output-result .log-text) {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
}

.output-area :deep(.output-error),
.output-area :deep(.output-warn) {
  padding: var(--size-2) var(--size-3);
  border-radius: var(--rounded-md);
  margin: var(--size-2) 0;
}

.output-area :deep(.output-error) {
  color: var(--color-error);
  background: var(--color-error-backdrop);
  border: var(--border) solid var(--color-error-border);
}

.output-area :deep(.output-warn) {
  color: var(--color-warning);
  background: var(--color-warning-backdrop);
  border: var(--border) solid var(--color-warning-border);
}

.output-area :deep(.output-result) {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
}

.output-area :deep(.output-log) {
  color: var(--text-color-body);
}
</style>

<style>
/* Global styles for dynamically created output elements */
/* These need to be global because they're created via document.createElement */
.output-area .output-line {
  margin: var(--size-1-5) 0;
  padding: var(--size-0-5) 0;
  display: flex;
  align-items: flex-start;
  gap: var(--size-4);
  border-bottom: var(--border) solid var(--color-contrast-300);
  opacity: 0.9;
}

.output-area .log-timestamp {
  font-size: var(--text-xs);
  color: var(--text-color-tertiary);
  min-width: 70px;
  font-variant-numeric: tabular-nums;
}

.output-area .log-icon {
  font-size: var(--text-sm);
  color: var(--text-color-secondary);
  min-width: 16px;
  text-align: center;
}

.output-area .log-content {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
  color: var(--text-color-body);
}

.output-area .log-text {
  word-break: break-all;
  white-space: pre-wrap;
}

.output-area .output-result .log-text {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
}

.output-area .output-error,
.output-area .output-warn {
  padding: var(--size-2) var(--size-3);
  border-radius: var(--rounded-md);
  margin: var(--size-2) 0;
}

.output-area .output-error {
  color: var(--color-error);
  background: var(--color-error-backdrop);
  border: var(--border) solid var(--color-error-border);
}

.output-area .output-warn {
  color: var(--color-warning);
  background: var(--color-warning-backdrop);
  border: var(--border) solid var(--color-warning-border);
}

.output-area .output-result {
  color: var(--color-primary);
  font-weight: var(--font-semibold);
}

.output-area .output-log {
  color: var(--text-color-body);
}

.output-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-tertiary);
  text-align: center;
  gap: var(--size-2-5);
  padding: var(--size-8);
  user-select: none;
}

.output-placeholder p {
  margin: 0;
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--text-color-secondary);
}

.output-placeholder span {
  font-size: var(--text-xs);
}

.placeholder-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--size-1-5);
  text-align: left;
}

.placeholder-steps li {
  display: flex;
  align-items: center;
  gap: var(--size-2);
  font-size: var(--text-xs);
  color: var(--text-color-tertiary);
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: var(--border) solid var(--color-contrast-300);
  font-size: var(--text-2xs);
  font-weight: var(--font-semibold);
  color: var(--text-color-tertiary);
  flex-shrink: 0;
}

.placeholder-note {
  font-size: var(--text-2xs);
  color: var(--text-color-tertiary);
  opacity: 0.7;
  margin-top: var(--size-1);
}

.output-placeholder kbd {
  display: inline-block;
  padding: 0.1em 0.35em;
  font-size: 0.75em;
  font-family: var(--font-mono);
  border: var(--border) solid var(--color-contrast-300);
  border-radius: var(--rounded-sm);
  background: var(--color-canvas);
  color: var(--text-color-secondary);
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
