import { createI18n } from '@vielzeug/lingua';
import { signal } from '@vielzeug/ripple';

// ── Message catalog ──────────────────────────────────────────────────────────

const messages = {
  de: {
    action: {
      export: 'Exportieren',
      redo: 'Wiederholen',
      search: 'Suchen',
      undo: 'Rückgängig',
    },
    analytics: {
      completed: 'Abgeschlossen',
      completionVelocity: '7-Tage-Abschlussrate',
      tasks: 'Aufgaben',
      tasksPerColumn: 'Aufgaben pro Spalte',
      title: 'Analysen',
    },
    backlog: {
      filterByStatus: 'Nach Status filtern',
      next: 'Weiter →',
      pageInfo: 'Seite {page} / {pageCount} ({total} Aufgaben)',
      prev: '← Zurück',
      searchPlaceholder: 'Aufgaben suchen…',
      title: 'Backlog',
    },
    command: {
      actions: 'Aktionen',
      createTask: 'Aufgabe erstellen',
      goTo: 'Gehe zu',
      navigate: 'Navigation',
      tasks: 'Aufgaben',
    },
    nav: {
      analytics: 'Analysen',
      backlog: 'Backlog',
      board: 'Board',
      settings: 'Einstellungen',
    },
    presence: {
      viewing: '{count} online',
    },
    priority: {
      high: 'Hoch',
      low: 'Niedrig',
      medium: 'Mittel',
      urgent: 'Dringend',
    },
    settings: {
      debugLogHint: 'Letzte Anwendungsereignisse zur Fehlersuche.',
      debugLogLabel: 'Debug-Protokoll',
      developerGroup: 'Entwickler',
      languageLabel: 'Sprache',
      noLogEntries: 'Noch keine Protokolleinträge.',
      preferencesGroup: 'Präferenzen',
      title: 'Einstellungen',
      userHint: 'Benutzer wechseln, um zu sehen, wie sich Berechtigungen auswirken.',
      userLabel: 'Anzeigen als',
    },
    task: {
      allStatuses: 'Alle Status',
      done: 'Erledigt',
      inProgress: 'In Bearbeitung',
      review: 'Überprüfung',
      todo: 'Zu erledigen',
    },
  },
  en: {
    action: {
      export: 'Export',
      redo: 'Redo',
      search: 'Search',
      undo: 'Undo',
    },
    analytics: {
      completed: 'Completed',
      completionVelocity: '7-day completion velocity',
      tasks: 'Tasks',
      tasksPerColumn: 'Tasks per column',
      title: 'Analytics',
    },
    backlog: {
      filterByStatus: 'Filter by status',
      next: 'Next →',
      pageInfo: 'Page {page} / {pageCount} ({total} tasks)',
      prev: '← Prev',
      searchPlaceholder: 'Search tasks…',
      title: 'Backlog',
    },
    command: {
      actions: 'Actions',
      createTask: 'Create task',
      goTo: 'Go to',
      navigate: 'Navigate',
      tasks: 'Tasks',
    },
    nav: {
      analytics: 'Analytics',
      backlog: 'Backlog',
      board: 'Board',
      settings: 'Settings',
    },
    presence: {
      viewing: '{count} viewing',
    },
    priority: {
      high: 'High',
      low: 'Low',
      medium: 'Medium',
      urgent: 'Urgent',
    },
    settings: {
      debugLogHint: 'Recent application log entries for troubleshooting.',
      debugLogLabel: 'Debug log',
      developerGroup: 'Developer',
      languageLabel: 'Language',
      noLogEntries: 'No log entries yet.',
      preferencesGroup: 'Preferences',
      title: 'Settings',
      userHint: 'Switch users to see how permissions change what you can do.',
      userLabel: 'Viewing as',
    },
    task: {
      allStatuses: 'All statuses',
      done: 'Done',
      inProgress: 'In Progress',
      review: 'Review',
      todo: 'To Do',
    },
  },
};

// ── Instance ─────────────────────────────────────────────────────────────────

export const i18n = createI18n({
  catalogs: { de: messages.de, en: messages.en },
  locale: 'en',
});

// ── Helpers ──────────────────────────────────────────────────────────────────

export function setLocale(locale: 'de' | 'en'): void {
  void i18n.setLocale(locale);
}

// ── Reactive locale (bridges lingua's subscribe() into a ripple signal) ─────────

export const currentLocale = signal<'de' | 'en'>(i18n.locale as 'de' | 'en');

i18n.subscribe(() => {
  currentLocale.value = i18n.locale as 'de' | 'en';
});

/**
 * `i18n.t()` itself isn't a ripple-reactive read — `lingua` has no idea ripple exists — so a
 * template binding like `${() => t('nav.board')}` would resolve once and then never update on
 * locale change: ripple's `computed()`/`effect()` only re-run when a signal *they* read changes,
 * and this call site reads none. Reading `currentLocale.value` here (even though its value is
 * never used) registers that dependency on every caller's behalf, so any binding built on `t()`
 * re-evaluates the instant `setLocale()` runs instead of only on the component's next remount.
 */
export function t(key: string, vars?: Record<string, unknown>): string {
  void currentLocale.value;

  return i18n.t(key, vars);
}
