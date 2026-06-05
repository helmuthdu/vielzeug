// IMPORTANT: Registration order matters for context injection.
// Parents must be registered (customElements.define) before children,
// otherwise inject() cannot find the context when elements upgrade from static HTML.
export { ACCORDION_CTX, ACCORDION_TAG } from './accordion/accordion';
export type { AccordionContext, SgAccordionEvents, SgAccordionProps } from './accordion/accordion';
export { TABS_CTX, TABS_TAG } from './tabs/tabs';
export type { SgTabsEvents, SgTabsProps, TabsContext } from './tabs/tabs';
export { ACCORDION_ITEM_TAG } from './accordion-item/accordion-item';
export type { SgAccordionItemEvents, SgAccordionItemProps } from './accordion-item/accordion-item';
export { TAB_ITEM_TAG } from './tab-item/tab-item';
export type { SgTabItemProps } from './tab-item/tab-item';
export { TAB_PANEL_TAG } from './tab-panel/tab-panel';
export type { SgTabPanelProps } from './tab-panel/tab-panel';
