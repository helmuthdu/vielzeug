import type {
  CursorSourceState,
  InfiniteSourceState,
  LocalSourceState,
  PageSourceState,
  ResourceState,
} from '../src/index.js';
import {
  createCursorSource,
  createInfiniteSource,
  createLocalSource,
  createPageSource,
  createResource,
} from '../src/index.js';

const page = createPageSource<string, { q: string }>({
  load: async () => ({ items: [], totalItems: 0 }),
  params: { q: '' },
});
const local = createLocalSource([1, 2, 3]);
const cursor = createCursorSource<string>({ load: async () => ({ items: [] }) });
const infinite = createInfiniteSource<string>({ load: async () => ({ items: [], totalItems: 0 }) });
const resource = createResource({ load: async () => ({ id: 1 }) });

// Each source kind keeps its own state type, not a union of all of them.
const pageState: PageSourceState<string, { q: string }> = page.state;
const localState: LocalSourceState<number> = local.state;
const cursorState: CursorSourceState<string> = cursor.state;
const infiniteState: InfiniteSourceState<string> = infinite.state;
const resourceState: ResourceState<{ id: number }> = resource.state;

// apply accepts a partial update and returns a promise.
const applied: Promise<void> = page.apply({ page: 2 });
const appliedBoth: Promise<void> = page.apply({ page: 2, params: { q: 'x' } });

void pageState;
void localState;
void cursorState;
void infiniteState;
void resourceState;
void applied;
void appliedBoth;

type ExpectFalse<T extends false> = T;
// Page items stay typed, so a wrong element type is caught at the consumer.
type WrongItem = ExpectFalse<string extends (typeof pageState.items)[number] ? false : true>;
// Resource data keeps its payload type.
type WrongResource = ExpectFalse<{ id: string } extends typeof resourceState.data ? true : false>;
// apply rejects a params object of the wrong shape.
type BadApply = ExpectFalse<{ params: { nope: number } } extends Parameters<typeof page.apply>[0] ? true : false>;

void (0 as unknown as [WrongItem, WrongResource, BadApply]);
