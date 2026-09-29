import '@vielzeug/refine/chat-panel';

import { define, getHost, html, onMounted, ref } from '@vielzeug/ore';
import { signal } from '@vielzeug/ripple';

import { type ChatPanelElement, type OreChatPanelMessage, type OreChatPanelSuggestion } from '@vielzeug/refine/chat-panel';

import type { RouteName } from '../../core/router';
import { navigateDynamic } from '../navigation';

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

const SUGGESTIONS: OreChatPanelSuggestion[] = [
  { label: 'Booking reference', value: 'Where is my booking reference?' },
  { label: 'Change a booking', value: 'I need to change a reservation' },
  { label: 'Find another stay', value: 'Help me find another stay' },
];

/**
 * App-specific wrapper around `ore-chat-panel`. It owns only what is unique to
 * Voyage support — the scripted replies, transcript persistence, the persisted
 * open state, and the "navigate to a route" action semantics. All presentation,
 * transcript rendering, suggestions, composer, Escape, and focus handling come
 * from the panel.
 */
define(TRAVEL_SUPPORT_CHAT_TAG, {
  setup() {
    const el = getHost() as TravelSupportChatElement;
    const panel = ref<ChatPanelElement>();
    const messages = signal<SupportMessage[]>(loadMessages());

    // The panel renders a plain message array; map the support action (route +
    // params) into the panel's opaque action payload.
    const panelMessages = (): OreChatPanelMessage[] =>
      messages.value.map((message) => ({
        sender: message.sender,
        text: message.text,
        ...(message.action
          ? { action: { label: message.action.label, payload: { params: message.action.params, route: message.action.route } } }
          : {}),
      }));

    // `show()` fires an open-change event, which persists the open state.
    el.open = (trigger) => panel.value?.show(trigger);

    const onSend = (event: Event): void => {
      const text = (event as CustomEvent<{ text: string }>).detail.text;
      messages.value = [...messages.value, { sender: 'user', text }, { sender: 'assistant', ...replyFor(text) }];
      saveMessages(messages.value);
    };

    const onAction = (event: Event): void => {
      const { params, route } = (event as CustomEvent<{ payload: { params?: Record<string, string>; route: RouteName } }>).detail.payload;
      panel.value?.hide();
      navigateDynamic(route, params);
    };

    const onOpenChange = (event: Event): void => {
      const { open } = (event as CustomEvent<{ open: boolean }>).detail;
      if (open) sessionStorage.setItem(TRAVEL_SUPPORT_CHAT_OPEN_KEY, 'true');
      else sessionStorage.removeItem(TRAVEL_SUPPORT_CHAT_OPEN_KEY);
    };

    const onReset = (): void => {
      messages.value = initialMessages();
      sessionStorage.removeItem(TRAVEL_SUPPORT_CHAT_MESSAGES_KEY);
    };

    // Restore the persisted open state once the panel element is available.
    onMounted(() => {
      if (sessionStorage.getItem(TRAVEL_SUPPORT_CHAT_OPEN_KEY) === 'true') panel.value?.show();
    });

    return html`
      <ore-chat-panel
        class="support-chat-panel"
        label="Voyage support"
        labels=${() => ({
          assistantName: 'Voyage guide',
          close: 'Close Voyage support',
          composerLabel: 'Message Voyage support',
          composerPlaceholder: 'Ask about a reservation…',
          conversation: 'Conversation with Voyage support',
        })}
        messages=${panelMessages}
        ref=${panel}
        suggestions=${SUGGESTIONS}
        @send=${onSend}
        @action=${onAction}
        @open-change=${onOpenChange}
        @reset=${onReset}></ore-chat-panel>
    `;
  },
  shadow: false,
});
