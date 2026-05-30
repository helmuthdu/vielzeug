// Core engine
export { computePosition, getRects } from './core';
export { detectOverflow } from './overflow';

// High-level API
export { float } from './float';
export type { FloatOptions } from './float';

// Auto-update
export { autoUpdate } from './auto-update';
export type { AutoUpdateOptions } from './auto-update';

// Middleware composition utility
export { compose } from './compose';

// Middleware
export { arrow } from './middleware/arrow';
export type { ArrowOptions } from './middleware/arrow';

export { autoPlacement } from './middleware/auto-placement';
export type { AutoPlacementOptions } from './middleware/auto-placement';

export { flip } from './middleware/flip';
export type { FlipOptions } from './middleware/flip';

export { hide } from './middleware/hide';
export type { HideOptions } from './middleware/hide';

export { offset } from './middleware/offset';
export type { OffsetConfig, OffsetValue } from './middleware/offset';

export { shift } from './middleware/shift';
export type { LimitShiftOptions, ShiftLimiter, ShiftOptions } from './middleware/shift';
export { limitShift } from './middleware/shift';

export { size } from './middleware/size';
export type { SizeApplyArgs, SizeOptions } from './middleware/size';

// Preset types (functions live on the @vielzeug/orbit/presets sub-path)
export type { PositioningPreset, PresetOptions } from './presets';

// Public utilities
export { getAlignment, getSide } from './utils';

// Types
export type {
  Alignment,
  ArrowData,
  ComputePositionOptions,
  ComputePositionResult,
  DetectOverflowOptions,
  FloatHandle,
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
  Side,
  SideObject,
  SizeData,
  VirtualReference,
} from './types';
