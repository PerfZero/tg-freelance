import type { TaskStatusValue } from "../../task/model/types";
import type { PublicUser } from "../../user/model/types";

export type AdminIdentity = {
  id: string;
  telegramId: string;
  username: string | null;
  displayName: string;
};

export type AdminUserItem = PublicUser;

export type AdminTaskItem = {
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

export type AdminAuditActionValue = "USER_BLOCK_CHANGED" | "TASK_MODERATED";
export type AdminAuditTargetTypeValue = "USER" | "TASK";

export type AdminAuditItem = {
  id: string;
  action: AdminAuditActionValue;
  targetType: AdminAuditTargetTypeValue;
  targetId: string;
  reason: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  adminUser: {
    id: string;
    username: string | null;
    displayName: string;
  };
};

export type AdminLogLevelValue = "INFO" | "WARN" | "ERROR";

export type AdminLogItem = {
  id: string;
  level: AdminLogLevelValue;
  message: string;
  context: Record<string, unknown> | null;
  createdAt: string;
};
