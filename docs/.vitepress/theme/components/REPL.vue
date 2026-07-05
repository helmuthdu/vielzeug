<template>
  <div id="repl-container" class="repl-container">
    <!-- IDE layout: sidebar + main -->
    <div class="ide-layout">
      <!-- Sidebar: library list -->
      <aside class="ide-sidebar" :class="{ 'is-ref-open': showReference }">
        <div class="sidebar-header">
          <img :src="withBase(`/logo-${selectedLibrary}.svg`)" :alt="selectedLibrary" class="sidebar-active-logo" />
          <span class="sidebar-active-name"
            >@vielzeug/<strong>{{ selectedLibrary }}</strong></span
          >
        </div>
        <nav class="sidebar-nav">
          <button
            v-for="lib in libraries"
            :key="lib.id"
            class="sidebar-item"
            :class="{ 'is-active': selectedLibrary === lib.id }"
            :title="lib.description"
            @click="selectLibrary(lib.id)">
            <img :src="withBase(`/logo-${lib.id}.svg`)" :alt="`${lib.id} logo`" class="sidebar-logo" />
            <span class="sidebar-info">
              <span class="sidebar-name">{{ lib.id }}</span>
              <span class="sidebar-desc">{{ lib.description }}</span>
            </span>
          </button>
        </nav>
        <button
          type="button"
          class="mobile-ref-toggle"
          :aria-expanded="showReference"
          aria-controls="mobile-ref-panel"
          @click="showReference = !showReference">
          <ore-icon name="book-open" size="14"></ore-icon>
          <span>{{ showReference ? 'Hide' : 'Browse' }} exports</span>
          <ore-icon :name="showReference ? 'chevron-down' : 'chevron-up'" size="14"></ore-icon>
        </button>
        <div id="mobile-ref-panel" class="sidebar-ref">
          <REPLReference :library="currentLibrary" @insert-function="insertFunction" />
        </div>
      </aside>

      <!-- Backdrop for the mobile reference drawer -->
      <div v-if="showReference" class="mobile-ref-backdrop" @click="showReference = false"></div>

      <!-- Main: editor + output -->
      <div class="ide-main">
        <REPLEditor
          ref="editorRef"
          :library="currentLibrary"
          :examples="examples[selectedLibrary] ?? {}"
          :is-dark="isDark" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import REPLEditor from './REPLEditor.vue';
import REPLReference from './REPLReference.vue';
import { examples } from './repl/examples';
import { LIBRARY_REGISTRY } from './repl/registry.generated';

// ============================================================================
// State
// ============================================================================

const editorRef = ref<InstanceType<typeof REPLEditor> | null>(null);
const selectedLibrary = ref('arsenal');
const isDark = ref(true);
// Mobile-only: the exports reference is a bottom-sheet drawer there (see CSS `@media (max-width: 768px)`)
// since the sidebar has no room to show the package list, search, and export chips all at once.
const showReference = ref(false);

const libraries = Object.values(LIBRARY_REGISTRY);
const currentLibrary = computed(() => LIBRARY_REGISTRY[selectedLibrary.value]!);

// ============================================================================
// Helper Functions
// ============================================================================

const insertFunction = (item: string): void => {
  editorRef.value?.insertTextAtCursor(item);
  showReference.value = false;
};

const selectLibrary = (id: string): void => {
  selectedLibrary.value = id;
  showReference.value = false;
};

const syncTheme = (): void => {
  isDark.value = document.documentElement.classList.contains('dark');
};

// ============================================================================
// Lifecycle Hooks
// ============================================================================

const closeReferenceOnEscape = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && showReference.value) showReference.value = false;
};

onMounted(() => {
  syncTheme();

  const observer = new MutationObserver(syncTheme);
  observer.observe(document.documentElement, {
    attributeFilter: ['class'],
    attributes: true,
  });

  window.addEventListener('keydown', closeReferenceOnEscape);

  onBeforeUnmount(() => {
    observer.disconnect();
    window.removeEventListener('keydown', closeReferenceOnEscape);
  });
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

.mobile-ref-toggle {
  display: none;
}

.mobile-ref-backdrop {
  display: none;
}

/* ── Responsive ────────────────────────────────────────── */
@media (max-width: 768px) {
  /* VitePress reserves an extra `--vp-nav-height` of top padding on mobile (normally used by
     the doc-layout local nav bar), which this `layout: page` route never renders — cancel it out
     so the IDE starts right below the nav instead of leaving a blank band above it. */
  .repl-container {
    margin-top: calc(-1 * var(--vp-nav-height, 64px));
  }

  .ide-layout {
    grid-template-columns: 1fr;
  }

  .ide-sidebar {
    border-left: none;
    border-bottom: var(--border) solid var(--color-contrast-300);
    max-height: none;
  }

  /* Active library is already highlighted in the strip below — drop the duplicate header row. */
  .sidebar-header {
    display: none;
  }

  .sidebar-nav {
    display: flex;
    flex-wrap: nowrap;
    flex: none;
    gap: var(--size-1);
    padding: 0.5rem;
    overflow-x: auto;
    overflow-y: hidden;
    min-height: 0;
    -webkit-overflow-scrolling: touch;
  }

  .sidebar-item {
    width: auto;
    flex: 0 0 auto;
    align-items: center;
    padding: var(--size-1) var(--size-2-5);
    border-radius: var(--rounded-md);
  }

  .sidebar-item.is-active::before {
    display: none;
  }

  /* Description doesn't fit the compact horizontal strip — the logo + name are enough here. */
  .sidebar-item .sidebar-desc {
    display: none;
  }

  .sidebar-item .sidebar-logo {
    width: 20px;
    height: 20px;
    margin-top: 0;
  }

  .mobile-ref-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    padding: 0.5rem 1rem;
    border: none;
    border-top: var(--border) solid var(--color-contrast-300);
    background: var(--color-contrast-100);
    color: var(--text-color-secondary);
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    cursor: pointer;
    flex-shrink: 0;
  }

  .mobile-ref-toggle:hover {
    color: var(--text-color-body);
  }

  .mobile-ref-toggle span {
    flex: 1;
    text-align: left;
  }

  /* Reference browser has nowhere to live inline on a phone screen — surface it as a bottom-sheet
     drawer that overlays the editor instead of permanently stealing space from it. */
  .sidebar-ref {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    z-index: 30;
    height: min(70vh, 32rem);
    min-height: 0;
    background: var(--color-contrast-100);
    border-top: var(--border) solid var(--color-contrast-300);
    box-shadow: 0 -8px 24px rgb(0 0 0 / 25%);
    transform: translateY(100%);
    transition: transform var(--transition-normal, 0.25s) ease;
  }

  .ide-sidebar.is-ref-open .sidebar-ref {
    transform: translateY(0);
  }

  .mobile-ref-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 25;
    background: color-mix(in oklch, var(--color-canvas) 55%, transparent);
    backdrop-filter: blur(2px);
    opacity: 1;
    transition: opacity var(--transition-normal, 0.2s) ease;
  }

  @starting-style {
    .mobile-ref-backdrop {
      opacity: 0;
    }
  }

  .ide-main {
    border-left: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-item {
    transition: none;
  }

  .sidebar-ref {
    transition: none;
  }

  .mobile-ref-backdrop {
    transition: none;
  }
}
</style>
