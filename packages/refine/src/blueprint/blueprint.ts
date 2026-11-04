import { RefineError } from '../errors';

/**
 * The untrusted-boundary contract for model-authored UI.
 *
 * A language model in an agent harness (Copilot, Claude, Codex, or any other) can be asked to
 * describe a small interface. That output is data, never code: it names a component from the
 * fixed {@link UI_BLUEPRINT_COMPONENTS} registry and a subset of that component's documented
 * attributes. This module owns the shape and the bounds; `@vielzeug/refine/blueprint/render`
 * owns the only way to turn a validated document into DOM.
 *
 * The entry is pure: no DOM, no component registration, no dependencies. A harness can validate
 * a document in Node before any browser sees it.
 *
 * Every allowed value below was read off the installed component source, not from memory. The
 * drift guard lives in `blueprint.test.ts`, which re-reads each component's own `prop.oneOf(…)`
 * list and fails if this registry and the component disagree.
 */

/** Registry contract version. Bump only together with a documented migration. */
export const UI_BLUEPRINT_VERSION = 1 as const;

/* ------------------------------------------------------------------ *
 * Bounds
 *
 * Basis for each constant: the node and depth ceilings sit just above the densest honest
 * document, which is a form panel (a card with a heading, several labelled inputs, a badge row,
 * and an action row), and far below any stack or layout-recursion limit, so a pathological model
 * response is rejected cheaply instead of rendered. The child ceiling matches Refine's own layout
 * width: `ore-grid` tops out at 12 columns, so 12 children is the widest container worth
 * expressing. The string ceilings keep any one field inside a normal component surface rather
 * than a wall of text; the numeric ceiling keeps values inside the range the components format
 * sensibly, and individual fields tighten it where a component would silently reinterpret an
 * out-of-range value. They are deliberately not user-configurable: a document that needs a
 * larger budget needs a different feature.
 * ------------------------------------------------------------------ */

/** Maximum total nodes in one document, including the root. */
export const MAX_BLUEPRINT_NODES = 64;
/** Maximum nesting depth, counting the root node as depth 1. */
export const MAX_BLUEPRINT_DEPTH = 6;
/** Maximum children on one container node. Matches the widest `ore-grid` column count. */
export const MAX_BLUEPRINT_CHILDREN = 12;
/** Maximum length of rendered body text. */
export const MAX_BLUEPRINT_TEXT_LENGTH = 500;
/** Maximum length of a short label (button, field label, helper text). */
export const MAX_BLUEPRINT_LABEL_LENGTH = 120;
/** Default absolute ceiling for numeric fields; individual fields tighten it where needed. */
export const MAX_BLUEPRINT_NUMBER = 1_000_000_000;
/** Maximum length of a host-facing node identifier. */
export const MAX_BLUEPRINT_ID_LENGTH = 64;

/* ------------------------------------------------------------------ *
 * Allowed attribute values, mirrored from each component's own contract.
 * ------------------------------------------------------------------ */

const THEME_COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const;
const PADDING_SIZES = ['none', 'sm', 'md', 'lg', 'xl'] as const;
const ROUNDED_SIZES = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'] as const;
const ELEVATION_LEVELS = [0, 1, 2, 3, 4, 5] as const;
const COMPONENT_SIZES = ['sm', 'md', 'lg'] as const;

const TEXT_ELEMENTS = ['span', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'code'] as const;
const TEXT_VARIANTS = ['body', 'heading', 'label', 'caption', 'overline', 'code'] as const;
const TEXT_SIZES = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
const TEXT_WEIGHTS = ['normal', 'medium', 'semibold', 'bold'] as const;
const TEXT_COLORS = [
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
  'error',
  'heading',
  'body',
  'muted',
  'tertiary',
  'disabled',
  'contrast',
] as const;
const TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;

const BOX_VARIANTS = ['flat', 'solid', 'frost'] as const;
const CARD_VARIANTS = ['solid', 'flat', 'frost'] as const;
const CARD_ORIENTATIONS = ['horizontal'] as const;
const BUTTON_VARIANTS = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'frost'] as const;
const BUTTON_EMPHASIS = ['normal', 'primary', 'cancel', 'destructive'] as const;
const BADGE_VARIANTS = ['solid', 'flat', 'bordered', 'outline', 'frost'] as const;
const BADGE_SIZES = ['xs', 'sm', 'md', 'lg'] as const;
const SEPARATOR_ORIENTATIONS = ['horizontal', 'vertical'] as const;

const LABEL_PLACEMENTS = ['inset', 'outside'] as const;
const VISUAL_VARIANTS = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'frost'] as const;
const ALERT_VARIANTS = ['solid', 'flat', 'bordered'] as const;

