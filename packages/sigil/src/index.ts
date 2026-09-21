// Public root surface of @vielzeug/sigil. Every public export goes through this file.
export { drawToCanvas } from './canvas';
export { encodeQr, qrCapacity } from './encode';
export {
  SigilCapacityError,
  SigilDisposedError,
  SigilError,
  SigilOptionError,
  SigilPermissionError,
  SigilUnsupportedError,
} from './errors';
export { createQrScanner, detectQr, isQrScanSupported, qrScanSupport } from './scan';
export { toSvg } from './svg';
export type {
  QrCanvasOptions,
  QrDetector,
  QrEncodeOptions,
  QrErrorCorrection,
  QrMatrix,
  QrMode,
  QrScanner,
  QrScannerOptions,
  QrScannerStatus,
  QrScanResult,
  QrSvgOptions,
  SigilEvent,
} from './types';
