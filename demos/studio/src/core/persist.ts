import type { ThemePreference } from '@vielzeug/refine/theme';
import type { KeyValueVaultStore } from '@vielzeug/vault';
import { table, VaultError } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

import type { BoardShape } from './board.ts';
import type { FlowEdge, FlowNode } from './flow.ts';

/**
 * Scene persistence on top of @vielzeug/vault. Each scene owns a table keyed by
 * the record id, so a scene is one `getAll` on mount and one replace-all on
 * change. Records are plain JSON already, so the parsers below are the only
 * validation layer: anything malformed is rejected rather than trusted.
 */

/** The user's light/dark/system choice, kept next to the scenes it decorates. */
export type ThemeRow = { id: 'theme'; theme: ThemePreference };

const studioSchema = {
  boardShapes: table<BoardShape, 'id'>('id'),
  flowEdges: table<FlowEdge, 'id'>('id'),
  flowNodes: table<FlowNode, 'id'>('id'),
  preferences: table<ThemeRow, 'id'>('id'),
};

type StudioSchema = typeof studioSchema;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function num(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new VaultError(`studio: "${field}" must be a finite number`);
  }
  return value;
}

function str(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new VaultError(`studio: "${field}" must be a non-empty string`);
  }
  return value;
}

function parseBoardShape(value: unknown): BoardShape {
  if (!isRecord(value)) throw new VaultError('studio: board shape must be an object');
  const id = str(value.id, 'id');
  const x = num(value.x, 'x');
  const y = num(value.y, 'y');
  const width = num(value.width, 'width');
  const height = num(value.height, 'height');
  if (value.kind === 'rect') return { height, id, kind: 'rect', width, x, y };
  if (value.kind !== 'stroke') throw new VaultError(`studio: unknown shape kind "${String(value.kind)}"`);
  if (typeof value.path !== 'string') throw new VaultError('studio: stroke needs a path');
  const points = parseStrokePoints(value.points);
  const outline = parsePoints(value.outline);
  return { height, id, kind: 'stroke', outline, path: value.path, points, width, x, y };
}

function parsePoints(value: unknown): { x: number; y: number }[] {
  if (!Array.isArray(value)) throw new VaultError('studio: points must be an array');
  return value.map((point) => {
    if (!isRecord(point)) throw new VaultError('studio: point must be an object');
    return { x: num(point.x, 'x'), y: num(point.y, 'y') };
  });
}

function parseStrokePoints(value: unknown): { pressure?: number; time?: number; x: number; y: number }[] {
  if (!Array.isArray(value)) throw new VaultError('studio: points must be an array');
  return value.map((point) => {
    if (!isRecord(point)) throw new VaultError('studio: point must be an object');
    const pressure = point.pressure;
    const time = point.time;
    return {
      ...(typeof pressure === 'number' && Number.isFinite(pressure) ? { pressure } : {}),
      ...(typeof time === 'number' && Number.isFinite(time) ? { time } : {}),
      x: num(point.x, 'x'),
      y: num(point.y, 'y'),
    };
  });
}

function parseFlowPort(value: unknown): FlowNode['ports'][number] {
  if (!isRecord(value)) throw new VaultError('studio: port must be an object');
  const side = value.side;
  if (side !== 'top' && side !== 'right' && side !== 'bottom' && side !== 'left') {
    throw new VaultError('studio: port side is invalid');
  }
  return { id: str(value.id, 'port.id'), offset: num(value.offset, 'port.offset'), side };
}

function parseFlowNode(value: unknown): FlowNode {
  if (!isRecord(value)) throw new VaultError('studio: flow node must be an object');
  if (!Array.isArray(value.ports)) throw new VaultError('studio: flow node needs ports');
  return {
    height: num(value.height, 'height'),
    id: str(value.id, 'id'),
    label: str(value.label, 'label'),
    ports: value.ports.map(parseFlowPort),
    width: num(value.width, 'width'),
    x: num(value.x, 'x'),
    y: num(value.y, 'y'),
  };
}

function parseEndpoint(value: unknown): FlowEdge['from'] {
  if (!isRecord(value)) throw new VaultError('studio: edge endpoint must be an object');
  return { node: str(value.node, 'endpoint.node'), port: str(value.port, 'endpoint.port') };
}

function parseFlowEdge(value: unknown): FlowEdge {
  if (!isRecord(value)) throw new VaultError('studio: flow edge must be an object');
  return { from: parseEndpoint(value.from), id: str(value.id, 'id'), to: parseEndpoint(value.to) };
}

const THEME_VALUES: readonly ThemePreference[] = ['dark', 'light', 'system'];

