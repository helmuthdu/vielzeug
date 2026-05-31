/**
 * registration.ts — barrel re-export for component definition API.
 *
 * The implementation is split across:
 *   component-types.ts  — SetupContextBag, ComponentDefinition types
 *   base-element.ts     — BaseElement class and component lifecycle
 *   define.ts           — defineComponent() and define()
 */

export { ComponentPhase, LIFECYCLE_EVENTS } from './types';
export type { LifecycleEventName } from './types';

export type { ComponentDefinition, SetupContextBag } from './component-types';

export { define, prop } from './define';
export type { HostBindFn, InferPropsFromDefs, InferPropsSignals, PropDef, PropInputDefs, PropsDef } from './define';
