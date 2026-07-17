import '@vielzeug/refine/select';
import '@vielzeug/refine/button';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import type { LogEntry } from '@vielzeug/rune';

import { define, html, onCleanup, ref } from '@vielzeug/ore';
import { each, when } from '@vielzeug/ore/directives';
import { signal } from '@vielzeug/ripple';

import { currentUser } from '../../core/board-store';
import { currentLocale, setLocale, t } from '../../core/i18n';
import { ringBuffer } from '../../core/logger';
import { seedUsers } from '../../core/seed-data';
import { setThemePreference, themePreference } from '../../core/theme';

const LEVEL_COLORS: Record<string, string> = {
  debug: '#888',
  error: '#e55',
  fatal: '#c00',
  info: '#4af',
  warn: '#fa0',
};

const LANGUAGES: Array<{ code: 'de' | 'en'; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
];

const THEMES: Array<{ code: 'dark' | 'light' | 'system'; label: () => string }> = [
  { code: 'system', label: () => t('settings.themeSystem') },
  { code: 'light', label: () => t('settings.themeLight') },
  { code: 'dark', label: () => t('settings.themeDark') },
];

const USER_OPTIONS = seedUsers.map((user) => ({ label: `${user.name} (${user.role})`, value: user.id }));

function formatTimestamp(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

define('settings-view', {
  setup() {
    const logEntries = signal<LogEntry[]>([]);
    const logRef = ref<HTMLElement>();

    let refreshInterval: ReturnType<typeof setInterval> | null = null;

    function refreshLog(): void {
      logEntries.value = ringBuffer.slice(-50) as LogEntry[];

      // Reflects the DOM `each()` just synchronously updated above (ripple effects run
      // synchronously on the signal write, same tick) — safe to read the new scrollHeight now.
      const container = logRef.value;

      if (container) container.scrollTop = container.scrollHeight;
    }

    function stopRefresh(): void {
      if (refreshInterval !== null) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    }

    onCleanup(stopRefresh);

    const onExpand = (): void => {
      refreshLog();
      refreshInterval ??= setInterval(refreshLog, 500);
    };

    return html`
      <h1>${() => t('settings.title')}</h1>

      <section class="settings-view__group">
        <h2>${() => t('settings.preferencesGroup')}</h2>

        <div class="settings-view__row">
          <ore-icon name="languages" size="18" stroke-width="2"></ore-icon>
          <div class="settings-view__row-text">
            <span class="settings-view__row-label">${() => t('settings.languageLabel')}</span>
          </div>
          <div class="settings-view__option-buttons" role="group" :aria-label=${() => t('settings.languageLabel')}>
            ${each(
              LANGUAGES,
              (lang) => lang.code,
              (lang) =>
                html`<ore-button
                  size="sm"
                  :variant=${() => (currentLocale.value === lang.value.code ? 'solid' : 'bordered')}
                  @click=${() => setLocale(lang.value.code)}
                  >${() => lang.value.label}</ore-button
                >`,
            )}
          </div>
        </div>

        <div class="settings-view__row">
          <ore-icon name="palette" size="18" stroke-width="2"></ore-icon>
          <div class="settings-view__row-text">
            <span class="settings-view__row-label">${() => t('settings.themeLabel')}</span>
            <span class="settings-view__row-hint">${() => t('settings.themeHint')}</span>
          </div>
          <div class="settings-view__option-buttons" role="group" :aria-label=${() => t('settings.themeLabel')}>
            ${each(
              THEMES,
              (theme) => theme.code,
              (theme) =>
                html`<ore-button
                  size="sm"
                  :variant=${() => (themePreference.value === theme.value.code ? 'solid' : 'bordered')}
                  @click=${() => setThemePreference(theme.value.code)}
                  >${() => theme.value.label()}</ore-button
                >`,
            )}
          </div>
        </div>

        <div class="settings-view__row">
          <ore-icon name="user" size="18" stroke-width="2"></ore-icon>
          <div class="settings-view__row-text">
            <span class="settings-view__row-hint">${() => t('settings.userHint')}</span>
          </div>
          <ore-select
            :label=${() => t('settings.userLabel')}
            :options=${USER_OPTIONS}
            :value=${() => currentUser.value.id}
            @change=${(e: Event) => {
              const selected = (e as CustomEvent<{ values: string[] }>).detail.values[0];
              const user = seedUsers.find((u) => u.id === selected);

              if (user) currentUser.value = user;
            }}></ore-select>
        </div>
      </section>

      <section class="settings-view__group">
        <h2>${() => t('settings.developerGroup')}</h2>
        <ore-accordion>
          <ore-accordion-item @expand=${onExpand} @collapse=${stopRefresh}>
            <ore-icon slot="prefix" name="terminal" size="18" stroke-width="2"></ore-icon>
            <span slot="title">${() => t('settings.debugLogLabel')}</span>
            <span slot="subtitle">${() => t('settings.debugLogHint')}</span>
            <div class="settings-view__debug-log" ref=${logRef}>
              ${when(
                () => logEntries.value.length === 0,
                () => html`<p class="settings-view__debug-empty">${() => t('settings.noLogEntries')}</p>`,
                () =>
                  html`${each(
                    // Index as key is normally discouraged (see each()'s own docs) because it
                    // causes stale DOM reuse across reorders — but these rows are read-only text
                    // with no per-item state/animation to preserve, `LogEntry` has no natural
                    // unique id, and entries here only ever append/trim from a fixed-size ring
                    // buffer (never reorder), so the one caveat that actually matters doesn't apply.
                    logEntries,
                    (_entry, i) => i,
                    (entry) =>
                      html`<div class="settings-view__debug-entry">
                        <span class="settings-view__debug-ts">${() => formatTimestamp(entry.value.timestamp)}</span>
                        <span
                          class="settings-view__debug-level"
                          :style=${() => `color:${LEVEL_COLORS[entry.value.level] ?? '#ccc'}`}
                          >${() => entry.value.level.toUpperCase()}</span
                        >
                        <span class="settings-view__debug-msg">${() => entry.value.message ?? '(no message)'}</span>
                      </div>`,
                  )}`,
              )}
            </div>
          </ore-accordion-item>
        </ore-accordion>
      </section>
    `;
  },
  shadow: false,
});

export function createSettingsView(): HTMLElement {
  const el = document.createElement('settings-view');

  el.className = 'settings-view';

  return el;
}
