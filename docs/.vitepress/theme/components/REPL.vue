<template>
  <div class="repl-container" id="repl-container" >
    <!-- IDE layout: sidebar + main -->
    <div class="ide-layout">
      <!-- Sidebar: library list -->
      <aside class="ide-sidebar" :class="{ 'is-ref-open': showReference }">
        <div class="sidebar-header">
          <img class="sidebar-active-logo" :alt="selectedLibrary" :src="withBase(`/logo-${selectedLibrary}.svg`)" />
          <span class="sidebar-active-name">
            @vielzeug/
            <strong>{{ selectedLibrary }}</strong>
          </span>
        </div>
        <nav class="sidebar-nav">
          <button
            class="sidebar-item"
            type="button"
            v-for="lib in libraries"
            :key="lib.id"
            :class="{ 'is-active': selectedLibrary === lib.id }"
            :title="lib.description"
            @click="selectLibrary(lib.id)">
            <img class="sidebar-logo" :alt="`${lib.id} logo`" :src="withBase(`/logo-${lib.id}.svg`)" />
            <span class="sidebar-info">
              <span class="sidebar-name">{{ lib.id }}</span>
              <span class="sidebar-desc">{{ lib.description }}</span>
            </span>
          </button>
        </nav>
        <button
          aria-controls="mobile-ref-panel"
          class="mobile-ref-toggle"
          type="button"
          :aria-expanded="showReference"
          @click="showReference = !showReference">
          <ore-icon name="book-open" size="14"></ore-icon>
          <span>{{ showReference ? 'Hide' : 'Browse' }} exports</span>
          <ore-icon size="14" :name="showReference ? 'chevron-down' : 'chevron-up'" ></ore-icon>
        </button>
        <div class="sidebar-ref" id="mobile-ref-panel" >
          <REPLReference :library="currentLibrary" @insert-function="insertFunction" />
        </div>
      </aside>

      <!-- Backdrop for the mobile reference drawer -->
      <div
        class="mobile-ref-backdrop"
        role="button"
        tabindex="0"
        v-if="showReference"
        @click="showReference = false"
        @keydown.enter="showReference = false"></div>

      <!-- Main: editor + output -->
      <div class="ide-main">
        <REPLEditor
          ref="editorRef"
          :examples="examples[selectedLibrary] ?? {}"
          :is-dark="isDark" 
          :library="currentLibrary"/>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup >
import { useData } from 'vitepress';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import REPLEditor from './REPLEditor.vue';
import REPLReference from './REPLReference.vue';
import { examples } from './repl/examples';
import { LIBRARY_REGISTRY } from './repl/registry.generated';

// ============================================================================
// State
// ============================================================================

const { site } = useData();
const withBase = (path: string): string => `${site.value.base.replace(/\/$/, '')}${path}`;

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
  height: calc(100vh - var(--vp-nav-height, 64px));
  overflow: hidden;
  background: var(--color-canvas);
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
  height: 100%;
  overflow: hidden;
  background: var(--color-contrast-100);
  border-right: var(--border) solid var(--color-contrast-300);
}

.sidebar-header {
  display: flex;
  flex-shrink: 0;
  gap: 0.5rem;
  align-items: center;
  height: 52px;
  padding: 0.75rem 1rem;
  background: var(--color-contrast-100);
  border-bottom: var(--border) solid var(--color-contrast-300);
}

.sidebar-active-logo {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.sidebar-active-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  color: var(--text-color-secondary);
  letter-spacing: var(--tracking-tight);
  white-space: nowrap;
}

.sidebar-active-name strong {
  font-weight: var(--font-semibold);
  color: var(--text-color-heading);
}

.sidebar-nav {
  flex: 1 1 0;
  min-height: 120px;
  padding: 0.375rem 0;
  overflow-y: auto;
  scrollbar-color: var(--color-contrast-300) transparent;
  scrollbar-width: thin;
}

.sidebar-item {
  position: relative;
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
  width: 100%;
  padding: 0.5rem 1rem;
  font-size: var(--text-sm);
  color: var(--text-color-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);
}

.sidebar-item:hover {
  color: var(--text-color-body);
  background: color-mix(in oklch, var(--color-primary) 6%, transparent);
}

.sidebar-item.is-active {
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  background: color-mix(in oklch, var(--color-primary) 10%, transparent);
}

.sidebar-item.is-active::before {
  position: absolute;
  top: 20%;
  left: 0;
  width: 3px;
  height: 60%;
  content: '';
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
}

.sidebar-logo {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin-top: 1px;
  object-fit: contain;
  opacity: 0.8;
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
  line-height: 1.2;
  color: var(--text-color-heading);
  letter-spacing: -0.01em;
}

.sidebar-item:not(.is-active) .sidebar-name {
  font-weight: var(--font-medium);
  color: var(--text-color-secondary);
}

.sidebar-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-xs);
  line-height: 1.3;
  color: var(--text-color-tertiary);
  white-space: nowrap;
}

.sidebar-item.is-active .sidebar-logo {
  opacity: 1;
}

.sidebar-ref {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-height: 200px;
  overflow: hidden;
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
    max-height: none;
    border-bottom: var(--border) solid var(--color-contrast-300);
    border-left: none;
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
    flex: 0 0 auto;
    align-items: center;
    width: auto;
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
    flex-shrink: 0;
    gap: 0.375rem;
    align-items: center;
    width: 100%;
    padding: 0.5rem 1rem;
    font-size: var(--text-sm);
    font-weight: var(--font-medium);
    color: var(--text-color-secondary);
    cursor: pointer;
    background: var(--color-contrast-100);
    border: none;
    border-top: var(--border) solid var(--color-contrast-300);
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
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
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
    position: fixed;
    inset: 0;
    z-index: 25;
    display: block;
    background: color-mix(in oklch, var(--color-canvas) 55%, transparent);
    opacity: 1;
    backdrop-filter: blur(2px);
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
