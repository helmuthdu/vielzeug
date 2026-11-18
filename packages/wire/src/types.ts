/** A two-dimensional point in canvas space. */
export type Point = Readonly<{ x: number; y: number }>;

/** The side of a node a port sits on. Coordinates follow screen convention: `top` is smaller y. */
export type PortSide = 'top' | 'right' | 'bottom' | 'left';

/** A port position with a known side, as produced by `portAnchor()`. Routers require the side. */
export type PortAnchor = Point & Readonly<{ side: PortSide }>;

/** A cubic bezier segment in geometry form, ready for canvas or SVG rendering. */
export type CubicBezier = Readonly<{ from: Point; c1: Point; c2: Point; to: Point }>;

/** An axis-aligned rectangle in canvas space, such as a node's bounding box. */
export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;

/** A directed edge between two node ids. */
export type Edge = Readonly<{ from: string; to: string }>;
