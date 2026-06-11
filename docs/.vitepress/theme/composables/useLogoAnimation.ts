import { onMounted, onUnmounted, ref } from 'vue';

// ── Types ────────────────────────────────────────────────────────────────────

export type Pt = { x: number; y: number };

export type TailPt = Pt & { opacity: number; r: number };

export type Electron = {
  head: Pt;
  tail: TailPt[];
};

// ── Constants ────────────────────────────────────────────────────────────────

export const TAIL_LEN = 18;

const RINGS = [
  { cx: 32.0, cy: 32.0, dur: 3800, rx: 28.902, ry: 11.221, tilt: -Math.PI / 2 },
  { cx: 27.15, cy: 23.72, dur: 5200, rx: 28.902, ry: 11.221, tilt: (-Math.PI * 5) / 6 },
  { cx: 36.84, cy: 23.71, dur: 4500, rx: 28.902, ry: 11.221, tilt: -Math.PI / 6 },
] as const;

// Phase offsets so electrons start at different points on their rings
const PHASES = [0, -1.7 / 5.2, -0.9 / 4.5] as const;

// Nucleus comet tail animation constants (Inkscape local coords):
// tail tip → ball entry, ball stays fixed as tail breathes.
const TAIL_TIP = { x: 74.014653, y: 20.358239 };
const BALL_ENTRY = { x: 69.239759, y: 22.948267 };

// ── Nucleus path builder ─────────────────────────────────────────────────────

export function buildNucleusTailD(t: number): string {
  const sx = TAIL_TIP.x + (BALL_ENTRY.x - TAIL_TIP.x) * (1 - t);

  const sy = TAIL_TIP.y + (BALL_ENTRY.y - TAIL_TIP.y) * (1 - t);
  const sc = (v: number) => (v * t).toFixed(6);

  return (
    `m ${sx.toFixed(6)},${sy.toFixed(6)} ` +
    `c 0,0 ${sc(-2.742591)},${sc(1.622434)} ${sc(-2.877972)},${sc(1.556451)} ` +
    `${sc(-0.220497)},${sc(-0.107489)} ${sc(0.05383)},${sc(-0.610907)} ${sc(0.05383)},${sc(-0.610907)} ` +
    `${sc(-0.650251)},${sc(0.548161)} ${sc(-1.300501)},${sc(1.096323)} ${sc(-1.950752)},${sc(1.644484)} ` +
    `-0.0287,0.02464 -0.05675,0.05058 -0.08399,0.07782 ` +
    `-0.605065,0.605066 -0.605065,1.585962 0,2.191027 ` +
    `0.605065,0.605065 1.585961,0.605065 2.191026,0 ` +
    `0.06566,-0.06566 0.175755,-0.209478 0.175755,-0.209478 ` +
    `l ${sc(1.82801)},${sc(-2.435835)} ` +
    `c 0,0 -0.470958,0.250084 -0.564586,-0.109137 z`
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function posAt(ring: (typeof RINGS)[number], ts: number, phase: number): Pt {
  const angle = ((ts / ring.dur + phase) % 1) * Math.PI * 2;
  const cosT = Math.cos(ring.tilt);
  const sinT = Math.sin(ring.tilt);
  const px = ring.rx * Math.cos(angle);
  const py = ring.ry * Math.sin(angle);

  return { x: ring.cx + px * cosT - py * sinT, y: ring.cy + px * sinT + py * cosT };
}

function tailPoint(ts: number, ring: (typeof RINGS)[number], phase: number, step: number): TailPt {
  const decay = 1 - (step + 1) / (TAIL_LEN + 1);
  const pt = posAt(ring, ts - step * 16, phase);

  return {
    ...pt,
    opacity: 0.55 * Math.pow(decay, 1.2),
    r: 1.6 * Math.pow(decay, 1.4),
  };
}

// ── Composable ───────────────────────────────────────────────────────────────

export function useLogoAnimation() {
  const prefersReducedMotion = ref(false);
  const electrons = ref<Electron[]>(RINGS.map(() => ({ head: { x: 0, y: 0 }, tail: [] })));
  const nucleusTailD = ref(buildNucleusTailD(1));

  let rafId = 0;
  let hidden = false;

  function tick(ts: number) {
    const t = 0.845 + Math.sin(ts / 700) * 0.125;

    nucleusTailD.value = buildNucleusTailD(t);

    electrons.value = RINGS.map((ring, i) => ({
      head: posAt(ring, ts, PHASES[i]),
      tail: Array.from({ length: TAIL_LEN }, (_, step) => tailPoint(ts, ring, PHASES[i], step + 1)),
    }));

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (!prefersReducedMotion.value && !hidden) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function stop() {
    cancelAnimationFrame(rafId);
  }

  function onVisibilityChange() {
    hidden = document.hidden;

    if (hidden) {
      stop();
    } else {
      start();
    }
  }

  onMounted(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    prefersReducedMotion.value = mq.matches;

    mq.addEventListener('change', (e) => {
      prefersReducedMotion.value = e.matches;

      if (e.matches) {
        stop();
      } else {
        start();
      }
    });

    document.addEventListener('visibilitychange', onVisibilityChange);
    start();
  });

  onUnmounted(() => {
    stop();
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });

  return { electrons, nucleusTailD, prefersReducedMotion };
}
