import { animate } from '@vielzeug/necromancer';
import { createPulse } from '@vielzeug/pulse';
import { MockWebSocket } from '@vielzeug/pulse/testing';
import type { Readable } from '@vielzeug/ripple';
import { computed, fromSubscribable } from '@vielzeug/ripple';
import { bus } from './events';
import { crmData, prependActivity } from './store';

interface PresenceUser {
  name: string;
}
type Schema = { rooms: { crm: { presence: PresenceUser } } };

// The wire-protocol stub comes from @vielzeug/pulse/testing; the demo only adds
// the scripted presence frames that make the workspace look busy.
class ScriptedWebSocket extends MockWebSocket {
  constructor(url: string, protocols?: string | string[]) {
    super(url, protocols, { autoOpen: true });
    setTimeout(() => {
      this.receive({ room: 'crm', type: 'joined' });
      this.receive({ id: 'john', room: 'crm', state: { name: 'John Becker' }, type: 'presence_join' });
      this.receive({ id: 'maria', room: 'crm', state: { name: 'Maria Silva' }, type: 'presence_join' });
    }, 60);
  }
}

let presenceBinding: Readable<ReadonlyMap<string, PresenceUser>> | null = null;
const emptyPresence: ReadonlyMap<string, PresenceUser> = new Map();
export const presence = {
  get value(): ReadonlyMap<string, PresenceUser> {
    return presenceBinding?.value ?? emptyPresence;
  },
};
export const presenceCount = computed(() => presence.value.size);

export function setupRealtime(): void {
  (globalThis as Record<string, unknown>).WebSocket = ScriptedWebSocket;
  const pulse = createPulse<Schema>('wss://vielzeug-crm.invalid/ws');
  void pulse.connect();
  const room = pulse.room('crm');
  presenceBinding = fromSubscribable(room.presence);
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
