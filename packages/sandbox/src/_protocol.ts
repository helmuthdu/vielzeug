export const MSG_CUSTOM = 'custom';
export const MSG_ERROR = 'error';
export const MSG_HTML_REPLACE = 'html-replace';
export const MSG_READY = 'ready';
export const MSG_RESIZE = 'resize';
export const MSG_STATE_UPDATE = 'state-update';
export const MSG_STATE_UPDATE_ALL = 'state-update-all';
export const MSG_STYLE_PATCH = 'style-patch';

export interface BridgeBootstrap {
  channel: string;
  generation: number;
}

export type ProtocolMessage = Record<string, unknown> & { channel: string; generation: number; type: string };

export function isProtocolMessage(value: unknown, bootstrap: BridgeBootstrap): value is ProtocolMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { channel?: unknown }).channel === 'string' &&
    (value as { channel: string }).channel === bootstrap.channel &&
    typeof (value as { generation?: unknown }).generation === 'number' &&
    (value as { generation: number }).generation === bootstrap.generation &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

export function createChannel(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint32Array(4));

  return Array.from(bytes, (byte) => byte.toString(16).padStart(8, '0')).join('');
}

export function envelope(bootstrap: BridgeBootstrap, message: Record<string, unknown>): ProtocolMessage {
  return { ...message, channel: bootstrap.channel, generation: bootstrap.generation } as ProtocolMessage;
}
