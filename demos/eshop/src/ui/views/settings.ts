import '@vielzeug/refine/accordion';
import '@vielzeug/refine/accordion-item';
import '@vielzeug/refine/avatar';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/radio';
import '@vielzeug/refine/radio-group';
import '@vielzeug/refine/select';
import '@vielzeug/refine/slider';

import { define, each, html, onCleanup, ref, when } from '@vielzeug/ore';
import { computed, signal } from '@vielzeug/ripple';
import type { LogEntry } from '@vielzeug/rune';

import { currentUser } from '../../core/auth';
import { controlValue } from '../../core/control-value';
import { currentCurrency, SUPPORTED_CURRENCIES, setCurrency } from '../../core/currency';
import { bus } from '../../core/events';
import { currentLocale, setLocale, t } from '../../core/i18n';
import { ringBuffer } from '../../core/logger';
import { seedUsers } from '../../core/seed-data';
import {
  accentHue,
  DEFAULT_ACCENT_HUE,
  DEFAULT_THEME_PREFERENCE,
  setAccentHue,
  setThemePreference,
  type ThemePreference,
  themePreference,
} from '../../core/theme';
import type { Role } from '../../core/types';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#9ca3af',
  error: '#fb7185',
  fatal: '#f43f5e',
  info: '#60a5fa',
  warn: '#fbbf24',
};

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Deutsch', value: 'de' },
];
const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map(({ code }) => ({ label: code, value: code }));
const THEME_CHOICES: Array<{ icon: string; value: ThemePreference }> = [
  { icon: 'monitor', value: 'system' },
  { icon: 'sun', value: 'light' },
  { icon: 'moon', value: 'dark' },
];
const ACCENT_CHOICES = [
  { hue: 222, key: 'blue' },
  { hue: 168, key: 'teal' },
  { hue: 278, key: 'violet' },
  { hue: 24, key: 'coral' },
  { hue: 52, key: 'gold' },
] as const;

function isLanguage(value: string): value is 'de' | 'en' {
  return value === 'de' || value === 'en';
}

