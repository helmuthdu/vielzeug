<template>
  <div class="repl-panes" :class="{ 'has-output': execution.output.value.length > 0 }">
    <!-- Shared toolbar: Examples (left) + Run (right) -->
    <div class="editor-toolbar">
      <ore-select
        label-placement="inset"
        placeholder="Examples..."
        style="width: 180px"
        :value="selectedExample"
        @change="handleExampleSelect">
        <optgroup v-for="category in examplesByCategory" :key="category.name" :label="category.name">
          <option v-for="ex in category.examples" :key="ex.value" :value="ex.value">{{ ex.label }}</option>
        </optgroup>
      </ore-select>
      <div class="toolbar-spacer" />
      <span class="toolbar-shortcut">
        <kbd>⌘</kbd>
        <kbd>Return</kbd>
      </span>
      <ore-button
        color="primary"
        size="sm"
        variant="solid"
        v-bind="execution.isExecuting.value ? { loading: true } : {}"
        @click="runCode">
        <svg
          fill="none"
          height="14"
          slot="prefix"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="14"
          xmlns="http://www.w3.org/2000/svg"
          v-if="!execution.isExecuting.value">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Run
      </ore-button>
    </div>

    <!-- Code Editor -->
    <div class="editor-section">
      <div class="editor-content-wrapper">
        <div class="code-editor" ref="editorContainer" ></div>
        <div class="editor-floating-toolbar">
          <ore-tooltip content="Format Code" placement="top">
            <ore-button icon-only size="sm" variant="ghost" @click="formatCode">
              <svg
                fill="none"
                height="14"
                id="svg8"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                version="1.1"
                viewBox="0 0 24 24"
                width="14"
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
            <ore-button icon-only size="sm" variant="ghost" @click="copyCode">
              <svg
                fill="none"
                height="14"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="14"
                xmlns="http://www.w3.org/2000/svg">
                <rect height="14" rx="2" ry="2" width="14" x="8" y="8" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </ore-button>
          </ore-tooltip>
          <ore-separator orientation="vertical" style="height: 14px; margin: 0 0.25rem"></ore-separator>
          <ore-tooltip content="Reset to Default" placement="top">
            <ore-button icon-only size="sm" variant="ghost" @click="resetEditor">
              <svg
                fill="none"
                height="14"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="14"
                xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </ore-button>
          </ore-tooltip>
          <ore-tooltip content="Clear Editor" placement="top">
            <ore-button color="error" icon-only size="sm" variant="ghost" @click="clearEditor">
              <svg
                fill="none"
                height="14"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="14"
                xmlns="http://www.w3.org/2000/svg">
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
          <ore-button icon-only size="sm" variant="ghost" @click="execution.clear">
            <svg
              fill="none"
              height="14"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
              width="14"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          </ore-button>
        </ore-tooltip>
      </div>
      <div class="output-area">
        <div class="output-placeholder" v-if="execution.output.value.length === 0" >
          <svg
            fill="none"
            height="28"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            viewBox="0 0 24 24"
            width="28"
            xmlns="http://www.w3.org/2000/svg">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <p>Run code to see output</p>
          <ul class="placeholder-steps">
            <li>
              <span class="step-num">1</span>
              Edit the code in the editor above
            </li>
            <li>
              <span class="step-num">2</span>
              Press
              <kbd>⌘</kbd>
              <kbd>Return</kbd>
              or click
              <strong>Run</strong>
            </li>
            <li>
              <span class="step-num">3</span>
              Results and logs appear here
            </li>
          </ul>
          <span class="placeholder-note">Your edits are saved automatically in the browser</span>
        </div>
        <div v-else>
          <div class="output-line" v-for="line in execution.output.value" :key="line.id" :class="`output-${line.type}`">
            <span class="log-timestamp" v-if="line.type !== 'result'" >{{ line.time }}</span>
            <span class="log-icon">{{ OUTPUT_ICON[line.type] }}</span>
            <span class="log-content">
              <span class="log-text">{{ line.text }}</span>
            </span>
          </div>
        </div>
        <!-- Sandboxed execution target — invisible: this REPL only shows console/return-value
             output, never rendered DOM, so the iframe itself never needs to be seen. -->
        <div aria-hidden="true" class="sandbox-host" ref="sandboxContainer" ></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup >
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ExampleModule } from './repl/examples/types';
import type { SandboxLibrary } from './repl/execution/buildSandboxDocument';
import { executeReplCode } from './repl/execution/executeReplCode';
import { persistedCode } from './repl/execution/persistedCode';
import { loadMonaco } from './repl/execution/useMonaco';
import { type OutputLine, useReplExecution } from './repl/execution/useReplExecution';
import { LIBRARY_REGISTRY, type LibraryEntry } from './repl/registry.generated';

