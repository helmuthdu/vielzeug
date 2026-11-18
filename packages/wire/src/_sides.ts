import type { Point, PortSide } from './types.js';

/** Outward unit vector for each port side; shared by the routers. */
export const SIDE_VECTOR: Readonly<Record<PortSide, Point>> = {
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
};

/** Grid movement directions; `None` (0) marks a start state with no incoming direction. */
export const Dir = { Down: 4, Left: 1, None: 0, Right: 2, Up: 3 } as const;
export type Dir = (typeof Dir)[keyof typeof Dir];
/** The four real movement directions, excluding the `None` sentinel. */
export type Move = Exclude<Dir, typeof Dir.None>;

/** Unit steps per movement direction, in grid order. */
export const DELTA: Readonly<Record<Move, Point>> = {
  [Dir.Left]: { x: -1, y: 0 },
  [Dir.Right]: { x: 1, y: 0 },
  [Dir.Up]: { x: 0, y: -1 },
  [Dir.Down]: { x: 0, y: 1 },
};

/** Outward direction a port on the given side faces. */
export const SIDE_DIR: Readonly<Record<PortSide, Move>> = {
  bottom: Dir.Down,
  left: Dir.Left,
  right: Dir.Right,
  top: Dir.Up,
};

export const OPPOSITE: Readonly<Record<Move, Move>> = {
  [Dir.Down]: Dir.Up,
  [Dir.Left]: Dir.Right,
  [Dir.Right]: Dir.Left,
  [Dir.Up]: Dir.Down,
};
