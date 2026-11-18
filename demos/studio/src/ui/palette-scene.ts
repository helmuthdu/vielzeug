import {
  contrastRatio,
  mix,
  PaletteParseError,
  parseColor,
  type RampOptions,
  type Rgba,
  ramp,
  readableOn,
  toHex,
  toHslString,
  toOklchString,
  toRgbString,
} from '@vielzeug/palette';
import '@vielzeug/refine/badge';
import '@vielzeug/refine/button';
import '@vielzeug/refine/color-picker';
import '@vielzeug/refine/input';
import '@vielzeug/refine/tooltip';
import { toast } from '@vielzeug/refine/toast';
import './palette.css';

const PRESETS = ['#7c3aed', '#0891b2', '#059669', '#e11d48', '#f59e0b', '#19202b', '#f2efe9'];
const RAMP: RampOptions = { steps: 10 };
const BLACK: Rgba = { a: 1, b: 0, g: 0, r: 0 };
const WHITE: Rgba = { a: 1, b: 255, g: 255, r: 255 };

function isParseError(error: unknown): error is PaletteParseError {
  return error instanceof PaletteParseError;
}

/** The subset of the `ore-input` contract this scene drives. */
interface ColorField extends HTMLElement {
  error: string | null;
  value: string;
}

function wcagBadge(ratio: number): { label: string; state: 'ok' | 'warn' | 'fail' } {
  if (ratio >= 7) return { label: 'AAA', state: 'ok' };
  if (ratio >= 4.5) return { label: 'AA', state: 'ok' };
  if (ratio >= 3) return { label: 'AA large', state: 'warn' };
  return { label: 'Fail', state: 'fail' };
}

/**
 * Mounts the palette scene: parses any supported CSS color with
 * @vielzeug/palette, then shows format conversions, an OKLab lightness ramp,
 * WCAG contrast badges, a two-color mix strip, and readable-text selection.
 */
