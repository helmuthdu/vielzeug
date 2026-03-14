/**
 * Built-in string configuration for @vielzeug/buildit.
 *
 * All user-visible strings emitted by components are centralised here so
 * consumers can override them for localisation without building a full i18n
 * pipeline.
 *
 * @example
 * ```ts
 * import { configureStrings } from '@vielzeug/buildit';
 *
 * configureStrings({
 *   alert: { dismiss: 'Fermer' },
 *   fileInput: { dropzoneTitle: 'Déposez vos fichiers ici' },
 * });
 * ```
 */

export interface BitStrings {
  /** Strings used by bit-alert */
  alert: {
    dismiss: string;
  };
  /** Strings used by bit-combobox */
  combobox: {
    clearAll: string;
    createOption: (inputValue: string) => string;
    loadingText: string;
    noResults: string;
  };
  /** Strings used by bit-dialog */
  dialog: {
    close: string;
  };
  /** Strings used by bit-file-input */
  fileInput: {
    dropzoneSubtitle: string;
    dropzoneTitle: string;
    removeFile: (filename: string) => string;
  };
  /** Strings used by bit-select */
  select: {
    loadingText: string;
    noResults: string;
  };
  /** Strings used by bit-toast */
  toast: {
    regionLabel: string;
  };
  /** Strings used by bit-radio-group */
  radioGroup: {
    required: string;
  };
}

const DEFAULT_STRINGS: BitStrings = {
  alert: {
    dismiss: 'Dismiss alert',
  },
  combobox: {
    clearAll: 'Clear all',
    createOption: (val) => `Create "${val}"`,
    loadingText: 'Loading…',
    noResults: 'No results found',
  },
  dialog: {
    close: 'Close dialog',
  },
  fileInput: {
    dropzoneSubtitle: 'or click to browse',
    dropzoneTitle: 'Drop files here',
    removeFile: (name) => `Remove ${name}`,
  },
  radioGroup: {
    required: 'Please select an option',
  },
  select: {
    loadingText: 'Loading…',
    noResults: 'No results found',
  },
  toast: {
    regionLabel: 'Notifications',
  },
};

let _strings: BitStrings = { ...DEFAULT_STRINGS };

/**
 * Returns the active built-in strings (merged with any overrides).
 * Component code calls this at render time so overrides take effect immediately.
 */
export function getStrings(): Readonly<BitStrings> {
  return _strings;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Override built-in strings.  Only the provided keys are replaced — the rest
 * keep their defaults.
 */
export function configureStrings(overrides: DeepPartial<BitStrings>): void {
  _strings = deepMerge(DEFAULT_STRINGS, overrides) as BitStrings;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
  const result = { ...base };

  for (const key of Object.keys(override) as (keyof T)[]) {
    const ov = override[key];

    if (ov !== undefined) {
      if (typeof ov === 'object' && !Array.isArray(ov) && ov !== null && typeof base[key] === 'object') {
        (result as any)[key] = deepMerge(base[key] as object, ov as object);
      } else {
        (result as any)[key] = ov;
      }
    }
  }

  return result;
}
