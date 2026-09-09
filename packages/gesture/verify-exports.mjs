import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const gesture of modules) {
  const view = new EventTarget();
  const ownerDocument = Object.assign(new EventTarget(), { defaultView: view, visibilityState: 'visible' });
  const target = Object.assign(new EventTarget(), { ownerDocument });
  if (typeof gesture.createDragGesture !== 'function') throw new Error('createDragGesture export missing');
  const drag = gesture.createDragGesture(target, { pointerCapture: false });
  if (drag.disposed) throw new Error('drag gesture disposed during creation');
  drag.dispose();

  const controller = new AbortController();
  const pan = gesture.createPanGesture(target, { activationDistance: 0, signal: controller.signal });

  if (pan.disposed || pan.disposalSignal.aborted) throw new Error('gesture disposed before owner signal');
  controller.abort();
  if (!pan.disposed || !pan.disposalSignal.aborted) throw new Error('owner signal did not dispose gesture');

  let rejected = false;
  try {
    gesture.createPanGesture(target, { activationDistance: -1 });
  } catch (error) {
    rejected = error instanceof RangeError;
  }
  if (!rejected) throw new Error('invalid activation distance was accepted');
}
