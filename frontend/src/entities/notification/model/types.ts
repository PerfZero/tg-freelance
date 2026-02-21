export type NotificationTypeValue =
  | "PROPOSAL_CREATED"
  | "EXECUTOR_SELECTED"
  | "TASK_SENT_TO_REVIEW"
  | "TASK_APPROVED"
  | "TASK_REJECTED";

export type NotificationItem = {
  id: string;
  userId: string;
  type: NotificationTypeValue;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};
