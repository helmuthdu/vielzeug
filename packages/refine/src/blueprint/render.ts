import type {
  BlueprintAlertNode,
  BlueprintBadgeNode,
  BlueprintBoxNode,
  BlueprintButtonNode,
  BlueprintCardNode,
  BlueprintCheckboxNode,
  BlueprintIconNode,
  BlueprintNode,
  BlueprintNumberInputNode,
  BlueprintProgressNode,
  BlueprintSeparatorNode,
  BlueprintSliderNode,
  BlueprintSwitchNode,
  BlueprintTextNode,
} from './blueprint';
import { parseUiBlueprint } from './blueprint';

export { CARD_TAG } from '../content/card/card';
export { ICON_TAG } from '../content/icon/icon';
export { TEXT_TAG } from '../content/text/text';
export { ALERT_TAG } from '../feedback/alert/alert';
export { BADGE_TAG } from '../feedback/badge/badge';
export { PROGRESS_TAG } from '../feedback/progress/progress';
export { BUTTON_TAG } from '../inputs/button/button';
export { CHECKBOX_TAG } from '../inputs/checkbox/checkbox';
export { NUMBER_INPUT_TAG } from '../inputs/number-input/number-input';
export { SLIDER_TAG } from '../inputs/slider/slider';
export { SWITCH_TAG } from '../inputs/switch/switch';
// Registering through TAG re-exports rather than bare imports: a bare side-effect import between
// build entries is silently dropped by the per-entry bundle, which would ship this entry without
// its components registered. `check:cross-entry` enforces exactly this form.
export { BOX_TAG } from '../layout/box/box';
export { SEPARATOR_TAG } from '../layout/separator/separator';

/**
 * The only supported way to turn a {@link BlueprintNode} into DOM.
 *
 * Every attribute name below is a literal written in this file: a blueprint can select a value
 * from an accepted list, never a name, so `style`, `class`, `on*`, `href`, and slot names are
 * unreachable. Text reaches the DOM through `createTextNode`, so markup and script-looking
 * strings render as visible characters.
 *
 * Nothing here subscribes, observes, or timers out, so there is no handle to dispose: remove the
 * returned element and the tree is gone.
 */

type AttributeValue = boolean | number | string | undefined;

/** Set an attribute the component's own `prop` parser accepts. Absent or false: not set at all. */
function setAttribute(element: HTMLElement, name: string, value: AttributeValue): void {
  if (value === undefined) return;
  if (typeof value === 'boolean') {
    if (value) element.setAttribute(name, '');
    return;
  }
  element.setAttribute(name, String(value));
}

function applyAttributes(element: HTMLElement, attributes: Readonly<Record<string, AttributeValue>>): void {
  for (const [name, value] of Object.entries(attributes)) {
    setAttribute(element, name, value);
  }
}

function appendChildren(
  element: HTMLElement,
  children: readonly BlueprintNode[],
  owner: string,
  nodes?: Map<string, HTMLElement>,
): void {
  for (const [index, child] of children.entries()) {
    element.append(createUiBlueprintElement(child, `${owner}.children[${index}]`, nodes));
  }
}

function renderText(node: BlueprintTextNode): HTMLElement {
  const element = document.createElement('ore-text');
  // Text content only: never innerHTML, never a template compiler.
  element.append(document.createTextNode(node.text));
  applyAttributes(element, {
    align: node.align,
    as: node.as,
    color: node.color,
    italic: node.italic,
    lines: node.lines,
    size: node.size,
    truncate: node.truncate,
    variant: node.variant,
    weight: node.weight,
  });
  return element;
}

function renderBox(node: BlueprintBoxNode, owner: string, nodes?: Map<string, HTMLElement>): HTMLElement {
  const element = document.createElement('ore-box');
  applyAttributes(element, {
    color: node.color,
    elevation: node.elevation,
    fullwidth: node.fullwidth,
    padding: node.padding,
    rounded: node.rounded,
    variant: node.variant,
  });
  appendChildren(element, node.children, owner, nodes);
  return element;
}

