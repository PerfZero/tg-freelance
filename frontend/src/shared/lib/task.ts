import type { ProposalForm } from "../../entities/proposal/model/types";
import type {
  TaskFilters,
  TaskForm,
  TaskStatusValue,
} from "../../entities/task/model/types";
import {
  MAX_TASK_DESCRIPTION_PREVIEW_CHARS,
  STATUS_OPTIONS,
} from "../config/constants";

export const getStatusLabel = (status: TaskStatusValue): string =>
  STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;

export const parseTagsInput = (raw: string): string[] => {
  const unique = new Set<string>();

  raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .forEach((tag) => unique.add(tag));

  return [...unique];
};

export const toInputDateTimeValue = (value: string | null): string => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (num: number): string => String(num).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const fromInputDateTimeValue = (value: string): string | null => {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

export const shouldClampTaskDescription = (value: string): boolean =>
  value.trim().length > MAX_TASK_DESCRIPTION_PREVIEW_CHARS;

export const buildTasksQuery = (page: number, filters: TaskFilters): string => {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    sort: filters.sort,
    status: filters.status,
  });

  if (filters.q.trim()) {
    params.set("q", filters.q.trim());
  }

  if (filters.category.trim()) {
    params.set("category", filters.category.trim());
  }

  if (filters.budgetMin.trim()) {
    params.set("budget_min", filters.budgetMin.trim());
  }

  if (filters.budgetMax.trim()) {
    params.set("budget_max", filters.budgetMax.trim());
  }

  return params.toString();
};

export const validateTaskForm = (form: TaskForm): string | null => {
  if (form.title.trim().length < 4) {
    return "Заголовок должен быть не короче 4 символов";
  }

  if (form.description.trim().length < 10) {
    return "Описание должно быть не короче 10 символов";
  }

  if (form.category.trim().length < 2) {
    return "Укажи категорию (минимум 2 символа)";
  }

  const budget = Number(form.budget);
  if (!Number.isFinite(budget) || budget <= 0) {
    return "Бюджет должен быть числом больше 0";
  }

  return null;
};

export const validateProposalForm = (form: ProposalForm): string | null => {
  const price = Number(form.price);
  if (!Number.isFinite(price) || price <= 0) {
    return "Цена отклика должна быть больше 0";
  }

  if (form.comment.trim().length < 5) {
    return "Комментарий к отклику должен быть не короче 5 символов";
  }

  const eta = Number(form.etaDays);
  if (!Number.isInteger(eta) || eta <= 0) {
    return "Срок должен быть целым числом дней";
  }

  return null;
};
