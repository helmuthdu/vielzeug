import type { Camera } from '@vielzeug/atlas';
import { createPinchGesture, createWheelGesture } from '@vielzeug/gesture';

/** Per-notch wheel zoom factor, shared by every scene's camera. */
export const ZOOM_STEP = 1.0015;

/**
 * Mounts the wheel and pinch camera wiring shared by every canvas scene:
 * cursor-anchored wheel zoom (per the Studio brief, plain wheel and trackpad
 * pinch alike) and pinch zoom/rotate/pan about the centroid. The scene keeps
 * its own drag semantics; `cancelDrag` lets a pinch interrupt an in-flight
 * scene drag so the two never fight over the surface.
 */
export function createCameraGestures(
  surface: HTMLElement,
  camera: Camera,
  cancelDrag: () => void,
): { dispose(): void } {
  let pinchScale = 0;

  const pinch = createPinchGesture(surface, {
    onMove: (detail) => {
      const box = surface.getBoundingClientRect();
      const centroid = { x: detail.centroid.x - box.left, y: detail.centroid.y - box.top };
      // `scale` is cumulative since gesture start; zoom needs a per-frame ratio.
      const ratio = pinchScale === 0 ? 1 : detail.scale / pinchScale;
      pinchScale = detail.scale;
      if (ratio !== 1) camera.zoomAt(centroid, ratio);
      if (detail.deltaRotation !== 0) camera.rotateAt(centroid, detail.deltaRotation);
      // Content follows the fingers, same convention as drag-pan.
      if (detail.deltaCentroid.x !== 0 || detail.deltaCentroid.y !== 0) {
        camera.panBy(detail.deltaCentroid.x, detail.deltaCentroid.y);
      }
    },
    onStart: (detail) => {
      cancelDrag();
      pinchScale = detail.scale;
    },
  });

  const wheel = createWheelGesture(surface, {
    onWheel: (detail) => {
      const box = surface.getBoundingClientRect();
      const point = { x: detail.event.clientX - box.left, y: detail.event.clientY - box.top };
      camera.zoomAt(point, ZOOM_STEP ** -detail.deltaY);
    },
    preventDefault: true,
  });

  return {
    dispose() {
      wheel.dispose();
      pinch.dispose();
    },
  };
}