/* ------------------------------------------------------------------ *
 * Document shape
 * ------------------------------------------------------------------ */

/** Model-authored body text. Rendered with `textContent`, never as markup. */
export type BlueprintText = string;

/**
 * Fields every node may carry regardless of component. `id` is host-facing metadata, never a
 * component attribute or prop: a harness sets it on nodes it wants to address, and the renderer
 * returns a map from id to element so the host can read a control's value or update a subtree.
 * Unique across the document.
 */
export interface BlueprintNodeMeta {
  readonly id?: string;
}

/** A heading, paragraph, caption, or inline code. Leaf node: no children. */
export interface BlueprintTextNode extends BlueprintNodeMeta {
  readonly align?: (typeof TEXT_ALIGNMENTS)[number];
  /** Semantic element to render as. Omitted: the component's own default. */
  readonly as?: (typeof TEXT_ELEMENTS)[number];
  readonly color?: (typeof TEXT_COLORS)[number];
  readonly italic?: boolean;
  /** Multi-line clamp, 1 to 10. */
  readonly lines?: number;
  readonly size?: (typeof TEXT_SIZES)[number];
  readonly text: BlueprintText;
  readonly truncate?: boolean;
  readonly type: 'text';
  readonly variant?: (typeof TEXT_VARIANTS)[number];
  readonly weight?: (typeof TEXT_WEIGHTS)[number];
}

/** A themed container. */
export interface BlueprintBoxNode extends BlueprintNodeMeta {
  readonly children: readonly BlueprintNode[];
  readonly color?: (typeof THEME_COLORS)[number];
  readonly elevation?: (typeof ELEVATION_LEVELS)[number];
  readonly fullwidth?: boolean;
  readonly padding?: (typeof PADDING_SIZES)[number];
  readonly rounded?: (typeof ROUNDED_SIZES)[number];
  readonly type: 'box';
  readonly variant?: (typeof BOX_VARIANTS)[number];
}

/** A card surface. Children render into the default slot. */
export interface BlueprintCardNode extends BlueprintNodeMeta {
  readonly children: readonly BlueprintNode[];
  readonly color?: (typeof THEME_COLORS)[number];
  readonly elevation?: (typeof ELEVATION_LEVELS)[number];
  readonly orientation?: (typeof CARD_ORIENTATIONS)[number];
  readonly padding?: (typeof PADDING_SIZES)[number];
  readonly rounded?: (typeof ROUNDED_SIZES)[number];
  readonly type: 'card';
  readonly variant?: (typeof CARD_VARIANTS)[number];
}

/**
 * A presentational button. It carries no action: a blueprint cannot express a callback, an
 * `href`, a `target`, or a `rel`, so a generated control can never route, navigate, or call
 * into the host. Host-owned behaviour, if a product needs it, is attached outside this contract.
 */
export interface BlueprintButtonNode extends BlueprintNodeMeta {
  readonly color?: (typeof THEME_COLORS)[number];
  readonly disabled?: boolean;
  readonly emphasis?: (typeof BUTTON_EMPHASIS)[number];
  readonly fullwidth?: boolean;
  readonly label: string;
  readonly loading?: boolean;
  readonly rounded?: (typeof ROUNDED_SIZES)[number];
  readonly size?: (typeof COMPONENT_SIZES)[number];
  readonly type: 'button';
  readonly variant?: (typeof BUTTON_VARIANTS)[number];
}

/** A compact status label. */
export interface BlueprintBadgeNode extends BlueprintNodeMeta {
  readonly color?: (typeof THEME_COLORS)[number];
  readonly count?: number;
  readonly dot?: boolean;
  /** Accessible label, required in practice when only `count` or `dot` carries meaning. */
  readonly label?: string;
  readonly max?: number;
  readonly rounded?: (typeof ROUNDED_SIZES)[number];
  readonly size?: (typeof BADGE_SIZES)[number];
  readonly text?: BlueprintText;
  readonly type: 'badge';
  readonly variant?: (typeof BADGE_VARIANTS)[number];
}

/** A divider. Leaf node: no children. */
export interface BlueprintSeparatorNode extends BlueprintNodeMeta {
  readonly color?: (typeof THEME_COLORS)[number];
  readonly decorative?: boolean;
  readonly label?: string;
  readonly orientation?: (typeof SEPARATOR_ORIENTATIONS)[number];
  readonly type: 'separator';
}

/**
 * A range slider. The `label` becomes the component's accessible name (it is mirrored to
 * `aria-label`, because `role="slider"` forbids name-from-content). Emits `input`/`change`; a host
 * reads the value from the element and recomputes with the `id` it assigned.
 */