function parseThemeRow(value: unknown): ThemeRow {
  if (!isRecord(value)) throw new VaultError('studio: theme row must be an object');
  const theme = value.theme;
  if (!THEME_VALUES.includes(theme as ThemePreference)) {
    throw new VaultError(`studio: unknown theme "${String(theme)}"`);
  }
  if (str(value.id, 'id') !== 'theme') throw new VaultError('studio: theme row id must be "theme"');
  return { id: 'theme', theme: theme as ThemePreference };
}

/** The one localStorage-backed store shared by the scenes. */
export type StudioStore = KeyValueVaultStore<StudioSchema> & {
  /** Drops every persisted scene and disposes the store. */
  wipe(): Promise<void>;
};

export function createStudioStore(): StudioStore {
  const store = createLocalStorage<StudioSchema>({
    name: 'vielzeug-studio',
    parsers: {
      boardShapes: { parse: parseBoardShape },
      flowEdges: { parse: parseFlowEdge },
      flowNodes: { parse: parseFlowNode },
      preferences: { parse: parseThemeRow },
    },
    schema: studioSchema,
  });
  return Object.assign(store, {
    async wipe(): Promise<void> {
      await Promise.all([store.clear('boardShapes'), store.clear('flowEdges'), store.clear('flowNodes')]);
    },
  });
}

/**
 * A persisted scene: load once on mount, replace-all on change. Writes go
 * straight to localStorage, so a reload right after an edit still sees it;
 * `saveScheduled` coalesces the burst of notifications a drag produces.
 */
export interface ScenePersistence<T extends { id: string }> {
  /** Replaces the stored rows with `rows`. */
  flush(rows: readonly T[]): void;
  /** Stored rows, newest write wins. Corrupt storage is dropped, not fatal. */
  load(): Promise<T[]>;
  /** Schedules a flush of `get()` on the next animation frame. */
  schedule(get: () => readonly T[]): void;
  /** Cancels any pending scheduled flush. */
  stop(): void;
  /** Drops the stored rows. */
  wipe(): Promise<void>;
}

function createScenePersistence<T extends { id: string }>(
  store: KeyValueVaultStore<StudioSchema>,
  name: keyof StudioSchema,
): ScenePersistence<T> {
  let frame = 0;
  // Bumped by every flush/wipe so an in-flight replace chain can see it has
  // been superseded and skip its write.
  let generation = 0;
  let pending: (() => readonly T[]) | null = null;

  const cancel = (): void => {
    if (frame !== 0) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    pending = null;
  };

  const flush = (rows: readonly T[]): void => {
    cancel();
    const at = ++generation;
    // Replace-all keeps the stored set exactly equal to the live scene.
    // The web-storage adapter writes synchronously, so a reload right after an
    // edit still sees the latest rows; the chained clear just drops removed ids.
    void store.clear(name).then(() => {
      if (at === generation) void store.putAll(name, rows as never[]);
    });
  };

  return {
    flush,
    async load() {
      try {
        return (await store.getAll(name)) as unknown as T[];
      } catch (error) {
        // A record written by an older build can fail validation; a demo that
        // cannot open its own scene is worse than one that starts empty.
        console.warn('[studio] dropping unreadable scene storage', error);
        await store.clear(name);
        return [];
      }
    },
    schedule(get) {
      pending = get;
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (pending) flush(pending());
      });
    },
    stop() {
      // A pending frame never fires once the scene is gone, so write it now.
      if (pending) flush(pending());
      else cancel();
    },
    async wipe() {
      cancel();
      generation++;
      await store.clear(name);
    },
  };
}

let sharedStore: StudioStore | null = null;

/** The page-wide store; scenes come and go but the store outlives them. */
export function studioStore(): StudioStore {
  sharedStore ??= createStudioStore();
  return sharedStore;
}

export function createBoardPersistence(store: StudioStore): ScenePersistence<BoardShape> {
  return createScenePersistence<BoardShape>(store, 'boardShapes');
}

export function createFlowPersistence(store: StudioStore): {
  edges: ScenePersistence<FlowEdge>;
  nodes: ScenePersistence<FlowNode>;
} {
  return {
    edges: createScenePersistence<FlowEdge>(store, 'flowEdges'),
    nodes: createScenePersistence<FlowNode>(store, 'flowNodes'),
  };
}

/**
 * Restores the id counter past the highest persisted `prefix-N` id, so ids
 * minted after a reload cannot collide with ids already in storage.
 */
export function advanceIdCounter(ids: Iterable<string>, prefix: string): number {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max + 1;
}
