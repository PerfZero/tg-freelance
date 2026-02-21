import type { ProposalForm } from "../../entities/proposal/model/types";
import type {
  SortValue,
  TaskFilters,
  TaskForm,
  TaskStatusValue,
} from "../../entities/task/model/types";
import type {
  ExecutorProfileForm,
  ExperienceLevelValue,
} from "../../entities/user/model/types";

export type TabState = "list" | "create" | "profile";

export const TOKEN_KEY = "tg_freelance_access_token";

export const DEFAULT_FILTERS: TaskFilters = {
  q: "",
  category: "",
  budgetMin: "",
  budgetMax: "",
  sort: "new",
  status: "OPEN",
};

export const DEFAULT_TASK_FORM: TaskForm = {
  title: "",
  description: "",
  budget: "",
  category: "",
  deadlineAt: "",
  tags: "",
};

export const DEFAULT_PROPOSAL_FORM: ProposalForm = {
  price: "",
  comment: "",
  etaDays: "",
};

export const DEFAULT_EXECUTOR_PROFILE_FORM: ExecutorProfileForm = {
  about: "",
  skills: "",
  portfolioLinks: "",
  basePrice: "",
  experienceLevel: "",
};

export const STATUS_OPTIONS: Array<{ value: TaskStatusValue; label: string }> = [
  { value: "OPEN", label: "Открыта" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "ON_REVIEW", label: "На проверке" },
  { value: "COMPLETED", label: "Завершена" },
  { value: "CANCELED", label: "Отменена" },
];

export const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: "new", label: "Сначала новые" },
  { value: "budget", label: "Дороже сверху" },
  { value: "budget_asc", label: "Дешевле сверху" },
];

export const EXPERIENCE_LEVEL_OPTIONS: Array<{
  value: ExperienceLevelValue;
  label: string;
}> = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
];

export const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024;
export const MAX_TASK_DESCRIPTION_PREVIEW_CHARS = 180;
