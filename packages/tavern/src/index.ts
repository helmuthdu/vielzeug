// Public root surface of @vielzeug/tavern. Every public export goes through this file.

// The mesh peer rides tavern's own event payloads; re-exported so the tavern import
// alone types them.
export type { MeshPeer } from '@vielzeug/mesh';
export { TavernDisposedError, TavernError, TavernPairingError } from './errors';
export { joinTavern } from './guest';
export { hostTavern } from './host';
export type {
  TavernCommand,
  TavernCommands,
  TavernGuest,
  TavernGuestEvent,
  TavernGuestOptions,
  TavernHost,
  TavernHostEvent,
  TavernHostOptions,
  TavernJoinResult,
  TavernSubject,
} from './types';
