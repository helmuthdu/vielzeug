import {
  createDragGesture,
  createPanGesture,
  type DragGestureDetail,
  type DragGestureOptions,
  type PanGestureDetail,
  type PanGestureOptions,
} from '@vielzeug/gesture';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type IsReadonly<T, K extends keyof T> = Equal<Pick<T, K>, Readonly<Pick<T, K>>>;

const options: PanGestureOptions = {
  activationDistance: 0,
  disabled: () => undefined,
  signal: new AbortController().signal,
};
const dragOptions: DragGestureOptions = { activationDistance: 0, pointerCapture: false };
const optionsReadonly: IsReadonly<PanGestureOptions, 'onMove'> = true;
const detailReadonly: IsReadonly<PanGestureDetail, 'distance'> = true;
const dragDetailReadonly: IsReadonly<DragGestureDetail, 'delta'> = true;

void createDragGesture;
void createPanGesture;
void detailReadonly;
void dragDetailReadonly;
void dragOptions;
void options;
void optionsReadonly;
