// Errors
export { OrbitConfigError, OrbitError } from './errors';

// Core engine
export { computePosition, computePositionAsync, computePositionRaf } from './core';
export { detectOverflow } from './overflow';

// High-level API
export { float, floatWithAnchor, isCssAnchorSupported } from './float';
export type { CssAnchorHandle, FloatOptions } from './float';

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

export { inline } from './inline';
export type { InlineOptions } from './inline';

export { offset } from './middleware/offset';
export type { OffsetConfig, OffsetValue } from './middleware/offset';

export { limitShift, shift } from './middleware/shift';
export type { LimitShiftOptions, ShiftLimiter, ShiftOptions } from './middleware/shift';

export { size } from './middleware/size';
export type { SizeOptions } from './middleware/size';

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
  FlipData,
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
  ShiftData,
  Side,
  SideObject,
  SizeData,
  TypedMiddleware,
  VirtualReference,
} from './types';
