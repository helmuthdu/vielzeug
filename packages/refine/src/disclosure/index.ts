// IMPORTANT: Registration order matters for context injection.
// Parents must be registered (customElements.define) before children,
// otherwise inject() cannot find the context when elements upgrade from static HTML.

export type { AccordionContext, OreAccordionEvents, OreAccordionProps } from './accordion/accordion';
export { ACCORDION_CTX, ACCORDION_TAG } from './accordion/accordion';
export type { OreAccordionItemEvents, OreAccordionItemProps } from './accordion-item/accordion-item';
export { ACCORDION_ITEM_TAG } from './accordion-item/accordion-item';
export type { OreTabItemProps } from './tab-item/tab-item';
export { TAB_ITEM_TAG } from './tab-item/tab-item';
export type { OreTabPanelProps } from './tab-panel/tab-panel';
export { TAB_PANEL_TAG } from './tab-panel/tab-panel';
export type { OreTabsEvents, OreTabsProps, TabsContext } from './tabs/tabs';
export { TABS_CTX, TABS_TAG } from './tabs/tabs';