// ============================================================================
// Props
// ============================================================================

const props = defineProps<{
  examples: Record<string, ExampleModule>;
  isDark: boolean;
  library: LibraryEntry;
}>();

// ============================================================================
// State
// ============================================================================

const editorContainer = ref<HTMLElement | null>(null);
const sandboxContainer = ref<HTMLElement | null>(null);
const selectedExample = ref('');

const execution = useReplExecution(sandboxContainer);

const OUTPUT_ICON: Record<OutputLine['type'], string> = { error: '✖', log: '▸', result: '→', warn: '⚠' };

let monaco: Awaited<ReturnType<typeof loadMonaco>> | null = null;
let editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;
let lastCursorPosition: { column: number; lineNumber: number } | null = null;

// ============================================================================
// Computed Properties
// ============================================================================

const examplesByCategory = computed(() => {
  const grouped: Record<string, { label: string; value: string }[]> = {};

  for (const [key, value] of Object.entries(props.examples)) {
    const category = key.split('-')[0] || 'Other';
    (grouped[category] ??= []).push({ label: value.name || key, value: key });
  }

  return Object.entries(grouped).map(([name, exampleList]) => ({
    examples: exampleList,
    name: name.charAt(0).toUpperCase() + name.slice(1),
  }));
});

/** This library plus every transitive @vielzeug dependency's registry entry, deps first. */
const librariesInLoadOrder = computed<LibraryEntry[]>(() =>
  [...props.library.dependencies, props.library.id].map((id) =>
    id === props.library.id ? props.library : LIBRARY_REGISTRY[id]!,
  ),
);

/** IIFE bundles to inline into the sandbox document, in dependency-first order. */
const sandboxLibraries = computed<SandboxLibrary[]>(() =>
  librariesInLoadOrder.value.map((entry) => ({ globalName: entry.globalName, iifeSource: entry.iifeSource })),
);

/** Monaco "extra lib" entries so the editor can resolve types for this library and its deps. */
function extraLibsFor(entries: LibraryEntry[]): { content: string; filePath: string }[] {
  return entries.map((entry) => ({
    content: entry.typeDeclaration,
    filePath: `file:///node_modules/@vielzeug/${entry.id}/index.d.ts`,
  }));
}

// ============================================================================
// Helper Functions
// ============================================================================

function defaultCodeFor(libraryId: string): string {
  const first = Object.values(props.examples)[0];

  return first?.code ?? `// @vielzeug/${libraryId}\n`;
}

function getInitialCode(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const sharedCode = urlParams.get('code');

  if (sharedCode) {
    try {
      const decoded = atob(sharedCode);
      window.history.replaceState({}, document.title, window.location.pathname);

      return decoded;
    } catch (err) {
      console.error('Failed to decode shared code from URL', err);
    }
  }

  return persistedCode.get(props.library.id) ?? defaultCodeFor(props.library.id);
}

function resolveGlobalNameFor(entries: LibraryEntry[]): (lib: string) => string {
  const globalNames = Object.fromEntries(entries.map((entry) => [entry.id, entry.globalName]));

  return (lib: string) => globalNames[lib] ?? lib;
}

