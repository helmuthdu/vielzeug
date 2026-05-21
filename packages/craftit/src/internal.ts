/**
 * @internal barrel — re-exports from focused utility modules.
 * Import directly from the specific module for new code.
 */
export * from './types/bindings';
export * from './utils/css';
export * from './utils/dom';
export * from './utils/emit';
// Note: _resetIdCounter is intentionally NOT re-exported here.
// It is imported directly in testing.ts to keep test internals out of the barrel.
export { CF_ID_ATTR, createId, createMarkerIdFactory, rekeyHtmlResult } from './utils/id';
