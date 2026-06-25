/**
 * Global HTMLElementTagNameMap augmentations for all block custom elements.
 * This file is the single source of truth for element type registrations.
 */

export {};

declare global {
  interface HTMLElementTagNameMap {
    // content
    'ore-avatar': HTMLElement & OreAvatarProps;
    'ore-avatar-group': HTMLElement & OreAvatarGroupProps;
    'ore-breadcrumb': HTMLElement & OreBreadcrumbProps;
    'ore-breadcrumb-item': HTMLElement & OreBreadcrumbItemProps;
    'ore-card': HTMLElement & OreCardProps & AddEventListeners<OreCardEvents>;
    'ore-icon': HTMLElement & OreIconProps;
    'ore-pagination': HTMLElement & OrePaginationProps & AddEventListeners<OrePaginationEvents>;
    'ore-separator': HTMLElement & OreSeparatorProps;
    'ore-table': HTMLElement & OreTableProps;
    'ore-text': HTMLElement & OreTextProps;
    // table markers (light-DOM authoring API used by ore-table)
    'ore-tr': HTMLElement & { foot?: boolean; head?: boolean };
    'ore-th': HTMLElement & {
      abbr?: string;
      axis?: string;
      colspan?: number | string;
      headers?: string;
      rowspan?: number | string;
      scope?: 'col' | 'colgroup' | 'row' | 'rowgroup' | string;
    };
    'ore-td': HTMLElement & {
      colspan?: number | string;
      headers?: string;
      rowspan?: number | string;
    };
    // disclosure
    'ore-accordion': HTMLElement & OreAccordionProps & AddEventListeners<OreAccordionEvents>;
    'ore-accordion-item': HTMLElement & OreAccordionItemProps & AddEventListeners<OreAccordionItemEvents>;
    'ore-tab-item': HTMLElement & OreTabItemProps;
    'ore-tab-panel': HTMLElement & OreTabPanelProps;
    'ore-tabs': HTMLElement & OreTabsProps & AddEventListeners<OreTabsEvents>;
    // feedback
    'ore-alert': HTMLElement & OreAlertProps & AddEventListeners<OreAlertEvents>;
    'ore-badge': HTMLElement & OreBadgeProps;
    'ore-chip': HTMLElement & OreChipProps & AddEventListeners<OreChipEvents>;
    'ore-progress': HTMLElement & OreProgressProps;
    'ore-skeleton': HTMLElement & OreSkeletonProps;
    'ore-toast': ToastElement;
    // inputs
    'ore-button': HTMLElement & OreButtonProps;
    'ore-button-group': HTMLElement & OreButtonGroupProps;
    'ore-checkbox': HTMLElement & OreCheckboxProps & FormValidityMethods & AddEventListeners<OreCheckboxEvents>;
    'ore-checkbox-group': HTMLElement & OreCheckboxGroupProps;
    'ore-combobox': HTMLElement & OreComboboxProps & FormValidityMethods & AddEventListeners<OreComboboxEvents>;
    'ore-combobox-option': HTMLElement & OreComboboxOptionProps;
    'ore-file-input': HTMLElement & OreFileInputProps & FormValidityMethods & AddEventListeners<OreFileInputEvents>;
    'ore-form': HTMLElement & OreFormProps & AddEventListeners<OreFormEvents>;
    'ore-input': HTMLElement & OreInputProps & FormValidityMethods & AddEventListeners<OreInputEvents>;
    'ore-number-input': HTMLElement &
      OreNumberInputProps &
      FormValidityMethods &
      AddEventListeners<OreNumberInputEvents>;
    'ore-otp-input': HTMLElement & OreOtpInputProps & AddEventListeners<OreOtpInputEvents>;
    'ore-radio': HTMLElement & OreRadioProps & FormValidityMethods & AddEventListeners<OreRadioEvents>;
    'ore-radio-group': HTMLElement & OreRadioGroupProps;
    'ore-rating': HTMLElement & OreRatingProps & FormValidityMethods & AddEventListeners<OreRatingEvents>;
    'ore-select': HTMLElement & OreSelectProps & FormValidityMethods & AddEventListeners<OreSelectEvents>;
    'ore-slider': HTMLElement & OreSliderProps & FormValidityMethods & AddEventListeners<OreSliderEvents>;
    'ore-switch': HTMLElement & OreSwitchProps & FormValidityMethods & AddEventListeners<OreSwitchEvents>;
    'ore-textarea': HTMLElement & OreTextareaProps & FormValidityMethods & AddEventListeners<OreTextareaEvents>;
    // layout
    'ore-box': HTMLElement & OreBoxProps;
    'ore-grid': HTMLElement & OreGridProps;
    'ore-grid-item': HTMLElement & OreGridItemProps;
    'ore-sidebar': SidebarElement & AddEventListeners<OreSidebarEvents>;
    'ore-sidebar-group': HTMLElement & OreSidebarGroupProps & AddEventListeners<OreSidebarGroupEvents>;
    'ore-sidebar-item': HTMLElement & OreSidebarItemProps;
    // overlay
    'ore-dialog': HTMLElement & OreDialogProps & AddEventListeners<OreDialogEvents>;
    'ore-drawer': DrawerElement & AddEventListeners<OreDrawerEvents>;
    'ore-menu': HTMLElement & OreMenuProps & AddEventListeners<OreMenuEvents>;
    'ore-menu-item': HTMLElement & OreMenuItemProps;
    'ore-menu-separator': HTMLElement;
    'ore-popover': HTMLElement & OrePopoverProps & AddEventListeners<OrePopoverEvents>;
    'ore-tooltip': HTMLElement & OreTooltipProps;
  }
}