function renderCard(node: BlueprintCardNode, owner: string, nodes?: Map<string, HTMLElement>): HTMLElement {
  const element = document.createElement('ore-card');
  applyAttributes(element, {
    color: node.color,
    elevation: node.elevation,
    orientation: node.orientation,
    padding: node.padding,
    rounded: node.rounded,
    variant: node.variant,
  });
  // Children go to the default slot only. Slot names are not expressible in a blueprint, so a
  // generated document cannot target `actions`, `footer`, or `media`.
  appendChildren(element, node.children, owner, nodes);
  return element;
}

function renderButton(node: BlueprintButtonNode): HTMLElement {
  const element = document.createElement('ore-button');
  element.append(document.createTextNode(node.label));
  applyAttributes(element, {
    color: node.color,
    disabled: node.disabled,
    emphasis: node.emphasis,
    fullwidth: node.fullwidth,
    label: node.label,
    loading: node.loading,
    rounded: node.rounded,
    size: node.size,
    variant: node.variant,
  });
  return element;
}

function renderBadge(node: BlueprintBadgeNode): HTMLElement {
  const element = document.createElement('ore-badge');
  if (node.text !== undefined) element.append(document.createTextNode(node.text));
  applyAttributes(element, {
    color: node.color,
    count: node.count,
    dot: node.dot,
    label: node.label,
    max: node.max,
    rounded: node.rounded,
    size: node.size,
    variant: node.variant,
  });
  return element;
}

function renderSeparator(node: BlueprintSeparatorNode): HTMLElement {
  const element = document.createElement('ore-separator');
  applyAttributes(element, {
    color: node.color,
    decorative: node.decorative,
    label: node.label,
    orientation: node.orientation,
  });
  return element;
}

function renderAlert(node: BlueprintAlertNode, owner: string, nodes?: Map<string, HTMLElement>): HTMLElement {
  const element = document.createElement('ore-alert');
  applyAttributes(element, {
    accented: node.accented,
    color: node.color,
    embedded: node.embedded,
    heading: node.heading,
    horizontal: node.horizontal,
    rounded: node.rounded,
    size: node.size,
    variant: node.variant,
  });
  appendChildren(element, node.children, owner, nodes);
  return element;
}

function renderSlider(node: BlueprintSliderNode): HTMLElement {
  const element = document.createElement('ore-slider');
  // The label is the accessible name: ore-slider mirrors the default slot to aria-label, so it is
  // slot text, not an attribute.
  element.append(document.createTextNode(node.label));
  applyAttributes(element, {
    color: node.color,
    disabled: node.disabled,
    error: node.error,
    from: node.from,
    fullwidth: node.fullwidth,
    helper: node.helper,
    max: node.max,
    min: node.min,
    name: node.name,
    range: node.range,
    size: node.size,
    step: node.step,
    to: node.to,
    value: node.value,
  });
  return element;
}

function renderSwitch(node: BlueprintSwitchNode): HTMLElement {
  const element = document.createElement('ore-switch');
  element.append(document.createTextNode(node.label));
  applyAttributes(element, {
    checked: node.checked,
    color: node.color,
    disabled: node.disabled,
    error: node.error,
    helper: node.helper,
    name: node.name,
    size: node.size,
    value: node.value,
  });
  return element;
}

function renderCheckbox(node: BlueprintCheckboxNode): HTMLElement {
  const element = document.createElement('ore-checkbox');
  element.append(document.createTextNode(node.label));
  applyAttributes(element, {
    checked: node.checked,
    color: node.color,
    disabled: node.disabled,
    error: node.error,
    helper: node.helper,
    indeterminate: node.indeterminate,
    name: node.name,
    required: node.required,
    size: node.size,
    value: node.value,
  });
  return element;
}

function renderNumberInput(node: BlueprintNumberInputNode): HTMLElement {
  const element = document.createElement('ore-number-input');
  applyAttributes(element, {
    color: node.color,
    disabled: node.disabled,
    error: node.error,
    fullwidth: node.fullwidth,
    helper: node.helper,
    label: node.label,
    'label-placement': node['label-placement'],
    loading: node.loading,
    max: node.max,
    min: node.min,
    name: node.name,
    placeholder: node.placeholder,
    readonly: node.readonly,
    rounded: node.rounded,
    size: node.size,
    step: node.step,
    success: node.success,
    value: node.value,
    variant: node.variant,
  });
  return element;
}

