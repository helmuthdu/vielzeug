import '@vielzeug/refine/avatar';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chat-message';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/icon';
import '@vielzeug/refine/message-composer';

import { define, getHost, html, onCleanup, onMounted, prop, ref, when } from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';
import { currentLocale, t } from '../../core/i18n';
import type { Model } from '../../core/types';

type AdvisorAction = { label: string; section: 'specifications' | 'trims' };
type AdvisorMessage = { action?: AdvisorAction; sender: 'assistant' | 'user'; text: string };
type ModelAdvisorProps = { model?: Model };
type ModelAdvisorElement = HTMLElement & { open(returnFocus?: HTMLElement): void };

const MODEL_ADVISOR_TAG = 'model-advisor-chat';
const storageKey = (model: Model): string => `eshop-model-advisor-${model.id}-${currentLocale.value}`;
const initialMessages = (model: Model): AdvisorMessage[] => [
  { sender: 'assistant', text: t('modelAdvisor.welcome', { name: model.name }) },
];

const isAdvisorMessage = (value: unknown): value is AdvisorMessage => {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  if (
    (message.sender !== 'assistant' && message.sender !== 'user') ||
    typeof message.text !== 'string' ||
    message.text.length > 1000
  )
    return false;
  if (message.action === undefined) return true;
  if (!message.action || typeof message.action !== 'object') return false;
  const action = message.action as Record<string, unknown>;
  return (
    typeof action.label === 'string' &&
    action.label.length <= 100 &&
    (action.section === 'specifications' || action.section === 'trims')
  );
};

const loadMessages = (model: Model): AdvisorMessage[] => {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey(model)) ?? 'null');
    return Array.isArray(value) && value.length > 0 && value.every(isAdvisorMessage) ? value : initialMessages(model);
  } catch {
    return initialMessages(model);
  }
};

const replyFor = (message: string, model: Model): Omit<AdvisorMessage, 'sender'> => {
  const query = message.toLocaleLowerCase(currentLocale.value);
  if (/fit|right|suit|pas+|geeignet/.test(query)) {
    return {
      text: t('modelAdvisor.fitReply', {
        body: t(`catalog.bodyTypes.${model.bodyType}`),
        name: model.name,
        powertrain: t(`catalog.powertrains.${model.powertrain}`),
        seats: model.seats,
      }),
    };
  }
  if (/range|electric|battery|fuel|verbrauch|reichweite|batterie|kraftstoff/.test(query)) {
    const efficiency = model.rangeKm !== null ? `${model.rangeKm} km` : `${model.fuelEconomyLPer100Km} L/100 km`;
    return {
      action: { label: t('modelAdvisor.viewSpecs'), section: 'specifications' },
      text: t('modelAdvisor.efficiencyReply', { name: model.name, value: efficiency }),
    };
  }
  if (/space|room|cargo|seat|practical|platz|gepäck|sitz|alltag/.test(query)) {
    return {
      action: { label: t('modelAdvisor.viewSpecs'), section: 'specifications' },
      text: t('modelAdvisor.spaceReply', {
        cargo: model.technical.cargoLitres,
        name: model.name,
        seats: model.seats,
      }),
    };
  }
  if (/power|speed|performance|quick|leistung|geschwindigkeit|beschleunigung/.test(query)) {
    return {
      action: { label: t('modelAdvisor.viewSpecs'), section: 'specifications' },
      text: t('modelAdvisor.performanceReply', {
        acceleration: model.zeroToHundredSec,
        name: model.name,
        power: model.technical.powerKw,
      }),
    };
  }
  if (/delivery|warranty|service|liefer|garantie|wartung/.test(query)) {
    return {
      action: { label: t('modelAdvisor.viewSpecs'), section: 'specifications' },
      text: t('modelAdvisor.ownershipReply', {
        delivery: model.technical.deliveryWeeks,
        name: model.name,
        warranty: model.technical.warrantyYears,
      }),
    };
  }
  if (/trim|package|configuration|price|ausstattung|paket|konfiguration|preis/.test(query)) {
    return {
      action: { label: t('modelAdvisor.viewConfigurations'), section: 'trims' },
      text: t('modelAdvisor.configurationReply', { count: model.trims.length, name: model.name }),
    };
  }
  return {
    text: t('modelAdvisor.generalReply', { name: model.name }),
  };
};

export function openModelAdvisorChat(event?: Event): void {
  const returnFocus = event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
  const open = () => document.querySelector<ModelAdvisorElement>(MODEL_ADVISOR_TAG)?.open(returnFocus);
  const chat = document.querySelector<ModelAdvisorElement>(MODEL_ADVISOR_TAG);
  if (typeof chat?.open === 'function') open();
  else void customElements.whenDefined(MODEL_ADVISOR_TAG).then(() => queueMicrotask(open));
}

