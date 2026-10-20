// Public root surface of @vielzeug/beacon. Every public export goes through this file.
export { createCoachmark } from './coachmark';
export { BeaconConfigError, BeaconDisposedError, BeaconError } from './errors';
export { resolveTarget } from './target';
export { createTour } from './tour';
export type {
  BeaconBaseEvent,
  BeaconCoachmarkConfig,
  BeaconCoachmarkEvent,
  BeaconCoachmarkHandle,
  BeaconCurrentStep,
  BeaconPlacement,
  BeaconPresentation,
  BeaconProgress,
  BeaconRect,
  BeaconStatus,
  BeaconStep,
  BeaconStorage,
  BeaconTarget,
  BeaconTargetResolver,
  BeaconTourConfig,
  BeaconTourEvent,
  BeaconTourHandle,
} from './types';
