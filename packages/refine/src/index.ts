/**
 * Refine components register through their explicit component entry points.
 *
 * Keeping the package root free of registration side effects makes dependency
 * ownership and bundle contents obvious to application code.
 */

export { RefineError } from './errors';
export type { IconAttributes, IconDefinition, IconElement } from './icons';
export { registerIcons } from './icons';
export { eventFieldChecked, eventFieldValue } from './inputs/shared/native-field-event';
export { getMotionMode, MOTION_MODES, type MotionMode, setMotionMode } from './motion';
