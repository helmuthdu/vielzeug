import { fromRoomPresence } from '@vielzeug/flux/pulse';
import { toSignal } from '@vielzeug/flux/ripple';
import { animate } from '@vielzeug/necromancer';
import { createPulse } from '@vielzeug/pulse';
import { computed } from '@vielzeug/ripple';
import { bus } from './events';
import { crmData, prependActivity } from './store';

interface PresenceUser {
  name: string;
}
type Schema = { rooms: { crm: { presence: PresenceUser } } };

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 1;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  constructor() {
    setTimeout(() => this.onopen?.(new Event('open')), 0);
    setTimeout(() => {
      this.emit({ room: 'crm', type: 'joined' });
      this.emit({ id: 'john', room: 'crm', state: { name: 'John Becker' }, type: 'presence_join' });
      this.emit({ id: 'maria', room: 'crm', state: { name: 'Maria Silva' }, type: 'presence_join' });
    }, 60);
  }
  send(): void {}
  close(): void {}
  private emit(frame: object): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(frame) }));
  }
}

let presenceBinding: ReturnType<typeof toSignal<ReadonlyMap<string, PresenceUser>>> | null = null;
const emptyPresence: ReadonlyMap<string, PresenceUser> = new Map();
export const presence = {
  get value(): ReadonlyMap<string, PresenceUser> {
    return presenceBinding?.value ?? emptyPresence;
  },
};
export const presenceCount = computed(() => presence.value.size);

export function setupRealtime(): void {
  (globalThis as Record<string, unknown>).WebSocket = MockWebSocket;
  const pulse = createPulse<Schema>('wss://vielzeug-crm.invalid/ws');
  void pulse.connect();
  presenceBinding = toSignal(fromRoomPresence(pulse.room('crm')), { initial: new Map<string, PresenceUser>() });
}

export function simulateLiveActivity(): void {
  const opportunity =
    crmData.value.opportunities.find((item) => item.stage === 'proposal') ?? crmData.value.opportunities[0];
  const description = `updated ${opportunity.name} from another workspace`;
  prependActivity({
    actor: 'Maria Silva',
    category: 'system',
    companyId: opportunity.companyId,
    createdAt: new Date().toISOString(),
    description,
    id: `activity-${crypto.randomUUID()}`,
    kind: 'opportunity.updated',
    opportunityId: opportunity.id,
  });
  bus.emit('activity:add', { actor: 'Maria Silva', description, opportunityId: opportunity.id });
  bus.emit('toast:show', { message: 'Live activity received from Maria Silva.', variant: 'info' });
  requestAnimationFrame(() => {
    const item = document.querySelector('crm-activity-item');
    if (!item) return;
    const animation = animate(
      item,
      [
        { opacity: 0.4, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    void animation.result.finally(() => animation.dispose());
  });
}
