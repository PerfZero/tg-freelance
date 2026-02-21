import { useEffect, useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";
import {
  AppRoot,
  Avatar,
  Button,
  Cell,
  Input,
  List,
  Placeholder,
  Section,
  Textarea,
} from "@telegram-apps/telegram-ui";

import "./App.css";

type TgUser = {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
};

type WebAppState = {
  isTelegram: boolean;
  platform: string;
  uiPlatform: "ios" | "base";
  appearance: "light" | "dark";
  version: string;
  colorScheme: string;
  initData: string;
  startParam?: string;
  user?: TgUser;
};

type PublicUser = {
  id: string;
  telegramId: string;
  username: string | null;
  displayName: string;
  profile: {
    about: string | null;
    skills: string[];
    rating: number;
    completedTasksCount: number;
  } | null;
};

type TaskStatusValue =
  | "OPEN"
  | "IN_PROGRESS"
  | "ON_REVIEW"
  | "COMPLETED"
  | "CANCELED";

type TaskItem = {
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
};

type SortValue = "new" | "budget" | "budget_asc" | "budget_desc";

type TaskFilters = {
  q: string;
  category: string;
  budgetMin: string;
  budgetMax: string;
  sort: SortValue;
  status: TaskStatusValue;
};

type CreateTaskForm = {
  title: string;
  description: string;
  budget: string;
  category: string;
  deadlineAt: string;
  tags: string;
};

type EditTaskForm = CreateTaskForm;

type ViewState =
  | { screen: "list" }
  | { screen: "create" }
  | { screen: "profile" }
  | { screen: "detail"; taskId: string };

type TabState = "list" | "create" | "profile";

const TOKEN_KEY = "tg_freelance_access_token";

const DEFAULT_FILTERS: TaskFilters = {
  q: "",
  category: "",
  budgetMin: "",
  budgetMax: "",
  sort: "new",
  status: "OPEN",
};

const DEFAULT_CREATE_FORM: CreateTaskForm = {
  title: "",
  description: "",
  budget: "",
  category: "",
  deadlineAt: "",
  tags: "",
};

const STATUS_OPTIONS: Array<{ value: TaskStatusValue; label: string }> = [
  { value: "OPEN", label: "Открыта" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "ON_REVIEW", label: "На проверке" },
  { value: "COMPLETED", label: "Завершена" },
  { value: "CANCELED", label: "Отменена" },
];

const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: "new", label: "Сначала новые" },
  { value: "budget", label: "Дороже сверху" },
  { value: "budget_asc", label: "Дешевле сверху" },
  { value: "budget_desc", label: "Дороже сверху (alt)" },
];

const getApiBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }

  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv;
  }

  if (window.location.hostname === "localhost") {
    return "http://localhost:3001";
  }

  return window.location.origin;
};

const API_BASE_URL = getApiBaseUrl();

const getSafeState = (): WebAppState => {
  if (
    typeof window === "undefined" ||
    !(window as Window & { Telegram?: unknown }).Telegram
  ) {
    return {
      isTelegram: false,
      platform: "web",
      uiPlatform: "base",
      appearance: "light",
      version: "n/a",
      colorScheme: "light",
      initData: "",
    };
  }

  WebApp.ready();
  WebApp.expand();

  const initUser = WebApp.initDataUnsafe?.user;

  return {
    isTelegram: true,
    platform: WebApp.platform,
    uiPlatform: WebApp.platform === "ios" ? "ios" : "base",
    appearance: WebApp.colorScheme === "dark" ? "dark" : "light",
    version: WebApp.version,
    colorScheme: WebApp.colorScheme,
    initData: WebApp.initData,
    startParam: WebApp.initDataUnsafe?.start_param,
    user: initUser
      ? {
          id: initUser.id,
          username: initUser.username,
          firstName: initUser.first_name,
          lastName: initUser.last_name,
        }
      : undefined,
  };
};

