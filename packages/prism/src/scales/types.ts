export type { BandScale, Scale } from '../types';

export interface BandScaleConfig {
  domain: string[];
  padding?: number;
  paddingOuter?: number;
  range: [number, number];
}

export interface LinearScaleConfig {
  clamp?: boolean;
  domain: [number, number];
  nice?: boolean;
  range: [number, number];
}

export interface TimeScaleConfig {
  domain: [Date, Date];
  nice?: boolean;
  range: [number, number];
}
