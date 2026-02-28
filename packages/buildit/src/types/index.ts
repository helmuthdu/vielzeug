/**
 * BuildIt Component Types
 *
 * Central export point for all TypeScript types used in BuildIt components.
 */

// Export all event types
export * from './events';
// Export all shared types
export * from './shared';

// Component-specific types will be imported from their respective files
// This allows consumers to import types like:
// import type { ButtonProps, ThemeColor, BitCheckboxChangeEvent } from '@vielzeug/buildit/types';