export interface BlueprintSliderNode extends BlueprintNodeMeta {
  readonly color?: (typeof THEME_COLORS)[number];
  readonly disabled?: boolean;
  readonly error?: string;
  /** Range mode lower bound. */
  readonly from?: number;
  readonly fullwidth?: boolean;
  readonly helper?: string;
  readonly label: string;
  readonly max?: number;
  readonly min?: number;
  /** Form field name for native form participation. */
  readonly name?: string;
  /** Two-thumb range mode. */
  readonly range?: boolean;
  readonly size?: (typeof COMPONENT_SIZES)[number];
  readonly step?: number;
  /** Range mode upper bound. */
  readonly to?: number;
  readonly type: 'slider';
  readonly value?: number;
  /** Accessible text for the current value, overriding the raw number. */
  readonly 'value-text'?: string;
}

/** A toggle switch. The `label` is the switch label text. Emits `input` and `change`. */
export interface BlueprintSwitchNode extends BlueprintNodeMeta {
  readonly checked?: boolean;
  readonly color?: (typeof THEME_COLORS)[number];
  readonly disabled?: boolean;
  readonly error?: string;
  readonly helper?: string;
  readonly label: string;
  readonly name?: string;
  readonly size?: (typeof COMPONENT_SIZES)[number];
  readonly type: 'switch';
  readonly value?: string;
}

/** A checkbox. The `label` is the checkbox label text. Emits `input` and `change`. */
export interface BlueprintCheckboxNode extends BlueprintNodeMeta {
  readonly checked?: boolean;
  readonly color?: (typeof THEME_COLORS)[number];
  readonly disabled?: boolean;
  readonly error?: string;
  readonly helper?: string;
  readonly indeterminate?: boolean;
  readonly label: string;
  readonly name?: string;
  readonly required?: boolean;
  readonly size?: (typeof COMPONENT_SIZES)[number];
  readonly type: 'checkbox';
  readonly value?: string;
}

/**
 * A numeric field. `value`, `min`, `max`, and `step` are numbers; the component parses them from
 * the attribute via `JSON.parse`, so no JS-property bridge is needed. Emits `input`/`change`.
 */
export interface BlueprintNumberInputNode extends BlueprintNodeMeta {
  readonly color?: (typeof THEME_COLORS)[number];
  readonly disabled?: boolean;
  readonly error?: string;
  readonly fullwidth?: boolean;
  readonly helper?: string;
  readonly label?: string;
  readonly 'label-placement'?: (typeof LABEL_PLACEMENTS)[number];
  readonly loading?: boolean;
  readonly max?: number;
  readonly min?: number;
  readonly name?: string;
  readonly placeholder?: string;
  readonly readonly?: boolean;
  readonly rounded?: (typeof ROUNDED_SIZES)[number];
  readonly size?: (typeof COMPONENT_SIZES)[number];
  readonly step?: number;
  readonly success?: boolean;
  readonly type: 'number-input';
  readonly value?: number;
  readonly variant?: (typeof VISUAL_VARIANTS)[number];
}

/** A contextual message. Children render into the default slot. */
export interface BlueprintAlertNode extends BlueprintNodeMeta {
  readonly accented?: boolean;
  readonly children: readonly BlueprintNode[];
  readonly color?: (typeof THEME_COLORS)[number];
  readonly embedded?: boolean;
  readonly heading?: string;
  readonly horizontal?: boolean;
  readonly rounded?: (typeof ROUNDED_SIZES)[number];
  readonly size?: (typeof COMPONENT_SIZES)[number];
  readonly type: 'alert';
  readonly variant?: (typeof ALERT_VARIANTS)[number];
}

/** A progress indicator. Leaf node: no children. */
export interface BlueprintProgressNode extends BlueprintNodeMeta {
  readonly color?: (typeof THEME_COLORS)[number];
  readonly 'floating-label'?: string;
  readonly indeterminate?: boolean;
  readonly label?: string;
  readonly max?: number;
  readonly segments?: number;
  readonly size?: (typeof COMPONENT_SIZES)[number];
  readonly title?: string;
  readonly type: 'progress';
  readonly value?: number;
  readonly 'value-text'?: string;
}

/**
 * An icon by registered name. The name is resolved against icons the host registered with
 * `registerIcons`; an unknown name renders nothing, so a model can only surface icons the host
 * chose to make available. Leaf node: no children.
 */
export interface BlueprintIconNode extends BlueprintNodeMeta {
  readonly label?: string;
  readonly name: string;
  /** Rendered size in pixels, 1 to 1024. */
  readonly size?: number;
  readonly solid?: boolean;
  /** Kebab-case like every other multiword field: the component observes `stroke-width`. */
  readonly 'stroke-width'?: number;
  readonly type: 'icon';
}

