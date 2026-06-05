/**
 * Global HTMLElementTagNameMap augmentations for all block custom elements.
 * This file is the single source of truth for element type registrations.
 */

export {};

declare global {
  interface HTMLElementTagNameMap {
    // content
    'sg-avatar': HTMLElement & SgAvatarProps;
    'sg-avatar-group': HTMLElement & SgAvatarGroupProps;
    'sg-breadcrumb': HTMLElement & SgBreadcrumbProps;
    'sg-breadcrumb-item': HTMLElement & SgBreadcrumbItemProps;
    'sg-card': HTMLElement & SgCardProps & AddEventListeners<SgCardEvents>;
    'sg-icon': HTMLElement & SgIconProps;
    'sg-pagination': HTMLElement & SgPaginationProps & AddEventListeners<SgPaginationEvents>;
    'sg-separator': HTMLElement & SgSeparatorProps;
    'sg-table': HTMLElement & SgTableProps;
    'sg-text': HTMLElement & SgTextProps;
    // table markers (light-DOM authoring API used by sg-table)
    'sg-tr': HTMLElement & { foot?: boolean; head?: boolean };
    'sg-th': HTMLElement & {
      abbr?: string;
      axis?: string;
      colspan?: number | string;
      headers?: string;
      rowspan?: number | string;
      scope?: 'col' | 'colgroup' | 'row' | 'rowgroup' | string;
    };
    'sg-td': HTMLElement & {
      colspan?: number | string;
      headers?: string;
      rowspan?: number | string;
    };
    // disclosure
    'sg-accordion': HTMLElement & SgAccordionProps & AddEventListeners<SgAccordionEvents>;
    'sg-accordion-item': HTMLElement & SgAccordionItemProps & AddEventListeners<SgAccordionItemEvents>;
    'sg-tab-item': HTMLElement & SgTabItemProps;
    'sg-tab-panel': HTMLElement & SgTabPanelProps;
    'sg-tabs': HTMLElement & SgTabsProps & AddEventListeners<SgTabsEvents>;
    // feedback
    'sg-alert': HTMLElement & SgAlertProps & AddEventListeners<SgAlertEvents>;
    'sg-badge': HTMLElement & SgBadgeProps;
    'sg-chip': HTMLElement & SgChipProps & AddEventListeners<SgChipEvents>;
    'sg-progress': HTMLElement & SgProgressProps;
    'sg-skeleton': HTMLElement & SgSkeletonProps;
    'sg-toast': ToastElement;
    // inputs
    'sg-button': HTMLElement & SgButtonProps;
    'sg-button-group': HTMLElement & SgButtonGroupProps;
    'sg-checkbox': HTMLElement & SgCheckboxProps & FormValidityMethods & AddEventListeners<SgCheckboxEvents>;
    'sg-checkbox-group': HTMLElement & SgCheckboxGroupProps;
    'sg-combobox': HTMLElement & SgComboboxProps & FormValidityMethods & AddEventListeners<SgComboboxEvents>;
    'sg-combobox-option': HTMLElement & SgComboboxOptionProps;
    'sg-file-input': HTMLElement & SgFileInputProps & FormValidityMethods & AddEventListeners<SgFileInputEvents>;
    'sg-form': HTMLElement & SgFormProps & AddEventListeners<SgFormEvents>;
    'sg-input': HTMLElement & SgInputProps & FormValidityMethods & AddEventListeners<SgInputEvents>;
    'sg-number-input': HTMLElement & SgNumberInputProps & FormValidityMethods & AddEventListeners<SgNumberInputEvents>;
    'sg-otp-input': HTMLElement & SgOtpInputProps & AddEventListeners<SgOtpInputEvents>;
    'sg-radio': HTMLElement & SgRadioProps & FormValidityMethods & AddEventListeners<SgRadioEvents>;
    'sg-radio-group': HTMLElement & SgRadioGroupProps;
    'sg-rating': HTMLElement & SgRatingProps & FormValidityMethods & AddEventListeners<SgRatingEvents>;
    'sg-select': HTMLElement & SgSelectProps & FormValidityMethods & AddEventListeners<SgSelectEvents>;
    'sg-slider': HTMLElement & SgSliderProps & FormValidityMethods & AddEventListeners<SgSliderEvents>;
    'sg-switch': HTMLElement & SgSwitchProps & FormValidityMethods & AddEventListeners<SgSwitchEvents>;
    'sg-textarea': HTMLElement & SgTextareaProps & FormValidityMethods & AddEventListeners<SgTextareaEvents>;
    // layout
    'sg-box': HTMLElement & SgBoxProps;
    'sg-grid': HTMLElement & SgGridProps;
    'sg-grid-item': HTMLElement & SgGridItemProps;
    'sg-sidebar': SidebarElement & AddEventListeners<SgSidebarEvents>;
    'sg-sidebar-group': HTMLElement & SgSidebarGroupProps & AddEventListeners<SgSidebarGroupEvents>;
    'sg-sidebar-item': HTMLElement & SgSidebarItemProps;
    // overlay
    'sg-dialog': HTMLElement & SgDialogProps & AddEventListeners<SgDialogEvents>;
    'sg-drawer': DrawerElement & AddEventListeners<SgDrawerEvents>;
    'sg-menu': HTMLElement & SgMenuProps & AddEventListeners<SgMenuEvents>;
    'sg-menu-item': HTMLElement & SgMenuItemProps;
    'sg-menu-separator': HTMLElement;
    'sg-popover': HTMLElement & SgPopoverProps & AddEventListeners<SgPopoverEvents>;
    'sg-tooltip': HTMLElement & SgTooltipProps;
  }
}
