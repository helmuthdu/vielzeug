// Errors

export type { AutoUpdateOptions } from './auto-update';
// Auto-update
export { autoUpdate } from './auto-update';
// Core engine
export { computePosition, computePositionAsync, computePositionRaf, getRects } from './core';
export { OrbitConfigError, OrbitError } from './errors';
export type { Positioner, PositionerOptions, PositionStrategy } from './float';
// High-level API
export { createPositioner } from './float';
export type { InlineOptions } from './inline';
export { inline } from './inline';
export type { ArrowOptions } from './middleware/arrow';
// Middleware
export { arrow } from './middleware/arrow';
export type { AutoPlacementOptions } from './middleware/auto-placement';
export { autoPlacement } from './middleware/auto-placement';
export type { FlipOptions } from './middleware/flip';
export { flip } from './middleware/flip';
export type { HideOptions } from './middleware/hide';
export { hide } from './middleware/hide';
export type { OffsetConfig, OffsetValue } from './middleware/offset';

export { offset } from './middleware/offset';
export type { LimitShiftOptions, ShiftLimiter, ShiftOptions } from './middleware/shift';

export { limitShift, shift } from './middleware/shift';
export type { SizeOptions } from './middleware/size';

export { size } from './middleware/size';
export { detectOverflow, getClippingAncestorRect } from './overflow';

// Preset types (functions live on the @vielzeug/orbit/presets sub-path)
export type { PositioningPreset, PresetOptions } from './presets';
// Types
export type {
  Alignment,
  ArrowData,
  ComputePositionOptions,
  ComputePositionResult,
  DetectOverflowOptions,
  FlipData,
  HideData,
  Middleware,
  MiddlewareData,
  MiddlewareReset,
  MiddlewareResult,
  MiddlewareState,
  Padding,
  Placement,
  Rect,
  ReferenceElement,
  ShiftData,
  Side,
  SideObject,
  SizeData,
  VirtualReference,
} from './types';
// Public utilities
export { getAlignment, getSide } from './utils';
