import '@vielzeug/refine/avatar';
import '@vielzeug/refine/button';
import '@vielzeug/refine/chat-message';
import '@vielzeug/refine/chip';
import '@vielzeug/refine/message-composer';
import { define, getHost, html, ref, when } from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';
import type { RouteName } from '../../core/router';
import { navigate } from '../navigation';

type SupportAction = { label: string; params?: Record<string, string>; route: RouteName };
type SupportMessage = { action?: SupportAction; sender: 'assistant' | 'user'; text: string };
type TravelSupportChatElement = HTMLElement & { open(returnFocus?: HTMLElement): void };

const TRAVEL_SUPPORT_CHAT_TAG = 'travel-support-chat';
const TRAVEL_SUPPORT_CHAT_OPEN_KEY = 'voyage-support-chat-open';
const TRAVEL_SUPPORT_CHAT_MESSAGES_KEY = 'voyage-support-chat-messages';
const initialMessages = (): SupportMessage[] => [
  {
    sender: 'assistant',
    text: 'Hi Avery — I can help with booking references, reservation changes, or finding another stay.',
  },
];

const isSupportMessage = (value: unknown): value is SupportMessage => {
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
    (action.route === 'bookings' || action.route === 'search' || action.route === 'trip') &&
    (action.params === undefined ||
      (!!action.params &&
        typeof action.params === 'object' &&
        Object.entries(action.params).every(
          ([key, item]) => key.length <= 50 && typeof item === 'string' && item.length <= 200,
        )))
  );
};

const loadMessages = (): SupportMessage[] => {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(TRAVEL_SUPPORT_CHAT_MESSAGES_KEY) ?? 'null');
    return Array.isArray(value) && value.length > 0 && value.every(isSupportMessage) ? value : initialMessages();
  } catch {
    return initialMessages();
  }
};

const saveMessages = (messages: SupportMessage[]): void => {
  sessionStorage.setItem(TRAVEL_SUPPORT_CHAT_MESSAGES_KEY, JSON.stringify(messages));
};

export function openTravelSupportChat(event?: Event): void {
  const returnFocus = event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
  const open = () => document.querySelector<TravelSupportChatElement>(TRAVEL_SUPPORT_CHAT_TAG)?.open(returnFocus);
  const chat = document.querySelector<TravelSupportChatElement>(TRAVEL_SUPPORT_CHAT_TAG);
  if (typeof chat?.open === 'function') open();
  else void customElements.whenDefined(TRAVEL_SUPPORT_CHAT_TAG).then(() => queueMicrotask(open));
}

const replyFor = (message: string): Omit<SupportMessage, 'sender'> => {
  const query = message.toLowerCase();
  if (query.includes('reference')) {
    return {
      action: { label: 'Open bookings', route: 'bookings' },
      text: 'Open any booking and you’ll find its reference in the Reservation section.',
    };
  }
  if (query.includes('change') || query.includes('cancel')) {
    return {
      action: { label: 'Manage bookings', route: 'bookings' },
      text: 'Open the booking you want to manage and keep its reference handy. Changes are simulated in this demo, so no real reservation is affected.',
    };
  }
  if (query.includes('stay') || query.includes('hotel')) {
    return {
      action: { label: 'Find a stay', route: 'search' },
      text: 'Compare available hotels, prices, ratings, and amenities on the stays search.',
    };
  }
  return {
    action: { label: 'View itinerary', params: { id: 'japan-october' }, route: 'trip' },
    text: 'I can help with booking references, reservation changes, or finding another stay. Choose a suggestion or ask in your own words.',
  };
};

