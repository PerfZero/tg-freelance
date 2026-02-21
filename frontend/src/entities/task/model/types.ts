export type TaskStatusValue =
  | "OPEN"
  | "IN_PROGRESS"
  | "ON_REVIEW"
  | "COMPLETED"
  | "CANCELED";

export type TaskItem = {
  id: string;
  customerId: string;
  title: string;
  description: string;
  budget: number;
  deadlineAt: string | null;
  category: string;
  tags: string[];
  status: TaskStatusValue;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    username: string | null;
    displayName: string;
  } | null;
  assignment: {
    id: string;
    customerId: string;
    executorId: string;
  } | null;
};

export type TaskStatusHistoryItem = {
  id: string;
  taskId: string;
  fromStatus: TaskStatusValue | null;
  toStatus: TaskStatusValue;
  changedBy: string;
  comment: string | null;
  createdAt: string;
  changedByUser: {
    id: string;
    username: string | null;
    displayName: string;
  };
};

export type SortValue = "new" | "budget" | "budget_asc" | "budget_desc";

export type TaskFilters = {
  q: string;
  category: string;
  budgetMin: string;
  budgetMax: string;
  sort: SortValue;
  status: TaskStatusValue;
};

export type TaskForm = {
  title: string;
  description: string;
  budget: string;
  category: string;
  deadlineAt: string;
  tags: string;
};
