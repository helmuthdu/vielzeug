export const description = 'WebSocket client with auto-reconnect, message buffering, and more.';

export const loader = () => import('@vielzeug/pulse');

export const apiExports = [
  'createPulse',
  'AbortError',
  'ConnectionError',
  'DisposedError',
  'ProtocolError',
  'PulseError',
  'TimeoutError',
] as const;
