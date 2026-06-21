export const scoutTypes = `
declare module '@vielzeug/scout' {
  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  export type FieldDef<T> =
    | (keyof T & string)
    | {
        field: keyof T & string;
        stringify?: (value: unknown) => string;
        weight?: number;
      };

  export type SearchConstraints = {
    limit?: number;
    minQueryLength?: number;
    threshold?: number;
  };

  export type ScoutIndexOptions<T> = SearchConstraints & {
    fields: ReadonlyArray<FieldDef<T>>;
  };

  export type CreateSearchOptions = SearchConstraints & {
    debounce?: number;
  };

  export type FieldMatch<F extends string = string> = {
    field: F;
    ranges: [number, number][];
  };

  export type SearchResult<T> = {
    item: T;
    matches: FieldMatch<keyof T & string>[];
    score: number;
  };

  export type HighlightPart = {
    highlighted: boolean;
    text: string;
  };

  export interface Signal<T> {
    readonly disposed: boolean;
    peek(): T;
    subscribe(listener: () => void): { dispose(): void };
    get value(): T;
    set value(v: T);
    dispose(): void;
  }

  export interface Computed<T> {
    readonly disposed: boolean;
    get value(): T;
    dispose(): void;
  }

  export type SearchState<T> = {
    readonly isSearching: Computed<boolean>;
    readonly query: Signal<string>;
    readonly results: Computed<SearchResult<T>[]>;
    clear(): void;
    dispose(): void;
    [Symbol.dispose](): void;
  };

  export type ReactiveSearch<T> = SearchState<T> & {
    readonly index: ScoutIndex<T>;
  };

  // ---------------------------------------------------------------------------
  // ScoutIndex
  // ---------------------------------------------------------------------------

  export interface ScoutIndex<T> {
    readonly items: readonly T[];
    readonly size: number;
    add(item: T): void;
    reindex(item: T): void;
    remove(item: T): void;
    search(query: string, options?: SearchConstraints): SearchResult<T>[];
  }

  // ---------------------------------------------------------------------------
  // Functions
  // ---------------------------------------------------------------------------

  export function createIndex<T>(items: T[], options: ScoutIndexOptions<T>): ScoutIndex<T>;

  export function createSearch<T>(index: ScoutIndex<T>, options?: CreateSearchOptions): SearchState<T>;

  export function createReactiveSearch<T>(
    items: T[],
    options: ScoutIndexOptions<T> & { debounce?: number },
  ): ReactiveSearch<T>;

  export function findMatchRanges(text: string, query: string): [number, number][];

  export function highlight(text: string, ranges: [number, number][]): HighlightPart[];

  export function highlightField<T>(result: SearchResult<T>, field: keyof T & string, text: string): HighlightPart[];

  export function toSearchFn<T>(
    index: ScoutIndex<T>,
    options?: SearchConstraints,
  ): (items: readonly T[], query: string) => readonly T[];

  export function toFilterPredicate<T>(
    index: ScoutIndex<T>,
    query: string,
    options?: SearchConstraints,
  ): (item: T) => boolean;
}
`;
