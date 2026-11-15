// Public root surface of @vielzeug/bard. Every public export goes through this file.
export { createBard } from './bard';
export { BardDisposedError, BardError, BardLoadError, BardUnsupportedError } from './errors';
export type {
  AssetDefinition,
  AssetManifest,
  AssetMeta,
  Bard,
  BardEvent,
  BardOptions,
  BardState,
  BusController,
  DeckOptions,
  DuckingRule,
  FadeOptions,
  MediaImage,
  MusicDeck,
  PlayOptions,
  QueueOptions,
  SoundHandle,
  SynthEnvelope,
  SynthFilter,
  SynthOptions,
  SynthWaveform,
  TransitionOptions,
} from './types';