/** Any accepted node. Discriminated on `type`. */
export type BlueprintNode =
  | BlueprintTextNode
  | BlueprintBoxNode
  | BlueprintCardNode
  | BlueprintButtonNode
  | BlueprintBadgeNode
  | BlueprintSeparatorNode
  | BlueprintSliderNode
  | BlueprintSwitchNode
  | BlueprintCheckboxNode
  | BlueprintNumberInputNode
  | BlueprintAlertNode
  | BlueprintProgressNode
  | BlueprintIconNode;

/** A whole document: one root node and nothing else. */
export interface BlueprintDocument {
  readonly root: BlueprintNode;
  readonly version: typeof UI_BLUEPRINT_VERSION;
}

/** Registry component identifiers. The only names a document may use. */
export const UI_BLUEPRINT_COMPONENTS = [
  'text',
  'box',
  'card',
  'button',
  'badge',
  'separator',
  'slider',
  'switch',
  'checkbox',
  'number-input',
  'alert',
  'progress',
  'icon',
] as const satisfies readonly BlueprintNode['type'][];

/** Thrown for a document this contract rejects. Messages are safe to display. */
export class UiBlueprintError extends RefineError {
  /** Every rejection, in document order. Each entry is a field path plus a plain reason. */
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    const detail = issues.length > 0 ? issues.join('; ') : 'unknown rejection';
    super(`Invalid UI blueprint: ${detail}`);
    this.issues = Object.freeze([...issues]);
  }
}

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

interface FieldRule {
  /** Only for `number`: the value must be strictly greater than this. */
  readonly exclusiveMin?: number;
  readonly kind: 'boolean' | 'enum' | 'integer' | 'number' | 'string';
  readonly max?: number;
  /** Only for `integer` and `number`. */
  readonly maxBound?: number;
  readonly minBound?: number;
  readonly name: string;
  /** When true, omitting the field is a rejection, not a default. */
  readonly required?: boolean;
  /** True when the value becomes default-slot text rather than an attribute. */
  readonly slot?: boolean;
  readonly values?: readonly (number | string)[];
}

interface NodeRule {
  readonly children: 'forbidden' | 'required';
  readonly fields: readonly FieldRule[];
  readonly type: BlueprintNode['type'];
}

const enumField = (name: string, values: readonly (number | string)[]): FieldRule => ({
  kind: 'enum',
  name,
  values,
});

const stringField = (name: string, max: number): FieldRule => ({
  kind: 'string',
  max,
  name,
});

/** A string that becomes the component's default-slot text, not an attribute. */
const slotField = (name: string, max: number): FieldRule => ({
  kind: 'string',
  max,
  name,
  slot: true,
});

const booleanField = (name: string): FieldRule => ({ kind: 'boolean', name });

const integerField = (name: string, minBound: number, maxBound: number): FieldRule => ({
  kind: 'integer',
  maxBound,
  minBound,
  name,
});

/** A finite number, integral or fractional, within the document-wide numeric ceiling. */
const numberField = (name: string, bounds: { maxBound?: number; minBound?: number } = {}): FieldRule => ({
  kind: 'number',
  maxBound: bounds.maxBound ?? MAX_BLUEPRINT_NUMBER,
  minBound: bounds.minBound ?? -MAX_BLUEPRINT_NUMBER,
  name,
});

/**
 * A number strictly above zero. Components absorb a zero step into their default and reinterpret
 * a negative one (`toPositiveStep`, `Number(step) || 1`), so a non-positive value would render
 * something other than what the document asked for; the contract rejects it instead.
 */
const positiveField = (name: string, maxBound = MAX_BLUEPRINT_NUMBER): FieldRule => ({
  exclusiveMin: 0,
  kind: 'number',
  maxBound,
  minBound: 0,
  name,
});

/**
 * The explicit rendering boundary: one rule per component identifier, listing only the
 * attributes that component documents. Unknown keys are rejected, never dropped silently, so a
 * model cannot smuggle `href`, `style`, `class`, `on*`, or a slot name through.
 */
