export type Role = 'admin' | 'member' | 'viewer';

export type User = {
  id: string;
  name: string;
  role: Role;
};

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type Task = {
  assigneeId: string | null;
  budget: { amount: string; currency: string } | null;
  /** ISO timestamp set the moment a task's status becomes `'done'`; cleared if moved back out. */
  completedAt: string | null;
  description: string;
  dueDate: string | null;
  id: string;
  ownerId: string;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
};

export type Column = {
  id: TaskStatus;
  title: string;
  /** Soft work-in-progress cap. Exceeding it flags the column's count badge — advisory, not enforced. */
  wipLimit?: number;
};

export type Board = {
  columns: Column[];
  tasks: Task[];
};
