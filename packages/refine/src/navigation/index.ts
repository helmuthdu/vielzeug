// IMPORTANT: Registration order matters for context injection.
// Parents must be registered (customElements.define) before children,
// otherwise inject() cannot find the context when elements upgrade from static
// HTML. The child modules import their parent's context key, so ES module
// evaluation already guarantees the parent's define() runs first; the order
// below just keeps that fact readable.

export type { OreBreadcrumbItemProps, OreBreadcrumbProps } from './breadcrumb/breadcrumb';
export { BREADCRUMB_ITEM_TAG, BREADCRUMB_TAG } from './breadcrumb/breadcrumb';
export type {
  OreNavigationMenuEvents,
  OreNavigationMenuItemProps,
  OreNavigationMenuProps,
} from './navigation-menu/navigation-menu';
export {
  NAVIGATION_MENU_ITEM_TAG,
  NAVIGATION_MENU_PANEL_TAG,
  NAVIGATION_MENU_TAG,
} from './navigation-menu/navigation-menu';
export type { OrePaginationEvents, OrePaginationProps } from './pagination/pagination';
export { PAGINATION_TAG } from './pagination/pagination';
export type { OreStepProps } from './stepper/step';
export { STEP_TAG } from './stepper/step';
export type { OreStepperEvents, OreStepperProps, StepperContext } from './stepper/stepper';
export { STEPPER_CTX, STEPPER_TAG } from './stepper/stepper';
export type { OreTabItemProps } from './tab-item/tab-item';
export { TAB_ITEM_TAG } from './tab-item/tab-item';
export type { OreTabPanelProps } from './tab-panel/tab-panel';
export { TAB_PANEL_TAG } from './tab-panel/tab-panel';
export type { OreTabsEvents, OreTabsProps, TabsContext } from './tabs/tabs';
export { TABS_CTX, TABS_TAG } from './tabs/tabs';
