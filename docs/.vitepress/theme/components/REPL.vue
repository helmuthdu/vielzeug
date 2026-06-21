<!-- eslint-disable no-undef -->
<template>
  <div id="repl-container" class="repl-container">
    <!-- IDE layout: sidebar + main -->
    <div class="ide-layout">
      <!-- Sidebar: library list -->
      <aside class="ide-sidebar">
        <div class="sidebar-header">
          <img :src="withBase(`/logo-${selectedLibrary}.svg`)" :alt="selectedLibrary" class="sidebar-active-logo" />
          <span class="sidebar-active-name"
            >@vielzeug/<strong>{{ selectedLibrary }}</strong></span
          >
        </div>
        <nav class="sidebar-nav">
          <button
            v-for="(desc, lib) in libraryDescriptions"
            :key="lib"
            class="sidebar-item"
            :class="{ 'is-active': selectedLibrary === lib }"
            :title="desc"
            @click="
              selectedLibrary = lib;
              switchLibrary();
            ">
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
import { ARSENAL_CATEGORIES, LIBRARY_DESCRIPTIONS, LIBRARY_EXPORTS, LIBRARY_LOADERS } from './repl/libraries/index';
import { arsenalTypes, libraryTypes } from './repl/types';

// ============================================================================
// Constants
// ============================================================================

const MONACO_CDN = 'https://unpkg.com/monaco-editor@0.55.1/min/vs';
const STORAGE_PREFIX = 'vielzeug-repl-code-';

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
    Object.entries(module).forEach(([key, val]) => {
      window[key] = val;
    });
    window[libName] = module;
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
  background: var(--color-canvas);
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
  background: var(--color-contrast-100);
  overflow: hidden;
  height: 100%;
  border-right: var(--border) solid var(--color-contrast-300);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: var(--border) solid var(--color-contrast-300);
  flex-shrink: 0;
  background: var(--color-contrast-100);
  height: 52px;
}

.sidebar-active-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

.sidebar-active-name {
  font-size: var(--text-sm);
  color: var(--text-color-secondary);
  letter-spacing: var(--tracking-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-active-name strong {
  color: var(--text-color-heading);
  font-weight: var(--font-semibold);
}

.sidebar-nav {
  flex: 1 1 0;
  min-height: 120px;
  overflow-y: auto;
  padding: 0.375rem 0;
  scrollbar-width: thin;
  scrollbar-color: var(--color-contrast-300) transparent;
}

.sidebar-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--text-color-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  text-align: left;
  position: relative;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);
}

.sidebar-item:hover {
  color: var(--text-color-body);
  background: color-mix(in oklch, var(--color-primary) 6%, transparent);
}

.sidebar-item.is-active {
  color: var(--color-primary);
  background: color-mix(in oklch, var(--color-primary) 10%, transparent);
  font-weight: var(--font-semibold);
}

.sidebar-item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 20%;
  height: 60%;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--color-primary);
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
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text-color-heading);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.sidebar-item:not(.is-active) .sidebar-name {
  color: var(--text-color-secondary);
  font-weight: var(--font-medium);
}

.sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-color-tertiary);
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
    border-bottom: var(--border) solid var(--color-contrast-300);
    max-height: 180px;
  }

  .sidebar-nav {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-1);
    padding: 0.5rem;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .sidebar-item {
    width: auto;
    padding: var(--size-1) var(--size-2-5);
    border-radius: var(--rounded-md);
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
