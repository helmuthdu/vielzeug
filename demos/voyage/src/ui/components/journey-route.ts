export type RouteGeometry = {
  height: number;
  path: string;
  points: Record<'Kyoto' | 'Osaka' | 'Tokyo', { x: number; y: number }>;
  width: number;
};

const journeyCoordinates = {
  Kyoto: [135.7681, 35.0116],
  Osaka: [135.5023, 34.6937],
  Tokyo: [139.6503, 35.6762],
} as const;

export function projectJourney(width: number, height: number): RouteGeometry {
  const mercator = ([longitude, latitude]: readonly [number, number]) => ({
    x: (longitude + 180) / 360,
    y: (1 - Math.asinh(Math.tan((latitude * Math.PI) / 180)) / Math.PI) / 2,
  });
  const northWest = mercator([135.1, 36.2]);
  const southEast = mercator([140.2, 34.3]);
  const center = { x: (northWest.x + southEast.x) / 2, y: (northWest.y + southEast.y) / 2 };
  const zoom = Math.floor(
    Math.min(
      Math.log2(width / ((southEast.x - northWest.x) * 512)),
      Math.log2(height / ((southEast.y - northWest.y) * 512)),
    ),
  );
  const worldSize = 512 * 2 ** zoom;
  const points = Object.fromEntries(
    Object.entries(journeyCoordinates).map(([name, coordinates]) => {
      const point = mercator(coordinates);
      return [
        name,
        { x: (point.x - center.x) * worldSize + width / 2, y: (point.y - center.y) * worldSize + height / 2 },
      ];
    }),
  ) as RouteGeometry['points'];
  const { Tokyo, Kyoto, Osaka } = points;

  return {
    height,
    path: `M ${Tokyo.x} ${Tokyo.y} C ${Tokyo.x - width * 0.18} ${Tokyo.y + height * 0.06}, ${Kyoto.x + width * 0.17} ${Kyoto.y - height * 0.05}, ${Kyoto.x} ${Kyoto.y} C ${Kyoto.x - width * 0.015} ${Kyoto.y + height * 0.025}, ${Osaka.x + width * 0.02} ${Osaka.y - height * 0.03}, ${Osaka.x} ${Osaka.y}`,
    points,
    width,
  };
}
