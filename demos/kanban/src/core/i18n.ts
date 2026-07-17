import { flux, toSignal } from '@vielzeug/flux';
import { createI18n } from '@vielzeug/lingua';
import { computed } from '@vielzeug/ripple';

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
      themeDark: 'Dunkel',
      themeHint: 'Hell, dunkel oder Systemdarstellung verwenden.',
      themeLabel: 'Darstellung',
      themeLight: 'Hell',
      themeSystem: 'System',
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
    taskDialog: {
      assignee: 'Zugewiesen an',
      budget: 'Budget (USD)',
      close: 'Schließen',
      create: 'Erstellen',
      deleteConfirmBody: 'Dies löscht {title} dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.',
      deleteConfirmCancel: 'Abbrechen',
      deleteConfirmConfirm: 'Löschen',
      deleteConfirmTitle: 'Aufgabe löschen?',
      deleteTask: 'Löschen',
      description: 'Beschreibung',
      dueDate: 'Fälligkeitsdatum',
      newTask: 'Neue Aufgabe',
      priority: 'Priorität',
      save: 'Speichern',
      status: 'Status',
      thisTask: 'diese Aufgabe',
      title: 'Titel',
      titleRequired: 'Titel ist erforderlich',
      unassigned: 'Nicht zugewiesen',
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
      themeDark: 'Dark',
      themeHint: 'Use a light, dark, or system appearance.',
      themeLabel: 'Appearance',
      themeLight: 'Light',
      themeSystem: 'System',
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
    taskDialog: {
      assignee: 'Assignee',
      budget: 'Budget (USD)',
      close: 'Close',
      create: 'Create',
      deleteConfirmBody: 'This deletes {title} permanently. This action cannot be undone.',
      deleteConfirmCancel: 'Cancel',
      deleteConfirmConfirm: 'Delete',
      deleteConfirmTitle: 'Delete task?',
      deleteTask: 'Delete',
      description: 'Description',
      dueDate: 'Due date',
      newTask: 'New task',
      priority: 'Priority',
      save: 'Save',
      status: 'Status',
      thisTask: 'this task',
      title: 'Title',
      titleRequired: 'Title is required',
      unassigned: 'Unassigned',
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

// ── Reactive locale (bridges lingua's subscribe() into a ripple signal via flux — the same
// fromSubscribe-style producer pattern used by board-store.ts's activeRoute and
// realtime.ts's presenceSignal) ────────────────────────────────────────────────

const localeBinding = toSignal(
  flux<'de' | 'en'>((observer) => {
    observer.next(i18n.locale as 'de' | 'en');

    return i18n.subscribe(() => observer.next(i18n.locale as 'de' | 'en'));
  }),
  { initial: i18n.locale as 'de' | 'en' },
);

export const currentLocale = computed(() => localeBinding.value);

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
