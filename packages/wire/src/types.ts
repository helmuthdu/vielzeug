/** A two-dimensional point in canvas space. */
export type Point = Readonly<{ x: number; y: number }>;

/** The side of a node a port sits on. Coordinates follow screen convention: `top` is smaller y. */
export type PortSide = 'top' | 'right' | 'bottom' | 'left';

/** A port position; `side` names the node edge the port faces. When absent, routing infers a default side. */
export type PortPoint = Point & Readonly<{ side?: PortSide }>;

/** An axis-aligned rectangle in canvas space, such as a node's bounding box. */
export type Rect = Readonly<{ x: number; y: number; width: number; height: number }>;

/** A directed edge between two node ids. */
export type Edge = Readonly<{ from: string; to: string }>;
