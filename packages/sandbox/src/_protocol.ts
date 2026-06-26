// Shared message-type constants for the host↔sandbox postMessage protocol.
// Both the createSandbox factory and the bridge script (embedded in every
// sandbox document) reference these values. Centralising them here makes a
// rename a compile error on the host side rather than a silent runtime mismatch.
//
// The bridge script is a plain-JS string and cannot import this module, so the
// string values ('ready', 'state-update', etc.) must stay stable. The constants
// exist to give the host side a single authoritative source of truth.

export const MSG = {
  CUSTOM: 'custom',
  ERROR: 'error',
  READY: 'ready',
  RESIZE: 'resize',
  STATE_UPDATE: 'state-update',
  STYLE_PATCH: 'style-patch',
} as const;

export type MsgType = (typeof MSG)[keyof typeof MSG];

export type HostToSandboxMsg =
  | { key: string; type: typeof MSG.STATE_UPDATE; value: unknown }
  | { css: string; id: string; type: typeof MSG.STYLE_PATCH };