async function runCode(): Promise<void> {
  // Also guards against overlapping runs: transpileTypeScript() is a real async round trip to
  // Monaco's worker, so a second Run before the first settles could otherwise resolve out of
  // order and clobber the newer run's output with the older run's result.
  if (!editor || !monaco || execution.isExecuting.value) return;

  const rawCode = editor.getValue();

  if (rawCode.trim()) persistedCode.set(props.library.id, rawCode);

  await executeReplCode({
    execution,
    libraries: sandboxLibraries.value,
    model: editor.getModel(),
    monaco,
    rawCode,
    resolveGlobalName: resolveGlobalNameFor(librariesInLoadOrder.value),
  });
}

async function formatCode(): Promise<void> {
  await editor?.getAction('editor.action.formatDocument')?.run();
}

async function copyCode(): Promise<void> {
  if (!editor) return;

  try {
    await navigator.clipboard.writeText(editor.getValue());
  } catch (err) {
    console.error('Failed to copy code', err);
  }
}

function resetEditor(): void {
  if (!editor) return;

  const code = defaultCodeFor(props.library.id);
  editor.setValue(code);
  persistedCode.set(props.library.id, code);
}

function clearEditor(): void {
  editor?.setValue('');
  persistedCode.clear(props.library.id);
}

function loadExample(exampleKey: string): void {
  const example = props.examples[exampleKey];

  if (!editor || !example) return;

  editor.setValue(example.code);
  persistedCode.set(props.library.id, example.code);
}

function handleExampleSelect(e: Event): void {
  const key = (e.target as HTMLElement & { value: string }).value ?? '';
  selectedExample.value = key;
  if (key) loadExample(key);
}

function insertTextAtCursor(text: string): void {
  if (!editor || !monaco) return;

  const position = lastCursorPosition ?? editor.getPosition();

  if (!position) return;

  const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
  editor.executeEdits('insert-text', [{ forceMoveMarkers: true, range, text }]);

  const newPosition = { column: position.column + text.length, lineNumber: position.lineNumber };
  editor.setPosition(newPosition);
  editor.revealPositionInCenter(newPosition);
  lastCursorPosition = newPosition;
  editor.focus();
}

// ============================================================================
// Monaco setup
// ============================================================================

async function initializeEditor(): Promise<void> {
  monaco = await loadMonaco();

  if (!editorContainer.value) return;

  monaco.typescript.typescriptDefaults.setExtraLibs(extraLibsFor(librariesInLoadOrder.value));

  editor = monaco.editor.create(editorContainer.value, {
    automaticLayout: true,
    fontSize: 14,
    language: 'typescript',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    theme: props.isDark ? 'vs-dark' : 'vs',
    value: getInitialCode(),
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode);
  editor.onDidChangeCursorPosition((e) => {
    lastCursorPosition = e.position;
  });

  // Prevent VitePress's "/" command palette and Cmd/Ctrl+K shortcut from firing while the
  // editor has focus.
  editor.getDomNode()?.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key === '/' || e.code === 'Slash') e.stopPropagation();
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') e.stopPropagation();
    },
    true,
  );
}

// ============================================================================
// Watchers & Lifecycle
// ============================================================================

watch(
  () => props.library.id,
  () => {
    selectedExample.value = '';
    // Switching libraries abandons whatever the previous library's code was doing — cancel()
    // both supersedes the sandbox's current render (so a still-running/hung previous run's
    // output can't land in what now looks like a fresh panel) and clears the output itself.
    execution.cancel();

    if (!editor || !monaco) return;

    monaco.typescript.typescriptDefaults.setExtraLibs(extraLibsFor(librariesInLoadOrder.value));
    editor.setValue(persistedCode.get(props.library.id) ?? defaultCodeFor(props.library.id));
  },
);

watch(
  () => props.isDark,
  (dark) => monaco?.editor.setTheme(dark ? 'vs-dark' : 'vs'),
);

onMounted(() => {
  void initializeEditor();
});

onBeforeUnmount(() => {
  editor?.dispose();
  editor = null;
  execution.dispose();
});