const NODE_RULES: Readonly<Record<BlueprintNode['type'], NodeRule>> = {
  alert: {
    children: 'required',
    fields: [
      enumField('color', THEME_COLORS),
      enumField('size', COMPONENT_SIZES),
      enumField('rounded', ROUNDED_SIZES),
      enumField('variant', ALERT_VARIANTS),
      booleanField('accented'),
      booleanField('embedded'),
      booleanField('horizontal'),
      stringField('heading', MAX_BLUEPRINT_LABEL_LENGTH),
    ],
    type: 'alert',
  },
  badge: {
    children: 'forbidden',
    fields: [
      slotField('text', MAX_BLUEPRINT_TEXT_LENGTH),
      integerField('count', 0, 999_999),
      integerField('max', 1, 999_999),
      stringField('label', MAX_BLUEPRINT_LABEL_LENGTH),
      booleanField('dot'),
      enumField('color', THEME_COLORS),
      enumField('variant', BADGE_VARIANTS),
      enumField('size', BADGE_SIZES),
      enumField('rounded', ROUNDED_SIZES),
    ],
    type: 'badge',
  },
  box: {
    children: 'required',
    fields: [
      enumField('variant', BOX_VARIANTS),
      enumField('color', THEME_COLORS),
      enumField('padding', PADDING_SIZES),
      enumField('elevation', ELEVATION_LEVELS),
      enumField('rounded', ROUNDED_SIZES),
      booleanField('fullwidth'),
    ],
    type: 'box',
  },
  button: {
    children: 'forbidden',
    fields: [
      { ...stringField('label', MAX_BLUEPRINT_LABEL_LENGTH), required: true },
      enumField('color', THEME_COLORS),
      enumField('variant', BUTTON_VARIANTS),
      enumField('size', COMPONENT_SIZES),
      enumField('emphasis', BUTTON_EMPHASIS),
      enumField('rounded', ROUNDED_SIZES),
      booleanField('fullwidth'),
      booleanField('disabled'),
      booleanField('loading'),
    ],
    type: 'button',
  },
  card: {
    children: 'required',
    fields: [
      enumField('variant', CARD_VARIANTS),
      enumField('color', THEME_COLORS),
      enumField('padding', PADDING_SIZES),
      enumField('rounded', ROUNDED_SIZES),
      enumField('elevation', ELEVATION_LEVELS),
      enumField('orientation', CARD_ORIENTATIONS),
    ],
    type: 'card',
  },
  checkbox: {
    children: 'forbidden',
    fields: [
      { ...slotField('label', MAX_BLUEPRINT_LABEL_LENGTH), required: true },
      enumField('color', THEME_COLORS),
      enumField('size', COMPONENT_SIZES),
      booleanField('checked'),
      booleanField('disabled'),
      booleanField('indeterminate'),
      booleanField('required'),
      stringField('error', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('helper', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('name', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('value', MAX_BLUEPRINT_LABEL_LENGTH),
    ],
    type: 'checkbox',
  },
  icon: {
    children: 'forbidden',
    fields: [
      { ...stringField('name', MAX_BLUEPRINT_LABEL_LENGTH), required: true },
      stringField('label', MAX_BLUEPRINT_LABEL_LENGTH),
      numberField('size', { maxBound: 1024, minBound: 1 }),
      positiveField('stroke-width', 20),
      booleanField('solid'),
    ],
    type: 'icon',
  },
  'number-input': {
    children: 'forbidden',
    fields: [
      enumField('color', THEME_COLORS),
      enumField('size', COMPONENT_SIZES),
      enumField('rounded', ROUNDED_SIZES),
      enumField('variant', VISUAL_VARIANTS),
      enumField('label-placement', LABEL_PLACEMENTS),
      booleanField('disabled'),
      booleanField('fullwidth'),
      booleanField('loading'),
      booleanField('readonly'),
      booleanField('success'),
      numberField('max'),
      numberField('min'),
      positiveField('step'),
      numberField('value'),
      stringField('error', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('helper', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('label', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('name', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('placeholder', MAX_BLUEPRINT_LABEL_LENGTH),
    ],
    type: 'number-input',
  },
  progress: {
    children: 'forbidden',
    fields: [
      enumField('color', THEME_COLORS),
      enumField('size', COMPONENT_SIZES),
      booleanField('indeterminate'),
      positiveField('max'),
      integerField('segments', 0, 1000),
      numberField('value', { minBound: 0 }),
      stringField('floating-label', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('label', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('title', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('value-text', MAX_BLUEPRINT_LABEL_LENGTH),
    ],
    type: 'progress',
  },
  separator: {
    children: 'forbidden',
    fields: [
      enumField('orientation', SEPARATOR_ORIENTATIONS),
      booleanField('decorative'),
      stringField('label', MAX_BLUEPRINT_LABEL_LENGTH),
      enumField('color', THEME_COLORS),
    ],
    type: 'separator',
  },
  slider: {
    children: 'forbidden',
    fields: [
      { ...slotField('label', MAX_BLUEPRINT_LABEL_LENGTH), required: true },
      enumField('color', THEME_COLORS),
      enumField('size', COMPONENT_SIZES),
      booleanField('disabled'),
      booleanField('fullwidth'),
      booleanField('range'),
      numberField('from'),
      numberField('max'),
      numberField('min'),
      positiveField('step'),
      numberField('to'),
      numberField('value'),
      stringField('error', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('helper', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('name', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('value-text', MAX_BLUEPRINT_LABEL_LENGTH),
    ],
    type: 'slider',
  },
  switch: {
    children: 'forbidden',
    fields: [
      { ...slotField('label', MAX_BLUEPRINT_LABEL_LENGTH), required: true },
      enumField('color', THEME_COLORS),
      enumField('size', COMPONENT_SIZES),
      booleanField('checked'),
      booleanField('disabled'),
      stringField('error', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('helper', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('name', MAX_BLUEPRINT_LABEL_LENGTH),
      stringField('value', MAX_BLUEPRINT_LABEL_LENGTH),
    ],
    type: 'switch',
  },
  text: {
    children: 'forbidden',
    fields: [
      slotField('text', MAX_BLUEPRINT_TEXT_LENGTH),
      enumField('as', TEXT_ELEMENTS),
      enumField('variant', TEXT_VARIANTS),
      enumField('size', TEXT_SIZES),
      enumField('weight', TEXT_WEIGHTS),
      enumField('color', TEXT_COLORS),
      enumField('align', TEXT_ALIGNMENTS),
      booleanField('italic'),
      booleanField('truncate'),
      integerField('lines', 1, 10),
    ],
    type: 'text',
  },
};

/** Machine-readable rule for one registry component. */
export interface UiBlueprintComponentRule {
  /** Attribute names the component accepts, excluding `type`, `children`, and slot fields. */
  readonly attributes: readonly string[];
  /** Whether the component accepts children. */
  readonly children: boolean;
  /** Fields rendered as default-slot text instead of set as attributes. */
  readonly content: readonly string[];
  /** Custom element the renderer creates. */
  readonly tag: string;
  /** Accepted values per enumerated attribute. Non-enumerated attributes are absent. */
  readonly values: Readonly<Record<string, readonly (number | string)[]>>;
}

function toRule(type: BlueprintNode['type'], tag: string): UiBlueprintComponentRule {
  const rule = NODE_RULES[type];
  const values: Record<string, readonly (number | string)[]> = {};

  for (const field of rule.fields) {
    if (field.kind === 'enum' && field.values) values[field.name] = field.values;
  }

  return Object.freeze({
    attributes: Object.freeze(rule.fields.filter((field) => !field.slot).map((field) => field.name)),
    children: rule.children === 'required',
    content: Object.freeze(rule.fields.filter((field) => field.slot).map((field) => field.name)),
    tag,
    values: Object.freeze(values),
  });
}

/**
 * The registry as data: for each accepted component, the element it renders, whether it takes
 * children, and the exact values each attribute accepts.
 *
 * Publish it to a harness alongside {@link UI_BLUEPRINT_JSON_SCHEMA} when a prompt needs prose
 * rather than a schema. Runtime validation remains the trust boundary.
 */
export const UI_BLUEPRINT_REGISTRY: Readonly<Record<BlueprintNode['type'], UiBlueprintComponentRule>> = Object.freeze({
  alert: toRule('alert', 'ore-alert'),
  badge: toRule('badge', 'ore-badge'),
  box: toRule('box', 'ore-box'),
  button: toRule('button', 'ore-button'),
  card: toRule('card', 'ore-card'),
  checkbox: toRule('checkbox', 'ore-checkbox'),
  icon: toRule('icon', 'ore-icon'),
  'number-input': toRule('number-input', 'ore-number-input'),
  progress: toRule('progress', 'ore-progress'),
  separator: toRule('separator', 'ore-separator'),
  slider: toRule('slider', 'ore-slider'),
  switch: toRule('switch', 'ore-switch'),
  text: toRule('text', 'ore-text'),
});

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Issues are documented as safe to display, and type names always are; the offending value
 * itself is only ever shown for short scalars. A model (or an attacker steering one) controls
 * what a rejected value contains, so an echoed value is truncated instead of copied whole.
 */
function echoValue(value: unknown): string {
  const shown = typeof value === 'string' ? value : (JSON.stringify(value) ?? describeValue(value));
  return shown.length > 80 ? `${shown.slice(0, 80)}...` : shown;
}

function formatPath(segments: readonly (number | string)[]): string {
  return segments.reduce<string>(
    (path, segment) => (typeof segment === 'number' ? `${path}[${segment}]` : path ? `${path}.${segment}` : segment),
    '',
  );
}

function checkField(rule: FieldRule, value: unknown, path: string): string[] {
  switch (rule.kind) {
    case 'boolean': {
      return typeof value === 'boolean' ? [] : [`${path}: expected a boolean, received ${describeValue(value)}.`];
    }
    case 'enum': {
      if (typeof value !== 'number' && typeof value !== 'string') {
        return [`${path}: expected one of ${rule.values?.join(', ')}, received ${describeValue(value)}.`];
      }
      return rule.values?.includes(value)
        ? []
        : [`${path}: "${echoValue(value)}" is not an accepted value. Expected one of ${rule.values?.join(', ')}.`];
    }
    case 'integer': {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return [`${path}: expected an integer, received ${describeValue(value)}.`];
      }
      if (value < (rule.minBound ?? Number.MIN_SAFE_INTEGER) || value > (rule.maxBound ?? Number.MAX_SAFE_INTEGER)) {
        return [`${path}: ${value} is outside the accepted range ${rule.minBound}-${rule.maxBound}.`];
      }
      return [];
    }
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return [`${path}: expected a finite number, received ${describeValue(value)}.`];
      }
      if (rule.exclusiveMin !== undefined && value <= rule.exclusiveMin) {
        return [`${path}: ${value} must be greater than ${rule.exclusiveMin}.`];
      }
      if (value < (rule.minBound ?? Number.MIN_SAFE_INTEGER) || value > (rule.maxBound ?? Number.MAX_SAFE_INTEGER)) {
        return [`${path}: ${value} is outside the accepted range ${rule.minBound}-${rule.maxBound}.`];
      }
      return [];
    }
    case 'string': {
      if (typeof value !== 'string') {
        return [`${path}: expected a string, received ${describeValue(value)}.`];
      }
      if (value.trim().length === 0) return [`${path}: must not be empty.`];
      return value.length > (rule.max ?? Number.POSITIVE_INFINITY)
        ? [`${path}: exceeds the ${rule.max} character limit.`]
        : [];
    }
  }
}

function checkNode(value: unknown, path: string, depth: number, budget: { ids: Set<string>; nodes: number }): string[] {
  if (budget.nodes >= MAX_BLUEPRINT_NODES) {
    return [`${path}: document exceeds the ${MAX_BLUEPRINT_NODES} node limit.`];
  }
  budget.nodes += 1;

  if (depth > MAX_BLUEPRINT_DEPTH) {
    return [`${path}: nesting exceeds the ${MAX_BLUEPRINT_DEPTH} level limit.`];
  }
  if (!isPlainRecord(value)) {
    return [`${path}: expected a component object, received ${describeValue(value)}.`];
  }

  const component = value.type;
  if (typeof component !== 'string' || !Object.hasOwn(NODE_RULES, component)) {
    const shown = typeof component === 'string' ? `"${component}"` : describeValue(component);
    return [`${path}.type: ${shown} is not a registered component. Use one of ${UI_BLUEPRINT_COMPONENTS.join(', ')}.`];
  }

  const rule = NODE_RULES[component as BlueprintNode['type']];
  const allowed = new Set(rule.fields.map((fieldRule) => fieldRule.name));
  allowed.add('type');
  allowed.add('id');
  if (rule.children === 'required') allowed.add('children');

  const issues: string[] = [];

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(
        `${path}.${echoValue(key)}: unsupported field for "${component}". Supported: ${[...allowed].join(', ')}.`,
      );
    }
  }

  // `id` is host-facing metadata, never an attribute or a component prop: it lets a harness locate
  // a rendered control to read its value or update it. It is bounded and unique across the document.
  const id = value.id;
  if (id !== undefined) {
    if (typeof id !== 'string' || id.trim().length === 0) {
      issues.push(`${path}.id: must be a non-empty string.`);
    } else if (id.length > MAX_BLUEPRINT_ID_LENGTH) {
      issues.push(`${path}.id: exceeds the ${MAX_BLUEPRINT_ID_LENGTH} character limit.`);
    } else if (budget.ids.has(id)) {
      issues.push(`${path}.id: "${id}" is already used by another node. Identifiers must be unique.`);
    } else {
      budget.ids.add(id);
    }
  }

  for (const fieldRule of rule.fields) {
    const raw = value[fieldRule.name];
    if (raw === undefined) {
      if (fieldRule.required) issues.push(`${path}.${fieldRule.name}: required for "${component}".`);
      continue;
    }
    issues.push(...checkField(fieldRule, raw, formatPath([path, fieldRule.name])));
  }

  if (rule.children === 'forbidden') {
    if (value.children !== undefined) {
      issues.push(`${path}.children: "${component}" renders no children, so the field is not accepted.`);
    }
    return issues;
  }

  const children = value.children;
  if (!Array.isArray(children)) {
    issues.push(`${path}.children: "${component}" requires an array of child components.`);
    return issues;
  }
  if (children.length === 0) {
    issues.push(`${path}.children: must contain at least one child component.`);
    return issues;
  }
  if (children.length > MAX_BLUEPRINT_CHILDREN) {
    issues.push(`${path}.children: ${children.length} children exceeds the ${MAX_BLUEPRINT_CHILDREN} child limit.`);
    return issues;
  }

  for (const [index, child] of children.entries()) {
    issues.push(...checkNode(child, formatPath([path, 'children', index]), depth + 1, budget));
  }

  return issues;
}

/**
 * Validate untrusted model output. Returns the document unchanged when it satisfies the
 * contract, or a {@link UiBlueprintError} listing every rejection with a field path. Nothing is
 * repaired, defaulted, or partially accepted.
 *
 * @throws {UiBlueprintError} when the document is rejected.
 */
export function parseUiBlueprint(value: unknown): BlueprintDocument {
  if (!isPlainRecord(value)) {
    throw new UiBlueprintError([`document: expected an object, received ${describeValue(value)}.`]);
  }

  const allowed = new Set(['root', 'version']);
  const issues: string[] = [];

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(`document.${echoValue(key)}: unsupported field. Supported: root, version.`);
  }

  if (value.version !== UI_BLUEPRINT_VERSION) {
    issues.push(`document.version: expected ${UI_BLUEPRINT_VERSION}, received ${echoValue(value.version)}.`);
  }
  if (value.root === undefined) {
    issues.push('document.root: required.');
  } else {
    issues.push(...checkNode(value.root, 'root', 1, { ids: new Set(), nodes: 0 }));
  }

  if (issues.length > 0) throw new UiBlueprintError(issues);

  return value as unknown as BlueprintDocument;
}

/** Non-throwing form of {@link parseUiBlueprint}. */
export function safeParseUiBlueprint(
  value: unknown,
): { document: BlueprintDocument; success: true } | { issues: readonly string[]; success: false } {
  try {
    return { document: parseUiBlueprint(value), success: true };
  } catch (error) {
    if (error instanceof UiBlueprintError) return { issues: error.issues, success: false };
    throw error;
  }
}

/* ------------------------------------------------------------------ *
 * Harness contract
 * ------------------------------------------------------------------ */

function fieldSchema(rule: FieldRule): Record<string, unknown> {
  switch (rule.kind) {
    case 'boolean':
      return { type: 'boolean' };
    case 'enum':
      return { enum: [...(rule.values ?? [])] };
    case 'integer':
      return { maximum: rule.maxBound, minimum: rule.minBound, type: 'integer' };
    case 'number':
      return rule.exclusiveMin === undefined
        ? { maximum: rule.maxBound, minimum: rule.minBound, type: 'number' }
        : { exclusiveMinimum: rule.exclusiveMin, maximum: rule.maxBound, type: 'number' };
    case 'string':
      return { maxLength: rule.max, minLength: 1, type: 'string' };
  }
}

function nodeSchema(rule: NodeRule): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    id: { maxLength: MAX_BLUEPRINT_ID_LENGTH, minLength: 1, type: 'string' },
    type: { const: rule.type },
  };
  for (const fieldRule of rule.fields) {
    properties[fieldRule.name] = fieldSchema(fieldRule);
  }

  if (rule.children === 'required') {
    properties.children = {
      items: { $ref: '#/$defs/node' },
      maxItems: MAX_BLUEPRINT_CHILDREN,
      minItems: 1,
      type: 'array',
    };
  }

  const required = ['type'];
  if (rule.children === 'required') required.push('children');
  for (const fieldRule of rule.fields) {
    if (fieldRule.required) required.push(fieldRule.name);
  }

  return {
    additionalProperties: false,
    properties,
    required,
    type: 'object',
  };
}

/**
 * JSON Schema (draft 2020-12 vocabulary) for the same contract {@link parseUiBlueprint}
 * enforces. Hand it to a harness that supports structured output or tool-use schemas so the
 * model is constrained on the way out, not only on the way in.
 *
 * It cannot express the tree-wide node and depth bounds, which is why runtime validation stays
 * mandatory: treat this as a generation aid, never as the trust boundary.
 */
export const UI_BLUEPRINT_JSON_SCHEMA: Readonly<Record<string, unknown>> = Object.freeze({
  $defs: {
    node: {
      oneOf: Object.values(NODE_RULES).map((rule) => nodeSchema(rule)),
    },
  },
  additionalProperties: false,
  properties: {
    root: { $ref: '#/$defs/node' },
    version: { const: UI_BLUEPRINT_VERSION },
  },
  required: ['root', 'version'],
  type: 'object',
});
