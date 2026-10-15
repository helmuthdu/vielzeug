/** Shared library-neutral SVG data, independent of any icon provider. */
export type IconAttributes = Readonly<Record<string, string | number | undefined>>;
export type IconElement = {
  readonly tag: string;
  readonly attrs?: IconAttributes;
  readonly children?: readonly IconElement[];
};
export type IconDefinition = {
  readonly viewBox: readonly [number, number, number, number];
  readonly presentation?: IconAttributes;
  readonly children: readonly IconElement[];
};