export function mountPaletteScene(container: HTMLElement): { dispose(): void } {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.className = 'palette-root';
  root.dataset.testid = 'palette-root';
  container.append(root);

  // ── Controls ──────────────────────────────────────────────────────────────
  const controls = document.createElement('div');
  controls.className = 'palette-controls';
  controls.innerHTML = `
    <ore-input data-field="color" label="Base color" type="text" value="#7c3aed" helper="hex, rgb, hsl, oklch…"></ore-input>
    <ore-input data-field="mix" label="Mix with" type="text" value="#0891b2" helper="second color for the mix strip"></ore-input>`;
  root.append(controls);

  const picker = document.createElement('ore-color-picker');
  picker.setAttribute('label', 'Presets');
  picker.setAttribute('value', '#7c3aed');
  picker.setAttribute('options', JSON.stringify(PRESETS.map((color) => ({ color }))));
  picker.dataset.testid = 'palette-presets';
  root.append(picker);

  // ── Sections ──────────────────────────────────────────────────────────────
  // Each strip gets a heading so the page reads as four labelled sections
  // instead of four unlabeled blocks.
  function section(title: string, className: string): HTMLElement {
    const block = document.createElement('section');
    block.className = `palette-section ${className}`;
    const heading = document.createElement('h2');
    heading.className = 'palette-heading';
    heading.textContent = title;
    block.append(heading);
    root.append(block);
    return block;
  }

  const formatsSection = section('Formats', 'palette-section-formats');
  const formatsEl = document.createElement('dl');
  formatsEl.className = 'palette-formats';
  formatsEl.dataset.testid = 'palette-formats';
  formatsSection.append(formatsEl);

  const contrastSection = section('Contrast', 'palette-section-contrast');
  const contrastEl = document.createElement('div');
  contrastEl.className = 'palette-contrast';
  contrastEl.dataset.testid = 'palette-contrast';
  contrastSection.append(contrastEl);

  const rampSection = section('Lightness ramp', 'palette-section-ramp');
  const rampEl = document.createElement('div');
  rampEl.className = 'palette-ramp';
  rampEl.dataset.testid = 'palette-ramp';
  rampSection.append(rampEl);

  const mixSection = section('Mix', 'palette-section-mix');
  const mixEl = document.createElement('div');
  mixEl.className = 'palette-mix';
  mixEl.dataset.testid = 'palette-mix';
  mixSection.append(mixEl);

  const colorField = controls.querySelector<ColorField>('[data-field="color"]');
  const mixInput = controls.querySelector<ColorField>('[data-field="mix"]');
  if (!colorField || !mixInput) throw new Error('palette inputs missing');
  const baseField: ColorField = colorField;
  const mixField: ColorField = mixInput;

  function setInputError(field: ColorField, message: string | null): void {
    if (message) field.error = message;
    else field.error = null;
  }

  function swatch(color: Rgba, extraClass: string, interactive: boolean): HTMLElement {
    const hex = toHex(color);
    const text = readableOn(color, [BLACK, WHITE]);
    // Ramp swatches re-base the scene; mix swatches only show a result, so
    // they stay out of the tab order and are announced as images.
    const el = document.createElement(interactive ? 'button' : 'div');
    if (interactive) (el as HTMLButtonElement).type = 'button';
    else el.setAttribute('role', 'img');
    el.className = `palette-swatch ${extraClass}`;
    el.style.backgroundColor = hex;
    el.style.color = text ? toHex(text) : 'inherit';
    el.dataset.hex = hex;
    el.dataset.contrast = contrastRatio(color, text ?? BLACK).toFixed(2);
    el.textContent = 'Aa';
    el.title = `${hex} · contrast ${el.dataset.contrast}`;
    el.setAttribute('aria-label', interactive ? `Use ${hex}` : `${hex} · contrast ${el.dataset.contrast}`);
    return el;
  }

  /** Renders the scene and returns the parsed base color, or null when the field is invalid. */
  function render(): Rgba | null {
    let base: Rgba;
    try {
      base = parseColor(baseField.value);
      setInputError(baseField, null);
    } catch (error) {
      setInputError(baseField, isParseError(error) ? error.message : 'Unreadable color');
      return null;
    }

    // Formats: each conversion can be copied to the clipboard.
    formatsEl.innerHTML = '';
    for (const [name, value] of [
      ['hex', toHex(base, { alpha: true })],
      ['rgb', toRgbString(base)],
      ['hsl', toHslString(base)],
      ['oklch', toOklchString(base)],
    ] as const) {
      const item = document.createElement('div');
      item.className = 'palette-format';
      item.innerHTML = `<dt>${name}</dt><dd>${value}</dd>`;
      const copy = document.createElement('ore-button');
      copy.setAttribute('variant', 'ghost');
      copy.setAttribute('size', 'sm');
      copy.dataset.copy = name;
      copy.textContent = 'Copy';
      copy.addEventListener('click', () => {
        void navigator.clipboard
          .writeText(value)
          .then(() => toast.success(`${name.toUpperCase()} copied`))
          .catch(() => toast.error('Clipboard unavailable'));
      });
      item.append(copy);
      formatsEl.append(item);
    }

    // Contrast against white and black
    contrastEl.innerHTML = '';
    for (const [name, bg] of [
      ['on white', WHITE],
      ['on black', BLACK],
    ] as const) {
      const ratio = contrastRatio(base, bg);
      const badge = wcagBadge(ratio);
      contrastEl.insertAdjacentHTML(
        'beforeend',
        `<div class="palette-contrast-row" data-contrast="${name}">
           <span class="palette-contrast-sample" style="background-color:${toHex(bg)};color:${toHex(base)}">Aa</span>
           <span class="palette-contrast-name">${name}</span>
           <span class="palette-contrast-ratio">${ratio.toFixed(2)}:1</span>
           <ore-badge size="sm" color="${badge.state === 'ok' ? 'success' : badge.state === 'warn' ? 'warning' : 'error'}">${badge.label}</ore-badge>
         </div>`,
      );
    }

    // Lightness ramp: clicking a swatch re-bases the scene
    rampEl.innerHTML = '';
    for (const swatchColor of ramp(base, RAMP)) {
      const el = swatch(swatchColor, 'palette-ramp-swatch', true);
      el.addEventListener('click', () => {
        baseField.value = toHex(swatchColor);
        render();
      });
      rampEl.append(el);
    }

    // Mix strip toward the second color
    mixEl.innerHTML = '';
    let second: Rgba | null = null;
    try {
      second = parseColor(mixField.value);
      setInputError(mixField, null);
    } catch (error) {
      setInputError(mixField, isParseError(error) ? error.message : 'Unreadable color');
    }
    if (second) {
      for (let i = 0; i < RAMP.steps; i += 1) {
        mixEl.append(swatch(mix(base, second, i / (RAMP.steps - 1)), 'palette-mix-swatch', false));
      }
    }
    return base;
  }

  function syncPicker(hex: string): void {
    if (PRESETS.includes(hex.toLowerCase())) picker.setAttribute('value', hex);
  }

  const onColorInput = () => {
    const base = render();
    if (base) syncPicker(toHex(base));
  };
  baseField.addEventListener('input', onColorInput);
  baseField.addEventListener('change', onColorInput);
  mixField.addEventListener('input', render);
  mixField.addEventListener('change', render);

  const onPick = (event: Event) => {
    const detail = (event as CustomEvent<{ values: string[] }>).detail;
    const value = detail?.values?.[0];
    if (value) {
      baseField.value = value;
      render();
    }
  };
  picker.addEventListener('change', onPick);

  render();

  return {
    dispose() {
      baseField.removeEventListener('input', onColorInput);
      baseField.removeEventListener('change', onColorInput);
      mixField.removeEventListener('input', render);
      mixField.removeEventListener('change', render);
      picker.removeEventListener('change', onPick);
      container.innerHTML = '';
    },
  };
}