const getAcronym = (user?: TgUser): string => {
  if (!user) {
    return "TG";
  }

  const first = user.firstName?.[0] ?? user.username?.[0] ?? "T";
  const second = user.lastName?.[0] ?? "G";

  return `${first}${second}`.toUpperCase();
};

const getStatusLabel = (status: TaskStatusValue): string =>
  STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;

const apiRequest = async <T,>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> => {
  const headers = new Headers(options.headers ?? {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorMessage =
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof (parsed as { error?: { message?: unknown } }).error?.message ===
        "string"
        ? ((parsed as { error: { message: string } }).error.message as string)
        : `Request failed with status ${response.status}`;

    throw new Error(errorMessage);
  }

  return parsed as T;
};

const parseTagsInput = (raw: string): string[] => {
  const unique = new Set<string>();

  raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .forEach((tag) => unique.add(tag));

  return [...unique];
};

const formatMoney = (value: number): string =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string | null): string => {
  if (!value) {
    return "без дедлайна";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "без дедлайна";
  }

  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toInputDateTimeValue = (value: string | null): string => {
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

const fromInputDateTimeValue = (value: string): string | null => {
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

const trimText = (value: string, max = 130): string => {
  const prepared = value.trim();
  if (prepared.length <= max) {
    return prepared;
  }

  return `${prepared.slice(0, max)}...`;
};

const validateTaskForm = (form: CreateTaskForm): string | null => {
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

const buildTasksQuery = (page: number, filters: TaskFilters): string => {
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

function App() {
  const webAppState = useMemo(() => getSafeState(), []);
  const profileAcronym = useMemo(() => getAcronym(webAppState.user), [webAppState.user]);

  const [view, setView] = useState<ViewState>({ screen: "list" });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(TOKEN_KEY);
  });
  const [authUser, setAuthUser] = useState<PublicUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [filterDraft, setFilterDraft] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [filterApplied, setFilterApplied] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [createForm, setCreateForm] = useState<CreateTaskForm>(DEFAULT_CREATE_FORM);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailTask, setDetailTask] = useState<TaskItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditTaskForm>(DEFAULT_CREATE_FORM);

  const isAuthenticated = Boolean(token);
  const activeTab: TabState = view.screen === "detail" ? "list" : view.screen;

  useEffect(() => {
    let active = true;

    const hydrateAuth = async (): Promise<void> => {
      try {
        setAuthLoading(true);
        setAuthError(null);

        if (webAppState.isTelegram && webAppState.initData) {
          const result = await apiRequest<{
            token: string;
            user: PublicUser;
          }>("/auth/telegram", {
            method: "POST",
            body: JSON.stringify({ initData: webAppState.initData }),
          });

          if (!active) {
            return;
          }

          setToken(result.token);
          setAuthUser(result.user);
          window.localStorage.setItem(TOKEN_KEY, result.token);
          return;
        }

        const fallbackToken =
          typeof window !== "undefined"
            ? window.localStorage.getItem(TOKEN_KEY)
            : null;

        if (fallbackToken) {
          const me = await apiRequest<{ user: PublicUser }>(
            "/auth/me",
            {},
            fallbackToken,
          );
          if (!active) {
            return;
          }

          setToken(fallbackToken);
          setAuthUser(me.user);
        } else {
          setAuthError("Открой миниапп через Telegram, чтобы авторизоваться.");
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setAuthUser(null);
        setToken(null);
        window.localStorage.removeItem(TOKEN_KEY);
        setAuthError(
          error instanceof Error ? error.message : "Не удалось авторизоваться",
        );
      } finally {
        if (active) {
          setAuthLoading(false);
        }
      }
    };

    void hydrateAuth();

    return () => {
      active = false;
    };
  }, [webAppState.isTelegram, webAppState.initData]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    const loadTasks = async (): Promise<void> => {
      try {
        setListLoading(true);
        setListError(null);

        const query = buildTasksQuery(page, filterApplied);
        const response = await apiRequest<{
          items: TaskItem[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          };
        }>(`/tasks?${query}`, {}, token);

        if (!active) {
          return;
        }

        setTasks(response.items);
        setPagination(response.pagination);
      } catch (error) {
        if (!active) {
          return;
        }

        setListError(
          error instanceof Error ? error.message : "Не удалось загрузить задачи",
        );
      } finally {
        if (active) {
          setListLoading(false);
        }
      }
    };

    void loadTasks();

    return () => {
      active = false;
    };
  }, [token, page, filterApplied]);

  useEffect(() => {
    if (!token || view.screen !== "detail") {
      return;
    }

    let active = true;

    const loadDetail = async (): Promise<void> => {
      try {
        setDetailLoading(true);
        setDetailError(null);

        const response = await apiRequest<{ task: TaskItem }>(
          `/tasks/${view.taskId}`,
          {},
          token,
        );

        if (!active) {
          return;
        }

        setDetailTask(response.task);
        setEditForm({
          title: response.task.title,
          description: response.task.description,
          budget: String(response.task.budget),
          category: response.task.category,
          deadlineAt: toInputDateTimeValue(response.task.deadlineAt),
          tags: response.task.tags.join(", "),
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setDetailError(
          error instanceof Error ? error.message : "Не удалось загрузить задачу",
        );
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      active = false;
    };
  }, [token, view]);

  const switchTab = (tab: TabState): void => {
    setDetailError(null);
    setEditMode(false);

    if (tab === "list") {
      setView({ screen: "list" });
      return;
    }

    if (tab === "create") {
      setCreateError(null);
      setView({ screen: "create" });
      return;
    }

    setView({ screen: "profile" });
  };

  const handleApplyFilters = (): void => {
    setPage(1);
    setFilterApplied(filterDraft);
  };

  const handleResetFilters = (): void => {
    setFilterDraft(DEFAULT_FILTERS);
    setFilterApplied(DEFAULT_FILTERS);
    setPage(1);
  };

  const openTaskDetail = (taskId: string): void => {
    setDetailTask(null);
    setDetailError(null);
    setEditMode(false);
    setView({ screen: "detail", taskId });
  };

  const handleCreateTask = async (): Promise<void> => {
    if (!token) {
      return;
    }

    const validationError = validateTaskForm(createForm);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    try {
      setCreatePending(true);
      setCreateError(null);

      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        budget: Number(createForm.budget),
        category: createForm.category.trim(),
        deadline_at: fromInputDateTimeValue(createForm.deadlineAt),
        tags: parseTagsInput(createForm.tags),
      };

      const result = await apiRequest<{ task: TaskItem }>(
        "/tasks",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        token,
      );

      setCreateForm(DEFAULT_CREATE_FORM);
      setView({ screen: "detail", taskId: result.task.id });
      setPage(1);
      setFilterApplied((prev) => ({ ...prev, status: "OPEN" }));
      setFilterDraft((prev) => ({ ...prev, status: "OPEN" }));
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Не удалось создать задачу",
      );
    } finally {
      setCreatePending(false);
    }
  };

  const handleSaveTaskEdits = async (): Promise<void> => {
    if (!token || view.screen !== "detail" || !detailTask) {
      return;
    }

    const validationError = validateTaskForm(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    try {
      setEditPending(true);
      setEditError(null);

      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        budget: Number(editForm.budget),
        category: editForm.category.trim(),
        deadline_at: fromInputDateTimeValue(editForm.deadlineAt),
        tags: parseTagsInput(editForm.tags),
      };

      const response = await apiRequest<{ task: TaskItem }>(
        `/tasks/${view.taskId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        token,
      );

      setDetailTask(response.task);
      setEditMode(false);
      setPage(1);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Не удалось обновить задачу",
      );
    } finally {
      setEditPending(false);
    }
  };

  const handleCancelTask = async (): Promise<void> => {
    if (!token || view.screen !== "detail" || !detailTask) {
      return;
    }

    const confirmed = window.confirm("Отменить задачу?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await apiRequest<{ task: TaskItem }>(
        `/tasks/${view.taskId}/cancel`,
        {
          method: "POST",
        },
        token,
      );

      setDetailTask(response.task);
      setEditMode(false);
      setPage(1);
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Не удалось отменить задачу",
      );
    }
  };

  const renderAuthState = (): JSX.Element => {
    if (authLoading) {
      return (
        <Section>
          <Placeholder
            header="Авторизация"
            description="Подключаем профиль Telegram..."
          />
        </Section>
      );
    }

    if (!isAuthenticated || !authUser) {
      return (
        <Section>
          <Placeholder
            header="Нет доступа"
            description={
              authError ??
              "Открой миниапп внутри Telegram, чтобы авторизоваться и работать с задачами."
            }
          />
        </Section>
      );
    }

    return <></>;
  };

  const renderProfile = (): JSX.Element => {
    if (!authUser) {
      return <></>;
    }

    return (
      <Section
        header="Профиль"
        footer={`API: ${API_BASE_URL} | WebApp: ${webAppState.version}`}
      >
        <List>
          <Cell
            before={<Avatar size={48} acronym={profileAcronym} />}
            subtitle={authUser.username ? `@${authUser.username}` : "без username"}
            description={
              webAppState.isTelegram
                ? "Сессия Telegram активна"
                : "Режим браузера"
            }
          >
            {authUser.displayName}
          </Cell>
          <Cell subtitle="Статус профиля" after={authUser.profile ? "Заполнен" : "Пустой"}>
            Профиль в системе
          </Cell>
          <Cell subtitle="Завершено задач" after={String(authUser.profile?.completedTasksCount ?? 0)}>
            Рейтинг
          </Cell>
        </List>
      </Section>
    );
  };

  const renderTasksList = (): JSX.Element => (
    <>
      <Section
        header="Лента задач"
        footer="Выбери фильтры и нажми «Применить», чтобы обновить список."
      >
        <div className="form-grid">
          <Input
            header="Поиск"
            placeholder="Например: лендинг"
            value={filterDraft.q}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, q: event.target.value }))
            }
          />
          <Input
            header="Категория"
            placeholder="frontend"
            value={filterDraft.category}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, category: event.target.value }))
            }
          />
          <Input
            header="Бюджет от"
            type="number"
            value={filterDraft.budgetMin}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, budgetMin: event.target.value }))
            }
          />
          <Input
            header="Бюджет до"
            type="number"
            value={filterDraft.budgetMax}
            onChange={(event) =>
              setFilterDraft((prev) => ({ ...prev, budgetMax: event.target.value }))
            }
          />
        </div>

        <p className="form-label">Статус</p>
        <div className="chip-row">
          {STATUS_OPTIONS.map((statusOption) => (
            <Button
              key={statusOption.value}
              size="s"
              mode={filterDraft.status === statusOption.value ? "filled" : "outline"}
              onClick={() =>
                setFilterDraft((prev) => ({ ...prev, status: statusOption.value }))
              }
            >
              {statusOption.label}
            </Button>
          ))}
        </div>

        <p className="form-label">Сортировка</p>
        <div className="chip-row">
          {SORT_OPTIONS.map((sortOption) => (
            <Button
              key={sortOption.value}
              size="s"
              mode={filterDraft.sort === sortOption.value ? "filled" : "outline"}
              onClick={() =>
                setFilterDraft((prev) => ({ ...prev, sort: sortOption.value }))
              }
            >
              {sortOption.label}
            </Button>
          ))}
        </div>

        <div className="row-actions">
          <Button size="m" mode="filled" onClick={handleApplyFilters}>
            Применить фильтры
          </Button>
          <Button size="m" mode="outline" onClick={handleResetFilters}>
            Сбросить
          </Button>
          <Button size="m" mode="bezeled" onClick={() => switchTab("create")}>
            Создать задачу
          </Button>
        </div>
      </Section>

      <Section
        header={`Задачи (${pagination.total})`}
        footer={`Страница ${pagination.page}/${Math.max(pagination.totalPages, 1)}`}
      >
        {listLoading ? (
          <Placeholder header="Загрузка" description="Получаем список задач..." />
        ) : listError ? (
          <Placeholder header="Ошибка" description={listError} />
        ) : tasks.length === 0 ? (
          <Placeholder
            header="Пока пусто"
            description="По текущим фильтрам задач не найдено"
          />
        ) : (
          <List>
            {tasks.map((task) => (
              <Cell
                key={task.id}
                subtitle={`${task.category} • ${getStatusLabel(task.status)}`}
                description={`${trimText(task.description)} • Дедлайн: ${formatDate(task.deadlineAt)}`}
                after={formatMoney(task.budget)}
                onClick={() => openTaskDetail(task.id)}
              >
                {task.title}
              </Cell>
            ))}
          </List>
        )}

        <div className="row-actions">
          <Button
            mode="outline"
            size="m"
            disabled={page <= 1 || listLoading}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Назад
          </Button>
          <Button
            mode="outline"
            size="m"
            disabled={listLoading || page >= pagination.totalPages || pagination.totalPages === 0}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Вперед
          </Button>
        </div>
      </Section>
    </>
  );

  const renderCreateTask = (): JSX.Element => (
    <Section
      header="Новая задача"
      footer="После публикации откроется карточка задачи, где можно отредактировать детали."
    >
      <div className="form-grid">
        <Input
          header="Заголовок"
          placeholder="Сделать лендинг"
          value={createForm.title}
          onChange={(event) =>
            setCreateForm((prev) => ({ ...prev, title: event.target.value }))
          }
        />
        <Textarea
          header="Описание"
          placeholder="Что нужно сделать"
          value={createForm.description}
          onChange={(event) =>
            setCreateForm((prev) => ({ ...prev, description: event.target.value }))
          }
        />
        <Input
          header="Бюджет"
          type="number"
          placeholder="15000"
          value={createForm.budget}
          onChange={(event) =>
            setCreateForm((prev) => ({ ...prev, budget: event.target.value }))
          }
        />
        <Input
          header="Категория"
          placeholder="frontend"
          value={createForm.category}
          onChange={(event) =>
            setCreateForm((prev) => ({ ...prev, category: event.target.value }))
          }
        />
        <Input
          header="Дедлайн"
          type="datetime-local"
          value={createForm.deadlineAt}
          onChange={(event) =>
            setCreateForm((prev) => ({ ...prev, deadlineAt: event.target.value }))
          }
        />
        <Input
          header="Теги"
          placeholder="react, vite, telegram"
          value={createForm.tags}
          onChange={(event) =>
            setCreateForm((prev) => ({ ...prev, tags: event.target.value }))
          }
        />
      </div>

      {createError ? <p className="error-text">{createError}</p> : null}

      <div className="row-actions">
        <Button
          mode="filled"
          size="l"
          disabled={createPending}
          onClick={() => {
            void handleCreateTask();
          }}
        >
          {createPending ? "Публикуем..." : "Опубликовать задачу"}
        </Button>
        <Button mode="outline" size="l" onClick={() => switchTab("list")}>
          Назад к ленте
        </Button>
      </div>
    </Section>
  );

  const renderDetailTask = (): JSX.Element => {
    if (detailLoading) {
      return (
        <Section>
          <Placeholder header="Загрузка" description="Получаем карточку задачи..." />
        </Section>
      );
    }

    if (detailError) {
      return (
        <Section>
          <Placeholder header="Ошибка" description={detailError} />
        </Section>
      );
    }

    if (!detailTask) {
      return (
        <Section>
          <Placeholder header="Пусто" description="Задача не найдена" />
        </Section>
      );
    }

    const isOwner = detailTask.customerId === authUser?.id;
    const canEdit = isOwner && detailTask.status === "OPEN";

    return (
      <>
        <Section
          header={detailTask.title}
          footer={`Создано: ${formatDate(detailTask.createdAt)} • Дедлайн: ${formatDate(
            detailTask.deadlineAt,
          )}`}
        >
          <List>
            <Cell subtitle="Статус" after={getStatusLabel(detailTask.status)}>
              Статус задачи
            </Cell>
            <Cell subtitle="Категория" after={detailTask.category}>
              Категория
            </Cell>
            <Cell subtitle="Бюджет" after={formatMoney(detailTask.budget)}>
              Стоимость
            </Cell>
            <Cell subtitle="Теги" description={detailTask.tags.join(", ") || "-"}>
              Теги
            </Cell>
            <Cell subtitle="Описание" description={detailTask.description}>
              Детали
            </Cell>
          </List>

          <div className="row-actions">
            <Button mode="outline" onClick={() => switchTab("list")}>
              К ленте
            </Button>
            {canEdit ? (
              <Button mode="bezeled" onClick={() => setEditMode((prev) => !prev)}>
                {editMode ? "Скрыть редактирование" : "Редактировать"}
              </Button>
            ) : null}
            {canEdit ? (
              <Button mode="plain" onClick={() => void handleCancelTask()}>
                Отменить задачу
              </Button>
            ) : null}
          </div>
        </Section>

        {editMode ? (
          <Section
            header="Редактирование"
            footer="Изменять можно только задачи в статусе «Открыта»."
          >
            <div className="form-grid">
              <Input
                header="Заголовок"
                value={editForm.title}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
              <Textarea
                header="Описание"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
              <Input
                header="Бюджет"
                type="number"
                value={editForm.budget}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, budget: event.target.value }))
                }
              />
              <Input
                header="Категория"
                value={editForm.category}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, category: event.target.value }))
                }
              />
              <Input
                header="Дедлайн"
                type="datetime-local"
                value={editForm.deadlineAt}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    deadlineAt: event.target.value,
                  }))
                }
              />
              <Input
                header="Теги"
                value={editForm.tags}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, tags: event.target.value }))
                }
              />
            </div>

            {editError ? <p className="error-text">{editError}</p> : null}

            <div className="row-actions">
              <Button
                mode="filled"
                disabled={editPending}
                onClick={() => {
                  void handleSaveTaskEdits();
                }}
              >
                {editPending ? "Сохраняем..." : "Сохранить"}
              </Button>
              <Button mode="outline" onClick={() => setEditMode(false)}>
                Отмена
              </Button>
            </div>
          </Section>
        ) : null}
      </>
    );
  };

  return (
    <AppRoot appearance={webAppState.appearance} platform={webAppState.uiPlatform}>
      <main className="app-shell">
        <Section>
          <div className="app-head">
            <Avatar size={48} acronym={profileAcronym} />
            <div>
              <p className="app-title">TG Freelance</p>
              <p className="app-subtitle">
                {authUser ? `Вы вошли как ${authUser.displayName}` : "Подключение аккаунта..."}
              </p>
            </div>
          </div>

          <div className="tab-row">
            <Button
              mode={activeTab === "list" ? "filled" : "outline"}
              size="m"
              onClick={() => switchTab("list")}
            >
              Лента
            </Button>
            <Button
              mode={activeTab === "create" ? "filled" : "outline"}
              size="m"
              onClick={() => switchTab("create")}
            >
              Создать
            </Button>
            <Button
              mode={activeTab === "profile" ? "filled" : "outline"}
              size="m"
              onClick={() => switchTab("profile")}
            >
              Профиль
            </Button>
          </div>

          {view.screen === "detail" && detailTask ? (
            <p className="inline-hint">
              Сейчас открыт просмотр задачи «{trimText(detailTask.title, 40)}»
            </p>
          ) : null}
        </Section>

        {renderAuthState()}

        {isAuthenticated && authUser
          ? view.screen === "list"
            ? renderTasksList()
            : view.screen === "create"
              ? renderCreateTask()
              : view.screen === "profile"
                ? renderProfile()
                : renderDetailTask()
          : null}
      </main>
    </AppRoot>
  );
}

export default App;