defineExpose({ insertTextAtCursor });
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
  flex-shrink: 0;
  gap: 0.5rem;
  align-items: center;
  height: 52px;
  padding: 0 1rem;
  background: var(--color-contrast-100);
  border-bottom: var(--border) solid var(--color-contrast-300);
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
  gap: 0.125rem;
  align-items: center;
  margin-right: 0.25rem;
}

.toolbar-shortcut kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.35rem;
  font-family: var(--font-mono);
  font-size: var(--text-2xs);
  line-height: 1;
  color: var(--text-color-tertiary);
  background: var(--color-contrast-100);
  border: var(--border) solid var(--color-contrast-300);
  border-radius: var(--rounded-sm);
  box-shadow: 0 1px 0 var(--color-contrast-300);
}

.editor-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--color-canvas);
}

.output-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--color-contrast-100);
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
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 0.75rem;
  background: var(--color-contrast-100);
  border-bottom: var(--border) solid var(--color-contrast-300);
}

.output-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--text-color-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

/* Editor & Output Areas */
.editor-content-wrapper {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
}

.editor-floating-toolbar {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 10;
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  background: var(--color-contrast-200);
  border: var(--border) solid var(--color-contrast-300);
  border-radius: var(--rounded-xl);
  box-shadow: var(--shadow-sm);
  opacity: 0.55;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
}

.editor-floating-toolbar:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-md);
  opacity: 1;
  transform: translateY(-1px);
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
  overflow-y: auto;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  background: var(--color-contrast-100);
}

/* Output Styles - for dynamically created DOM elements */
.output-area .output-line {
  display: flex;
  gap: var(--size-4);
  align-items: flex-start;
  padding: var(--size-0-5) 0;
  margin: var(--size-1-5) 0;
  border-bottom: var(--border) solid var(--color-contrast-300);
  opacity: 0.9;
}

.output-area .log-timestamp {
  min-width: 70px;
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-color-tertiary);
}

.output-area .log-icon {
  min-width: 16px;
  font-size: var(--text-sm);
  color: var(--text-color-secondary);
  text-align: center;
}

.output-area .log-content {
  flex: 1;
  color: var(--text-color-body);
  word-break: break-all;
  white-space: pre-wrap;
}

.output-area .log-text {
  word-break: break-all;
  white-space: pre-wrap;
}

.output-area .output-result .log-text {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
}

.output-area .output-error,
.output-area .output-warn {
  padding: var(--size-2) var(--size-3);
  margin: var(--size-2) 0;
  border-radius: var(--rounded-md);
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
  font-weight: var(--font-semibold);
  color: var(--color-primary);
}

.output-area .output-log {
  color: var(--text-color-body);
}

/* Output placeholder + result formatting (rendered via v-for, no longer via innerHTML) */
.output-placeholder {
  display: flex;
  flex-direction: column;
  gap: var(--size-2-5);
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--size-8);
  color: var(--text-color-tertiary);
  text-align: center;
  user-select: none;
}

.output-placeholder p {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-color-secondary);
}

.output-placeholder span {
  font-size: var(--text-xs);
}

.placeholder-steps {
  display: flex;
  flex-direction: column;
  gap: var(--size-1-5);
  padding: 0;
  margin: 0;
  text-align: left;
  list-style: none;
}

.placeholder-steps li {
  display: flex;
  gap: var(--size-2);
  align-items: center;
  font-size: var(--text-xs);
  color: var(--text-color-tertiary);
}

.step-num {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: var(--text-2xs);
  font-weight: var(--font-semibold);
  color: var(--text-color-tertiary);
  border: var(--border) solid var(--color-contrast-300);
  border-radius: 50%;
}

.placeholder-note {
  margin-top: var(--size-1);
  font-size: var(--text-2xs);
  color: var(--text-color-tertiary);
  opacity: 0.7;
}

.output-placeholder kbd {
  display: inline-block;
  padding: 0.1em 0.35em;
  font-family: var(--font-mono);
  font-size: 0.75em;
  color: var(--text-color-secondary);
  background: var(--color-canvas);
  border: var(--border) solid var(--color-contrast-300);
  border-radius: var(--rounded-sm);
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

.sandbox-host {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  border: 0;
}
</style>