function isLogLevel(value: string): value is LogLevel {
  return LOG_LEVELS.includes(value as LogLevel);
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat(currentLocale.value === 'de' ? 'de-DE' : 'en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

function themeLabel(preference: ThemePreference): string {
  return t(`settings.theme${preference[0].toUpperCase()}${preference.slice(1)}`);
}

function roleLabel(role: Role): string {
  return t(`settings.role${role[0].toUpperCase()}${role.slice(1)}`);
}

function roleCapability(role: Role): string {
  return t(`settings.capability${role[0].toUpperCase()}${role.slice(1)}`);
}

define('settings-view', {
  setup() {
    const logEntries = signal<LogEntry[]>([]);
    const selectedLevels = signal<Set<LogLevel>>(new Set(LOG_LEVELS));
    const logPaused = signal(false);
    const debugExpanded = signal(false);
    const savedRecently = signal(false);
    const customAccentOpen = signal(!ACCENT_CHOICES.some(({ hue }) => hue === accentHue.value));
    const logRef = ref<HTMLElement>();
    const filteredLogs = computed(() =>
      logEntries.value.filter((entry) => isLogLevel(entry.level) && selectedLevels.value.has(entry.level)),
    );
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let savedTimer: ReturnType<typeof setTimeout> | null = null;

    const markSaved = (): void => {
      savedRecently.value = true;
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = setTimeout(() => {
        savedRecently.value = false;
      }, 1600);
    };

    const refreshLog = (): void => {
      const container = logRef.value;
      const stickToBottom = !container || container.scrollHeight - container.scrollTop - container.clientHeight < 24;
      const next = ringBuffer.slice(-100) as LogEntry[];
      const previous = logEntries.value;
      if (next.length === previous.length && next.at(-1)?.timestamp === previous.at(-1)?.timestamp) return;
      logEntries.value = next;
      if (stickToBottom) requestAnimationFrame(() => logRef.value?.scrollTo({ top: logRef.value.scrollHeight }));
    };

    const stopRefresh = (): void => {
      if (refreshInterval === null) return;
      clearInterval(refreshInterval);
      refreshInterval = null;
    };

    const startRefresh = (): void => {
      refreshLog();
      if (!logPaused.value) refreshInterval ??= setInterval(refreshLog, 1000);
    };

    const onExpand = (): void => {
      debugExpanded.value = true;
      startRefresh();
    };

    const onCollapse = (): void => {
      debugExpanded.value = false;
      stopRefresh();
    };

    const toggleLogLevel = (level: LogLevel): void => {
      const next = new Set(selectedLevels.value);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      selectedLevels.value = next;
    };

    const togglePause = (): void => {
      logPaused.value = !logPaused.value;
      if (logPaused.value) stopRefresh();
      else if (debugExpanded.value) startRefresh();
    };

    const clearLog = (): void => {
      ringBuffer.splice(0);
      logEntries.value = [];
    };

    const copyLog = async (): Promise<void> => {
      const text = filteredLogs.value
        .map(
          (entry) => `${entry.timestamp.toISOString()} ${entry.level.toUpperCase()} ${entry.message ?? '(no message)'}`,
        )
        .join('\n');
      try {
        await navigator.clipboard.writeText(text);
        bus.emit('toast:show', { message: t('settings.logCopied'), variant: 'success' });
      } catch {
        bus.emit('toast:show', { message: t('settings.logCopyFailed'), variant: 'error' });
      }
    };

    const resetPreferences = (): void => {
      void setLocale('en');
      setThemePreference(DEFAULT_THEME_PREFERENCE);
      setAccentHue(DEFAULT_ACCENT_HUE);
      setCurrency(SUPPORTED_CURRENCIES[0]);
      customAccentOpen.value = false;
      markSaved();
    };

    onCleanup(() => {
      stopRefresh();
      if (savedTimer) clearTimeout(savedTimer);
    });

    return html`
      <header class="settings-view__header">
        <div>
          <span class="settings-view__eyebrow">${() => t('settings.accountEyebrow')}</span>
          <h1>${() => t('settings.title')}</h1>
          <p>${() => t('settings.intro')}</p>
        </div>
        <div class="settings-view__header-actions">
          <span class="settings-view__save-status" role="status" aria-live="polite">
            <ore-icon name="check" size="14" aria-hidden="true"></ore-icon>
            ${() => t(savedRecently.value ? 'settings.saved' : 'settings.autoSave')}
          </span>
          <ore-button size="sm" variant="outline" @click=${resetPreferences}>
            <ore-icon slot="prefix" name="rotate-ccw" size="15" aria-hidden="true"></ore-icon>
            ${() => t('settings.reset')}
          </ore-button>
        </div>
      </header>

      <div class="settings-view__grid">
        <section class="settings-card settings-card--display" aria-labelledby="settings-display-title">
          <header class="settings-card__header">
            <span class="settings-card__icon"><ore-icon name="palette" size="18" aria-hidden="true"></ore-icon></span>
            <div>
              <h2 id="settings-display-title">${() => t('settings.displayGroup')}</h2>
              <p>${() => t('settings.displayHint')}</p>
            </div>
          </header>

          <div class="settings-field settings-field--stacked">
            <div class="settings-field__copy">
              <strong id="appearance-label">${() => t('settings.themeLabel')}</strong>
              <span class="settings-field__hint" id="appearance-hint">${() => t('settings.themeHint')}</span>
            </div>
            <div class="settings-theme-options" role="group" aria-labelledby="appearance-label" aria-describedby="appearance-hint">
              ${THEME_CHOICES.map(
                ({ icon, value }) => html`
                  <button
                    type="button"
                    class=${() => `settings-theme-option${themePreference.value === value ? ' is-selected' : ''}`}
                    aria-pressed=${() => String(themePreference.value === value)}
                    @click=${() => {
                      setThemePreference(value);
                      markSaved();
                    }}>
                    <ore-icon name=${icon} size="16" aria-hidden="true"></ore-icon>
                    <span>${() => themeLabel(value)}</span>
                  </button>
                `,
              )}
            </div>
          </div>

          <div class="settings-field settings-field--stacked">
            <div class="settings-field__copy">
              <strong id="accent-label">${() => t('settings.accentLabel')}</strong>
              <span class="settings-field__hint" id="accent-hint">${() => t('settings.accentHint')}</span>
            </div>
            <div class="settings-accent-options" role="group" aria-labelledby="accent-label" aria-describedby="accent-hint">
              ${ACCENT_CHOICES.map(
                ({ hue, key }) => html`
                  <button
                    type="button"
                    class="settings-accent-option"
                    style=${`--settings-accent-hue:${hue}deg`}
                    aria-label=${() => t(`settings.accent${key[0].toUpperCase()}${key.slice(1)}`)}
                    aria-pressed=${() => String(accentHue.value === hue)}
                    @click=${() => {
                      setAccentHue(hue);
                      customAccentOpen.value = false;
                      markSaved();
                    }}>
                    <span class="settings-accent-option__swatch"></span>
                    <ore-icon name="check" size="13" aria-hidden="true"></ore-icon>
                  </button>
                `,
              )}
              <button
                type="button"
                class=${() => `settings-accent-custom${customAccentOpen.value ? ' is-open' : ''}`}
                aria-expanded=${() => String(customAccentOpen.value)}
                aria-controls="custom-accent-control"
                @click=${() => {
                  customAccentOpen.value = !customAccentOpen.value;
                }}>
                <span class="settings-accent-custom__swatch"></span>
                ${() => t('settings.accentCustom')}
              </button>
            </div>
            ${when(
              customAccentOpen,
              () => html`
                <div class="settings-custom-accent" id="custom-accent-control">
                  <ore-slider
                    aria-label=${() => t('settings.accentCustom')}
                    min="0"
                    max="360"
                    fullwidth
                    value=${accentHue}
                    value-text=${() => t('settings.accentHueValue', { value: accentHue.value })}
                    @input=${(event: Event) => {
                      const hue = Number(controlValue(event));
                      if (Number.isFinite(hue)) setAccentHue(hue);
                    }}
                    @change=${markSaved}>${() => t('settings.accentCustom')}</ore-slider>
                  <output>${() => `${Math.round(accentHue.value)}°`}</output>
                </div>
              `,
            )}
          </div>

          <div class="settings-field">
            <div class="settings-field__identity">
              <span class="settings-field__icon"><ore-icon name="languages" size="17" aria-hidden="true"></ore-icon></span>
              <div class="settings-field__copy">
                <strong>${() => t('settings.languageLabel')}</strong>
                <span class="settings-field__hint">${() => t('settings.languageHint')}</span>
              </div>
            </div>
            <ore-select
              hide-label
              label=${() => t('settings.languageLabel')}
              options=${LANGUAGE_OPTIONS}
              value=${currentLocale}
              @change=${(event: Event) => {
                const locale = controlValue(event);
                if (locale && isLanguage(locale)) void setLocale(locale).then(markSaved);
              }}></ore-select>
          </div>
        </section>

        <section class="settings-card settings-card--shopping" aria-labelledby="settings-shopping-title">
          <header class="settings-card__header">
            <span class="settings-card__icon"><ore-icon name="shopping-bag" size="18" aria-hidden="true"></ore-icon></span>
            <div>
              <h2 id="settings-shopping-title">${() => t('settings.shoppingGroup')}</h2>
              <p>${() => t('settings.shoppingHint')}</p>
            </div>
          </header>
          <div class="settings-field">
            <div class="settings-field__identity">
              <span class="settings-field__icon"><ore-icon name="banknote" size="17" aria-hidden="true"></ore-icon></span>
              <div class="settings-field__copy">
                <strong>${() => t('settings.currencyLabel')}</strong>
                <span class="settings-field__hint">${() => t('settings.currencyHint')}</span>
              </div>
            </div>
            <ore-select
              hide-label
              label=${() => t('settings.currencyLabel')}
              options=${CURRENCY_OPTIONS}
              value=${() => currentCurrency.value.code}
              @change=${(event: Event) => {
                const selected = controlValue(event);
                const currency = SUPPORTED_CURRENCIES.find(({ code }) => code === selected);
                if (currency) {
                  setCurrency(currency);
                  markSaved();
                }
              }}></ore-select>
          </div>
        </section>

        <section class="settings-card settings-card--persona" aria-labelledby="settings-persona-title">
          <header class="settings-card__header">
            <span class="settings-card__icon"><ore-icon name="users" size="18" aria-hidden="true"></ore-icon></span>
            <div>
              <span class="settings-card__kicker">${() => t('settings.demoOnly')}</span>
              <h2 id="settings-persona-title">${() => t('settings.personaGroup')}</h2>
              <p>${() => t('settings.userHint')}</p>
            </div>
          </header>
          <ore-radio-group
            class="settings-personas"
            label=${() => t('settings.userLabel')}
            value=${() => currentUser.value.id}
            @change=${(event: Event) => {
              const selected = controlValue(event);
              const user = seedUsers.find(({ id }) => id === selected);
              if (user) {
                currentUser.value = user;
                markSaved();
              }
            }}>
            ${seedUsers.map(
              (user) => html`
                <ore-radio value=${user.id}>
                  <span class="settings-persona">
                    <ore-avatar initials=${initials(user.name)} size="sm"></ore-avatar>
                    <span class="settings-persona__identity">
                      <strong>${user.name}</strong>
                      <span class="settings-persona__capability">
                        ${() => `${roleLabel(user.role)} · ${roleCapability(user.role)}`}
                      </span>
                    </span>
                  </span>
                </ore-radio>
              `,
            )}
          </ore-radio-group>
        </section>

        <section class="settings-card settings-card--developer" aria-labelledby="settings-developer-title">
          <header class="settings-card__header">
            <span class="settings-card__icon"><ore-icon name="terminal" size="18" aria-hidden="true"></ore-icon></span>
            <div>
              <span class="settings-card__kicker">${() => t('settings.demoOnly')}</span>
              <h2 id="settings-developer-title">${() => t('settings.developerGroup')}</h2>
              <p>${() => t('settings.developerHint')}</p>
            </div>
          </header>
          <ore-accordion>
            <ore-accordion-item @expand=${onExpand} @collapse=${onCollapse}>
              <span slot="title">${() => t('settings.debugLogLabel')}</span>
              <span slot="subtitle">
                ${() => t('settings.debugLogSummary', { count: filteredLogs.value.length })}
              </span>
              <div class="settings-log-toolbar">
                <div class="settings-log-levels" role="group" aria-label=${() => t('settings.logLevels')}>
                  ${LOG_LEVELS.map(
                    (level) => html`
                      <ore-chip
                        mode="selectable"
                        size="sm"
                        ?checked=${() => selectedLevels.value.has(level)}
                        @change=${() => toggleLogLevel(level)}>${level.toUpperCase()}</ore-chip>
                    `,
                  )}
                </div>
                <div class="settings-log-actions">
                  <ore-button size="sm" variant="ghost" @click=${togglePause}>
                    <ore-icon
                      slot="prefix"
                      name=${() => (logPaused.value ? 'play' : 'pause')}
                      size="14"
                      aria-hidden="true"></ore-icon>
                    ${() => t(logPaused.value ? 'settings.logResume' : 'settings.logPause')}
                  </ore-button>
                  <ore-button size="sm" variant="ghost" ?disabled=${() => filteredLogs.value.length === 0} @click=${copyLog}>
                    <ore-icon slot="prefix" name="copy" size="14" aria-hidden="true"></ore-icon>
                    ${() => t('settings.logCopy')}
                  </ore-button>
                  <ore-button size="sm" variant="ghost" ?disabled=${() => logEntries.value.length === 0} @click=${clearLog}>
                    <ore-icon slot="prefix" name="trash-2" size="14" aria-hidden="true"></ore-icon>
                    ${() => t('settings.logClear')}
                  </ore-button>
                </div>
              </div>
              <div class="settings-view__debug-log" ref=${logRef} aria-label=${() => t('settings.debugLogLabel')}>
                ${when(
                  () => filteredLogs.value.length === 0,
                  () => html`
                    <p class="settings-view__debug-empty">${() => t('settings.noLogEntries')}</p>
                  `,
                  () => html`
                    ${each(
                      filteredLogs,
                      (entry) => `${entry.timestamp.toISOString()}-${entry.level}-${entry.message}`,
                      (entry) => html`
                        <div class="settings-view__debug-entry">
                          <time class="settings-view__debug-ts" datetime=${() => entry.value.timestamp.toISOString()}>
                            ${() => formatTimestamp(entry.value.timestamp)}
                          </time>
                          <span
                            class="settings-view__debug-level"
                            style=${() =>
                              `--settings-log-color:${isLogLevel(entry.value.level) ? LEVEL_COLORS[entry.value.level] : '#cbd5e1'}`}>
                            ${() => entry.value.level.toUpperCase()}
                          </span>
                          <span class="settings-view__debug-msg">${() => entry.value.message ?? '(no message)'}</span>
                        </div>
                      `,
                    )}
                  `,
                )}
              </div>
            </ore-accordion-item>
          </ore-accordion>
        </section>
      </div>
    `;
  },
  shadow: false,
});

export function createSettingsView(): HTMLElement {
  const element = document.createElement('settings-view');
  element.className = 'settings-view';
  return element;
}