function renderProgress(node: BlueprintProgressNode): HTMLElement {
  const element = document.createElement('ore-progress');
  applyAttributes(element, {
    color: node.color,
    'floating-label': node['floating-label'],
    indeterminate: node.indeterminate,
    label: node.label,
    max: node.max,
    segments: node.segments,
    size: node.size,
    title: node.title,
    value: node.value,
    'value-text': node['value-text'],
  });
  return element;
}

function renderIcon(node: BlueprintIconNode): HTMLElement {
  const element = document.createElement('ore-icon');
  // The name resolves against host-registered icons; an unknown name renders nothing. No URL, no
  // inline SVG: a model can only surface icons the host chose to register.
  applyAttributes(element, {
    label: node.label,
    name: node.name,
    size: node.size,
    solid: node.solid,
    'stroke-width': node['stroke-width'],
  });
  return element;
}

/**
 * Build one element for a validated node. The component map is this switch: adding a component
 * means adding a case here plus a rule in `blueprint.ts`, and nothing else.
 *
 * @throws {TypeError} when the node is not a registered component, so a hand-built node cannot
 * bypass {@link parseUiBlueprint} either.
 */
export function createUiBlueprintElement(
  node: BlueprintNode,
  owner = 'root',
  nodes?: Map<string, HTMLElement>,
): HTMLElement {
  const element = buildUiBlueprintElement(node, owner, nodes);
  // `id` is host-facing metadata, never an attribute: it is how a harness finds a rendered control
  // to read its value or update it. The validator guarantees ids are unique and non-empty.
  if (nodes && node.id !== undefined) nodes.set(node.id, element);
  return element;
}

function buildUiBlueprintElement(node: BlueprintNode, owner: string, nodes?: Map<string, HTMLElement>): HTMLElement {
  switch (node?.type) {
    case 'alert':
      return renderAlert(node, owner, nodes);
    case 'badge':
      return renderBadge(node);
    case 'box':
      return renderBox(node, owner, nodes);
    case 'button':
      return renderButton(node);
    case 'card':
      return renderCard(node, owner, nodes);
    case 'checkbox':
      return renderCheckbox(node);
    case 'icon':
      return renderIcon(node);
    case 'number-input':
      return renderNumberInput(node);
    case 'progress':
      return renderProgress(node);
    case 'separator':
      return renderSeparator(node);
    case 'slider':
      return renderSlider(node);
    case 'switch':
      return renderSwitch(node);
    case 'text':
      return renderText(node);
    default:
      throw new TypeError(`${owner}: not a registered blueprint component.`);
  }
}

export interface UiBlueprintRenderOptions {
  /**
   * Accessible name for the preview region, announced as the label of a `role="group"` wrapper.
   * Host-owned: a blueprint cannot set it. Omit it when the surrounding view already labels the
   * region.
   */
  readonly label?: string;
  /** Replace the container's contents. Default true; false appends instead. */
  readonly replace?: boolean;
}

/** The result of a successful render: the root element and every id-addressable node. */
export interface UiBlueprintRenderResult {
  /** The rendered root element. */
  readonly element: HTMLElement;
  /**
   * Every node that carried an `id`, keyed by that id. A harness reads a control's current value
   * from `nodes.get('rate')`, listens for its `input`/`change` events, and updates derived nodes
   * by re-rendering or setting properties. Empty when no node is id-tagged.
   */
  readonly nodes: ReadonlyMap<string, HTMLElement>;
}

/**
 * Validate `value` and, only on success, render it into `container`.
 *
 * A rejected document throws before the container is touched, so an invalid or stale response can
 * never partially render or erase the preview already on screen.
 *
 * @throws {UiBlueprintError} when the document is rejected. The container is unchanged.
 */
export function renderUiBlueprint(
  container: HTMLElement,
  value: unknown,
  options: UiBlueprintRenderOptions = {},
): UiBlueprintRenderResult {
  const blueprint = parseUiBlueprint(value);
  const nodes = new Map<string, HTMLElement>();
  const element = createUiBlueprintElement(blueprint.root, 'root', nodes);

  if (options.replace !== false) container.replaceChildren();

  if (options.label === undefined) {
    container.append(element);
    return { element, nodes };
  }

  const region = document.createElement('div');
  region.setAttribute('role', 'group');
  region.setAttribute('aria-label', options.label);
  region.append(element);
  container.append(region);
  return { element, nodes };
}