define(TRAVEL_SUPPORT_CHAT_TAG, {
  setup() {
    const el = getHost() as TravelSupportChatElement;
    const chatOpen = signal(sessionStorage.getItem(TRAVEL_SUPPORT_CHAT_OPEN_KEY) === 'true');
    const chatMessages = signal<SupportMessage[]>(loadMessages());
    const messageList = ref<HTMLElement>();
    const panel = ref<HTMLElement>();
    let returnFocus: HTMLElement | undefined;
    const close = (): void => {
      chatOpen.value = false;
      sessionStorage.removeItem(TRAVEL_SUPPORT_CHAT_OPEN_KEY);
      requestAnimationFrame(() => returnFocus?.focus());
    };
    el.open = (trigger) => {
      returnFocus = trigger;
      chatOpen.value = true;
      sessionStorage.setItem(TRAVEL_SUPPORT_CHAT_OPEN_KEY, 'true');
      requestAnimationFrame(() => panel.value?.focus());
    };
    const scrollToLatest = (): void => {
      requestAnimationFrame(() =>
        messageList.value?.scrollTo({ behavior: 'auto', top: messageList.value.scrollHeight }),
      );
    };
    const sendMessage = (message: string): void => {
      const text = message.trim();
      if (!text) return;
      chatMessages.value = [
        ...chatMessages.value,
        { sender: 'user', text },
        { sender: 'assistant', ...replyFor(text) },
      ];
      saveMessages(chatMessages.value);
      scrollToLatest();
    };
    const sendSuggestion = (event: Event, message: string): void => {
      if (event instanceof CustomEvent) sendMessage(message);
    };
    const reset = (): void => {
      chatMessages.value = initialMessages();
      sessionStorage.removeItem(TRAVEL_SUPPORT_CHAT_MESSAGES_KEY);
    };

    return html`
      <aside
        class="support-chat-window"
        role="region"
        aria-label="Voyage support"
        tabindex="-1"
        ?hidden=${() => !chatOpen.value}
        ref=${panel}
        @keydown=${(event: KeyboardEvent) => {
          if (event.key === 'Escape') close();
        }}>
        <header class="support-chat__header">
          <div>
            <strong>Voyage support</strong>
            <span class="support-chat__status"><i></i>Demo assistant · replies instantly</span>
          </div>
          <div class="support-chat__tools">
            ${when(
              () => chatMessages.value.length > 1,
              () => html`
                <ore-button size="sm" variant="text" @click=${reset}>
                  Start over
                </ore-button>
              `,
            )}
            <ore-button icon-only label="Close Voyage support" size="sm" variant="ghost" @click=${close}>
              <ore-icon name="x" size="17" aria-hidden="true"></ore-icon>
            </ore-button>
          </div>
        </header>
        <div class="support-chat__body">
          <div
            class="support-chat__messages"
            role="log"
            aria-live="polite"
            aria-label="Conversation with Voyage support"
            ref=${messageList}>
            ${() =>
              chatMessages.value.map(
                (message) => html`
                  <ore-chat-message
                    sender=${message.sender}
                    name=${message.sender === 'assistant' ? 'Voyage guide' : null}>
                    ${
                      message.sender === 'assistant'
                        ? html`
                          <ore-avatar slot="avatar" initials="V" size="sm" color="primary"></ore-avatar>
                        `
                        : ''
                    }
                    ${message.text}
                    ${
                      message.action
                        ? html`
                          <ore-button
                            slot="actions"
                            size="sm"
                            variant="text"
                            @click=${() => navigate(message.action!.route, message.action!.params)}>
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
            () => chatMessages.value.length === 1,
            () => html`
              <div class="support-chat__suggestions" role="group" aria-label="Suggested questions">
                <ore-chip
                  mode="action"
                  variant="outline"
                  @click=${(event: Event) => sendSuggestion(event, 'Where is my booking reference?')}>
                  Booking reference
                </ore-chip>
                <ore-chip
                  mode="action"
                  variant="outline"
                  @click=${(event: Event) => sendSuggestion(event, 'I need to change a reservation')}>
                  Change a booking
                </ore-chip>
                <ore-chip
                  mode="action"
                  variant="outline"
                  @click=${(event: Event) => sendSuggestion(event, 'Help me find another stay')}>
                  Find another stay
                </ore-chip>
              </div>
            `,
          )}
        </div>
        <div class="support-chat__composer">
          <ore-message-composer
            color="primary"
            fullwidth
            label="Message Voyage support"
            maxlength="240"
            placeholder="Ask about a reservation…"
            variant="flat"
            @send=${(event: CustomEvent<{ value: string }>) => sendMessage(event.detail.value)}></ore-message-composer>
        </div>
      </aside>
    `;
  },
  shadow: false,
});
