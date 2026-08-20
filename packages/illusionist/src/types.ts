import type { RandomSource } from '@vielzeug/arsenal/random';

/** Locale-specific data used by the person category. */
export type PersonLocaleData = {
  readonly firstNameFemale: readonly string[];
  readonly firstNameMale: readonly string[];
  readonly gender: readonly string[];
  readonly jobAreas: readonly string[];
  readonly jobTypes: readonly string[];
  readonly lastName: readonly string[];
  readonly prefix: readonly string[];
  readonly suffix: readonly string[];
};

/** Locale-specific data used by the location category. */
export type LocationLocaleData = {
  readonly cities: readonly string[];
  readonly countries: readonly string[];
  readonly states: readonly string[];
  readonly streets: readonly string[];
  readonly zipPattern: string;
};

/** Explicit locale data supplied to {@link createIllusion}. */
export type IllusionistLocale = {
  readonly code: string;
  readonly person: PersonLocaleData;
  readonly location: LocationLocaleData;
};

/** Options for {@link createIllusion}. */
export type IllusionistOptions = {
  /** Numeric or string seed for deterministic output. Omit for cryptographic randomness. */
  seed?: number | string;
  /** Locale data for locale-aware categories. */
  locale: IllusionistLocale;
};

/** Internal context passed to every category factory. */
export type IllusionistContext = {
  readonly source: RandomSource;
  readonly locale: IllusionistLocale;
};

/** Re-exported from arsenal for consumer convenience. */
export type { RandomSource } from '@vielzeug/arsenal/random';
