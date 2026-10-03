import '@vielzeug/refine/chat-panel';

import { shouldReduceMotion } from '@vielzeug/necromancer';
import { define, getHost, html, prop, ref } from '@vielzeug/ore';
import type { ChatPanelElement, OreChatPanelMessage, OreChatPanelSuggestion } from '@vielzeug/refine/chat-panel';
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

/**
 * App-specific wrapper around `ore-chat-panel`. It owns only what is unique to the
 * model advisor: the scripted replies, per-model/per-locale transcript persistence,
 * and the "scroll to spec section" action semantics. All presentation, transcript
 * rendering, suggestions, composer, Escape, and focus handling come from the panel.
 */
define<ModelAdvisorProps>(MODEL_ADVISOR_TAG, {
  props: { model: prop.data<Model>() },
  setup(props) {
    const host = getHost() as ModelAdvisorElement;
    const panel = ref<ChatPanelElement>();
    const messages = signal<AdvisorMessage[]>([]);

    const model = () => props.model.value!;
    // The panel renders a plain message array; map the advisor's richer shape
    // (action.section) into the panel's opaque action payload.
    const panelMessages = (): OreChatPanelMessage[] =>
      messages.value.map((message) => ({
        sender: message.sender,
        text: message.text,
        ...(message.action ? { action: { label: message.action.label, payload: message.action.section } } : {}),
      }));
    const panelSuggestions = (): OreChatPanelSuggestion[] =>
      (['fit', 'space', 'performance', 'ownership'] as const).map((key) => ({
        label: t(`modelAdvisor.suggestionLabels.${key}`),
        value: t(`modelAdvisor.questions.${key}`),
      }));

    host.open = (trigger) => {
      if (!props.model.value) return;
      messages.value = loadMessages(model());
      panel.value?.show(trigger);
    };

    const onSend = (event: Event): void => {
      const text = (event as CustomEvent<{ text: string }>).detail.text;
      messages.value = [
        ...messages.value,
        { sender: 'user', text },
        { sender: 'assistant', ...replyFor(text, model()) },
      ];
      sessionStorage.setItem(storageKey(model()), JSON.stringify(messages.value));
    };

    const onAction = (event: Event): void => {
      const section = (event as CustomEvent<{ payload: AdvisorAction['section'] }>).detail.payload;
      panel.value?.hide();
      document.getElementById(`model-${section}`)?.scrollIntoView({
        behavior: shouldReduceMotion('system') ? 'auto' : 'smooth',
      });
    };

    const onReset = (): void => {
      messages.value = initialMessages(model());
      sessionStorage.removeItem(storageKey(model()));
    };

    return html`
      <ore-chat-panel
        label=${() => t('modelAdvisor.title')}
        labels=${() => ({
          assistantName: t('modelAdvisor.guide'),
          close: t('modelAdvisor.close'),
          composerLabel: t('modelAdvisor.messageLabel'),
          composerPlaceholder: t('modelAdvisor.placeholder'),
          conversation: t('modelAdvisor.conversation'),
          startOver: t('modelAdvisor.startOver'),
          status: t('modelAdvisor.status'),
          suggestions: t('modelAdvisor.suggestions'),
        })}
        messages=${panelMessages}
        ref=${panel}
        suggestions=${panelSuggestions}
        @send=${onSend}
        @action=${onAction}
        @reset=${onReset}></ore-chat-panel>
    `;
  },
  shadow: false,
});
