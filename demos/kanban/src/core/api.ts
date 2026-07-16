import { createCourier, createMutation } from '@vielzeug/courier';

import type { Board, Task, TaskStatus, User } from './types';

import { seedBoard, seedUsers } from './seed-data';

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

const board: Board = structuredClone(seedBoard);
const users: User[] = [...seedUsers];

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const TASK_MOVE_RE = /^\/api\/tasks\/([^/]+)\/move$/;
const TASK_RE = /^\/api\/tasks\/([^/]+)$/;

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname + input.search : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();

  // Parse JSON body when present
  async function parseBody<T>(): Promise<T> {
    const raw = init?.body;

    if (!raw) return {} as T;

    if (typeof raw === 'string') return JSON.parse(raw) as T;

    if (raw instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(raw)) as T;

    return {} as T;
  }

  function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
      status,
    });
  }

  // GET /api/board
  if (method === 'GET' && url === '/api/board') {
    return json(board);
  }

  // GET /api/users
  if (method === 'GET' && url === '/api/users') {
    return json(users);
  }

  // POST /api/tasks/:id/move
  const moveMatch = TASK_MOVE_RE.exec(url);

  if (method === 'POST' && moveMatch) {
    const id = moveMatch[1];
    const body = await parseBody<{ to: TaskStatus }>();
    const task = board.tasks.find((t) => t.id === id);

    if (!task) return json({ error: 'Task not found' }, 404);

    task.status = body.to;

    return json(task);
  }

  // PATCH /api/tasks/:id
  const taskMatch = TASK_RE.exec(url);

  if (method === 'PATCH' && taskMatch) {
    const id = taskMatch[1];
    const patch = await parseBody<Partial<Task>>();
    const index = board.tasks.findIndex((t) => t.id === id);

    if (index === -1) return json({ error: 'Task not found' }, 404);

    board.tasks[index] = { ...board.tasks[index], ...patch, id };

    return json(board.tasks[index]);
  }

  // DELETE /api/tasks/:id
  if (method === 'DELETE' && taskMatch) {
    const id = taskMatch![1];
    const before = board.tasks.length;

    board.tasks = board.tasks.filter((t) => t.id !== id);

    if (board.tasks.length === before) return json({ error: 'Task not found' }, 404);

    return json({ id });
  }

  return json({ error: 'Not found' }, 404);
}

// ---------------------------------------------------------------------------
// Courier instance
// ---------------------------------------------------------------------------

export const courier = createCourier({ fetch: mockFetch });

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export function getBoard(): Promise<Board> {
  return courier.api.get<Board>('/api/board');
}

export function getUsers(): Promise<User[]> {
  return courier.api.get<User[]>('/api/users');
}

export const moveMutation = createMutation(async (vars: { id: string; to: string }) =>
  courier.api.post('/api/tasks/' + vars.id + '/move', { body: vars }),
);

export const editMutation = createMutation(async (vars: { id: string; patch: Partial<Task> }) =>
  courier.api.patch('/api/tasks/' + vars.id, { body: vars.patch }),
);

export const deleteMutation = createMutation(async (id: string) => courier.api.delete('/api/tasks/' + id));