define<ModelAdvisorProps>(MODEL_ADVISOR_TAG, {
  props: { model: prop.data<Model>() },
  setup(props) {
    const host = getHost() as ModelAdvisorElement;
    const open = signal(false);
    const messages = signal<AdvisorMessage[]>([]);
    const messageList = ref<HTMLElement>();
    const panel = ref<HTMLElement>();
    let returnFocus: HTMLElement | undefined;
    const model = () => props.model.value!;
    const close = (): void => {
      open.value = false;
      requestAnimationFrame(() => returnFocus?.focus());
    };
    host.open = (trigger) => {
      if (!props.model.value) return;
      returnFocus = trigger;
      messages.value = loadMessages(model());
      open.value = true;
      requestAnimationFrame(() => panel.value?.focus());
    };
    const save = (): void => sessionStorage.setItem(storageKey(model()), JSON.stringify(messages.value));
    const scrollToLatest = (): void => {
      requestAnimationFrame(() =>
        messageList.value?.scrollTo({ behavior: 'auto', top: messageList.value.scrollHeight }),
      );
    };
    const sendMessage = (message: string): void => {
      const text = message.trim();
      if (!text) return;
      messages.value = [
        ...messages.value,
        { sender: 'user', text },
        { sender: 'assistant', ...replyFor(text, model()) },
      ];
      save();
      scrollToLatest();
    };
    const reset = (): void => {
      messages.value = initialMessages(model());
      sessionStorage.removeItem(storageKey(model()));
    };
    const followAction = (action: AdvisorAction): void => {
      close();
      document.getElementById(`model-${action.section}`)?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && open.value) close();
    };
    onMounted(() => {
      document.addEventListener('keydown', closeOnEscape);
    });
    onCleanup(() => document.removeEventListener('keydown', closeOnEscape));

    return html`
      <aside
        class="model-advisor-window"
        role="region"
        aria-label=${() => t('modelAdvisor.title')}
        tabindex="-1"
        ?hidden=${() => !open.value}
        ref=${panel}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === 'Escape') close();
        }}>
        <header class="model-advisor__header">
          <div>
            <strong>${() => t('modelAdvisor.title')}</strong>
            <span class="model-advisor__status"><i class="model-advisor__status-dot"></i>${() => t('modelAdvisor.status')}</span>
          </div>
          <div class="model-advisor__tools">
            ${when(
              () => messages.value.length > 1,
              () =>
                html`<ore-button size="sm" variant="text" @click=${reset}>${() => t('modelAdvisor.startOver')}</ore-button>`,
            )}
            <ore-button icon-only label=${() => t('modelAdvisor.close')} size="sm" variant="ghost" @click=${close}>
              <ore-icon name="x" size="17" aria-hidden="true"></ore-icon>
            </ore-button>
          </div>
        </header>
        <div class="model-advisor__body">
          <div
            class="model-advisor__messages"
            role="log"
            aria-live="polite"
            aria-label=${() => t('modelAdvisor.conversation')}
            ref=${messageList}>
            ${() =>
              messages.value.map(
                (message) => html`
                  <ore-chat-message sender=${message.sender} name=${message.sender === 'assistant' ? t('modelAdvisor.guide') : null}>
                    ${
                      message.sender === 'assistant'
                        ? html`<ore-avatar slot="avatar" initials="V" size="sm" color="primary"></ore-avatar>`
                        : ''
                    }
                    ${message.text}
                    ${
                      message.action
                        ? html`
                          <ore-button slot="actions" size="sm" variant="text" @click=${() => followAction(message.action!)}>
                            ${message.action.label}
                            <ore-icon slot="suffix" name="arrow-right" size="14" aria-hidden="true"></ore-icon>
                          </ore-button>
                        `
                        : ''
                    }
                  </ore-chat-message>
                `,
              )}
          </div>
          ${when(
            () => messages.value.length === 1,
            () => html`
              <div class="model-advisor__suggestions" role="group" aria-label=${() => t('modelAdvisor.suggestions')}>
                ${(['fit', 'space', 'performance', 'ownership'] as const).map(
                  (suggestion) => html`
                    <ore-chip mode="action" variant="outline" @click=${() => sendMessage(t(`modelAdvisor.questions.${suggestion}`))}>
                      ${() => t(`modelAdvisor.suggestionLabels.${suggestion}`)}
                    </ore-chip>
                  `,
                )}
              </div>
            `,
          )}
        </div>
        <div class="model-advisor__composer">
          <ore-message-composer
            color="primary"
            fullwidth
            label=${() => t('modelAdvisor.messageLabel')}
            maxlength="240"
            placeholder=${() => t('modelAdvisor.placeholder')}
            variant="flat"
            @send=${(event: CustomEvent<{ value: string }>) => sendMessage(event.detail.value)}></ore-message-composer>
        </div>
      </aside>
    `;
  },
  shadow: false,
});
