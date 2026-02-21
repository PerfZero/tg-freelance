import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Filter,
  Home,
  RotateCcw,
  UserRound,
} from "lucide-react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router-dom";

import type { NotificationItem } from "../entities/notification/model/types";
import type {
  ProposalForm,
  ProposalItem,
} from "../entities/proposal/model/types";
import type {
  TaskFilters,
  TaskForm,
  TaskItem,
  TaskStatusHistoryItem,
} from "../entities/task/model/types";
import type {
  ExecutorProfileForm,
  PrimaryRoleValue,
  PublicUser,
} from "../entities/user/model/types";
import { API_BASE_URL, apiRequest } from "../shared/api/http";
import {
  DEFAULT_EXECUTOR_PROFILE_FORM,
  DEFAULT_FILTERS,
  DEFAULT_PROPOSAL_FORM,
  DEFAULT_TASK_FORM,
  MAX_AVATAR_FILE_SIZE,
  MAX_TASK_DESCRIPTION_PREVIEW_CHARS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  TOKEN_KEY,
  type TabState,
} from "../shared/config/constants";
import { readFileAsDataUrl } from "../shared/lib/file";
import {
  formatDate,
  formatMoney,
  formatRating,
  trimText,
} from "../shared/lib/format";
import {
  getExperienceLevelLabel,
  getExecutorProfileCheck,
  getPreferredTabByRole,
  isValidHttpUrl,
  toDelimitedList,
  toExecutorProfileForm,
  toRoleLabel,
} from "../shared/lib/profile";
import {
  buildTasksQuery,
  fromInputDateTimeValue,
  getStatusLabel,
  parseTagsInput,
  shouldClampTaskDescription,
  toInputDateTimeValue,
  validateProposalForm,
  validateTaskForm,
} from "../shared/lib/task";
import {
  getAcronym,
  getDisplayAcronym,
  getSafeState,
} from "../shared/lib/telegram";
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
} from "../shared/ui";
import {
  AccountAvatarScreen,
  AccountBotNotificationsScreen,
  AccountExecutorScreen,
  AccountHomeScreen,
  AccountNotificationsScreen,
  AccountRoleScreen,
} from "../pages/account/ui/AccountScreens";

import "../App.css";
function App() {
  const webAppState = useMemo(() => getSafeState(), []);
  const profileAcronym = useMemo(
    () => getAcronym(webAppState.user),
    [webAppState.user],
  );

  const location = useLocation();
  const navigate = useNavigate();
  const taskMatch = useMatch("/task/:taskId");
  const userMatch = useMatch("/user/:userId");
  const detailTaskId = taskMatch?.params.taskId ?? null;
  const profileUserId = userMatch?.params.userId ?? null;

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(TOKEN_KEY);
  });
  const [authUser, setAuthUser] = useState<PublicUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [roleSavePending, setRoleSavePending] = useState(false);
  const [roleSaveError, setRoleSaveError] = useState<string | null>(null);
  const [avatarSavePending, setAvatarSavePending] = useState(false);
  const [avatarSaveError, setAvatarSaveError] = useState<string | null>(null);
  const [executorProfileForm, setExecutorProfileForm] =
    useState<ExecutorProfileForm>(DEFAULT_EXECUTOR_PROFILE_FORM);
  const [executorProfilePending, setExecutorProfilePending] = useState(false);
  const [executorProfileError, setExecutorProfileError] = useState<
    string | null
  >(null);
  const [botNotificationsPending, setBotNotificationsPending] = useState(false);
  const [botNotificationsError, setBotNotificationsError] = useState<
    string | null
  >(null);

  const [filterDraft, setFilterDraft] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [filterApplied, setFilterApplied] =
    useState<TaskFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const [createForm, setCreateForm] = useState<TaskForm>(DEFAULT_TASK_FORM);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailTask, setDetailTask] = useState<TaskItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [expandedFeedDescriptions, setExpandedFeedDescriptions] = useState<
    Record<string, boolean>
  >({});
  const [expandedDetailDescription, setExpandedDetailDescription] =
    useState(false);
  const [statusHistory, setStatusHistory] = useState<TaskStatusHistoryItem[]>(
    [],
  );
  const [statusHistoryLoading, setStatusHistoryLoading] = useState(false);
  const [statusHistoryError, setStatusHistoryError] = useState<string | null>(
    null,
  );
  const [statusActionPending, setStatusActionPending] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(
    null,
  );
  const [rejectReviewMode, setRejectReviewMode] = useState(false);
  const [rejectReviewComment, setRejectReviewComment] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskForm>(DEFAULT_TASK_FORM);

  const [publicProfileUser, setPublicProfileUser] = useState<PublicUser | null>(
    null,
  );
  const [publicProfileLoading, setPublicProfileLoading] = useState(false);
  const [publicProfileError, setPublicProfileError] = useState<string | null>(
    null,
  );

  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);
  const [proposalsError, setProposalsError] = useState<string | null>(null);

  const [proposalForm, setProposalForm] = useState<ProposalForm>(
    DEFAULT_PROPOSAL_FORM,
  );
  const [proposalPending, setProposalPending] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [proposalEditMode, setProposalEditMode] = useState(false);

  const [selectPendingId, setSelectPendingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const [notificationsPending, setNotificationsPending] = useState(false);

  const isAuthenticated = Boolean(token);
  const preferredTab = getPreferredTabByRole(authUser?.primaryRole ?? null);
  const preferredPath = preferredTab === "create" ? "/create" : "/feed";
  const needsRoleOnboarding = Boolean(
    isAuthenticated && authUser && authUser.primaryRole === null,
  );
  const activeTab: TabState = location.pathname.startsWith("/account")
    ? "profile"
    : location.pathname === "/create"
      ? "create"
      : "list";

  const isDetailOwner = Boolean(
    authUser && detailTask && detailTask.customerId === authUser.id,
  );

  const ownProposal = useMemo(() => {
    if (!authUser) {
      return null;
    }

    return (
      proposals.find((proposal) => proposal.executorId === authUser.id) ?? null
    );
  }, [proposals, authUser]);

  const executorProfileCheck = useMemo(
    () => getExecutorProfileCheck(authUser?.profile ?? null),
    [authUser],
  );

  const requestStatusHistory = (taskId: string, authToken: string) =>
    apiRequest<{ items: TaskStatusHistoryItem[] }>(
      `/tasks/${taskId}/status-history`,
      {},
      authToken,
    );

  const requestNotifications = useCallback(
    (authToken: string) =>
      apiRequest<{
        items: NotificationItem[];
        unreadCount: number;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>("/notifications?page=1&limit=20", {}, authToken),
    [],
  );

  const refreshStatusHistory = async (): Promise<void> => {
    if (!token || !detailTaskId) {
      return;
    }

    try {
      setStatusHistoryLoading(true);
      setStatusHistoryError(null);

      const response = await requestStatusHistory(detailTaskId, token);
      setStatusHistory(response.items);
    } catch (error) {
      setStatusHistory([]);
      setStatusHistoryError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить историю статусов",
      );
    } finally {
      setStatusHistoryLoading(false);
    }
  };

  const refreshNotifications = useCallback(
    async (options?: { silent?: boolean }): Promise<void> => {
      if (!token) {
        return;
      }

      const isSilent = options?.silent === true;

      try {
        if (!isSilent) {
          setNotificationsLoading(true);
        }
        setNotificationsError(null);

        const response = await requestNotifications(token);
        setNotifications(response.items);
        setNotificationsUnreadCount(response.unreadCount);
      } catch (error) {
        setNotifications([]);
        setNotificationsUnreadCount(0);
        setNotificationsError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить уведомления",
        );
      } finally {
        if (!isSilent) {
          setNotificationsLoading(false);
        }
      }
    },
    [requestNotifications, token],
  );

  useEffect(() => {
    if (authLoading || !isAuthenticated || !authUser) {
      return;
    }

    if (authUser.primaryRole === null && location.pathname !== "/onboarding") {
      navigate("/onboarding", { replace: true });
      return;
    }

    if (authUser.primaryRole !== null && location.pathname === "/onboarding") {
      navigate(preferredPath, { replace: true });
    }
  }, [
    authLoading,
    authUser,
    isAuthenticated,
    location.pathname,
    navigate,
    preferredPath,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

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
      setNotifications([]);
      setNotificationsUnreadCount(0);
      setNotificationsError(null);
      setNotificationsLoading(false);
      return;
    }

    let active = true;

    const loadNotifications = async (): Promise<void> => {
      try {
        setNotificationsLoading(true);
        setNotificationsError(null);

        const response = await requestNotifications(token);

        if (!active) {
          return;
        }

        setNotifications(response.items);
        setNotificationsUnreadCount(response.unreadCount);
      } catch (error) {
        if (!active) {
          return;
        }

        setNotifications([]);
        setNotificationsUnreadCount(0);
        setNotificationsError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить уведомления",
        );
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    };

    void loadNotifications();

    const timerId = window.setInterval(() => {
      void refreshNotifications({ silent: true });
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(timerId);
    };
  }, [token, requestNotifications, refreshNotifications]);

  useEffect(() => {
    setExecutorProfileForm(toExecutorProfileForm(authUser?.profile ?? null));
    setExecutorProfileError(null);
    setBotNotificationsError(null);
  }, [authUser]);

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
        setExpandedFeedDescriptions({});
      } catch (error) {
        if (!active) {
          return;
        }

        setListError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить задачи",
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
    setDetailTask(null);
    setDetailError(null);
    setExpandedDetailDescription(false);
    setStatusHistory([]);
    setStatusHistoryLoading(false);
    setStatusHistoryError(null);
    setStatusActionPending(false);
    setStatusActionError(null);
    setRejectReviewMode(false);
    setRejectReviewComment("");
    setEditMode(false);
    setEditError(null);
    setProposals([]);
    setProposalsError(null);
    setProposalForm(DEFAULT_PROPOSAL_FORM);
    setProposalError(null);
    setProposalEditMode(false);
  }, [detailTaskId]);

  useEffect(() => {
    setPublicProfileUser(null);
    setPublicProfileError(null);
    setPublicProfileLoading(false);
  }, [profileUserId]);

  useEffect(() => {
    if (!token || !detailTaskId) {
      return;
    }

    let active = true;

    const loadDetailAndProposals = async (): Promise<void> => {
      try {
        setDetailLoading(true);
        setProposalsLoading(true);
        setStatusHistoryLoading(true);
        setDetailError(null);
        setProposalsError(null);
        setStatusHistoryError(null);

        const taskResponse = await apiRequest<{ task: TaskItem }>(
          `/tasks/${detailTaskId}`,
          {},
          token,
        );

        if (!active) {
          return;
        }

        setDetailTask(taskResponse.task);
        setEditForm({
          title: taskResponse.task.title,
          description: taskResponse.task.description,
          budget: String(taskResponse.task.budget),
          category: taskResponse.task.category,
          deadlineAt: toInputDateTimeValue(taskResponse.task.deadlineAt),
          tags: taskResponse.task.tags.join(", "),
        });

        try {
          const statusHistoryResponse = await requestStatusHistory(
            detailTaskId,
            token,
          );

          if (!active) {
            return;
          }

          setStatusHistory(statusHistoryResponse.items);
        } catch (error) {
          if (!active) {
            return;
          }

          setStatusHistory([]);
          setStatusHistoryError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить историю статусов",
          );
        }

        try {
          const proposalsResponse = await apiRequest<{ items: ProposalItem[] }>(
            `/tasks/${detailTaskId}/proposals`,
            {},
            token,
          );

          if (!active) {
            return;
          }

          setProposals(proposalsResponse.items);
        } catch (error) {
          if (!active) {
            return;
          }

          const message =
            error instanceof Error
              ? error.message
              : "Не удалось загрузить отклики";

          if (
            message.includes(
              "Only task owner or proposal author can view proposals",
            )
          ) {
            setProposals([]);
          } else {
            setProposalsError(message);
          }
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setDetailError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить задачу",
        );
      } finally {
        if (active) {
          setDetailLoading(false);
          setProposalsLoading(false);
          setStatusHistoryLoading(false);
        }
      }
    };

    void loadDetailAndProposals();

    return () => {
      active = false;
    };
  }, [token, detailTaskId]);

  useEffect(() => {
    if (!token || !profileUserId) {
      return;
    }

    let active = true;

    const loadPublicProfile = async (): Promise<void> => {
      try {
        setPublicProfileLoading(true);
        setPublicProfileError(null);

        const response = await apiRequest<{ user: PublicUser }>(
          `/profile/${profileUserId}`,
          {},
          token,
        );

        if (!active) {
          return;
        }

        setPublicProfileUser(response.user);
      } catch (error) {
        if (!active) {
          return;
        }

        setPublicProfileError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить профиль пользователя",
        );
      } finally {
        if (active) {
          setPublicProfileLoading(false);
        }
      }
    };

    void loadPublicProfile();

    return () => {
      active = false;
    };
  }, [profileUserId, token]);

  const switchTab = (tab: TabState): void => {
    if (tab === "list") {
      navigate("/feed");
      return;
    }

    if (tab === "create") {
      setCreateError(null);
      navigate("/create");
      return;
    }

    navigate("/account");
  };

  const handleApplyFilters = (): void => {
    setPage(1);
    setFilterApplied(filterDraft);
    setFiltersOpen(false);
  };

  const handleResetFilters = (): void => {
    setFilterDraft(DEFAULT_FILTERS);
    setFilterApplied(DEFAULT_FILTERS);
    setPage(1);
    setFiltersOpen(false);
  };

  const openTaskDetail = (taskId: string): void => {
    navigate(`/task/${taskId}`);
  };

  const toggleFeedDescription = (taskId: string): void => {
    setExpandedFeedDescriptions((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const openUserProfile = (userId: string): void => {
    navigate(`/user/${userId}`);
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

      setCreateForm(DEFAULT_TASK_FORM);
      setPage(1);
      setFilterApplied((prev) => ({ ...prev, status: "OPEN" }));
      setFilterDraft((prev) => ({ ...prev, status: "OPEN" }));
      navigate(`/task/${result.task.id}`);
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Не удалось создать задачу",
      );
    } finally {
      setCreatePending(false);
    }
  };

  const handleSaveTaskEdits = async (): Promise<void> => {
    if (!token || !detailTaskId || !detailTask) {
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
        `/tasks/${detailTaskId}`,
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
    if (!token || !detailTaskId || !detailTask) {
      return;
    }

    const confirmed = window.confirm("Отменить задачу?");
    if (!confirmed) {
      return;
    }

    try {
      const response = await apiRequest<{ task: TaskItem }>(
        `/tasks/${detailTaskId}/cancel`,
        {
          method: "POST",
        },
        token,
      );

      setDetailTask(response.task);
      await refreshStatusHistory();
      setEditMode(false);
      setPage(1);
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "Не удалось отменить задачу",
      );
    }
  };

  const handleSendToReview = async (): Promise<void> => {
    if (!token || !detailTaskId) {
      return;
    }

    try {
      setStatusActionPending(true);
      setStatusActionError(null);

      const response = await apiRequest<{ task: TaskItem }>(
        `/tasks/${detailTaskId}/send-to-review`,
        {
          method: "POST",
        },
        token,
      );

      setDetailTask(response.task);
      setRejectReviewMode(false);
      setRejectReviewComment("");
      await refreshStatusHistory();
    } catch (error) {
      setStatusActionError(
        error instanceof Error
          ? error.message
          : "Не удалось отправить задачу на проверку",
      );
    } finally {
      setStatusActionPending(false);
    }
  };

  const handleApproveTask = async (): Promise<void> => {
    if (!token || !detailTaskId) {
      return;
    }

    try {
      setStatusActionPending(true);
      setStatusActionError(null);

      const response = await apiRequest<{ task: TaskItem }>(
        `/tasks/${detailTaskId}/approve`,
        {
          method: "POST",
        },
        token,
      );

      setDetailTask(response.task);
      setRejectReviewMode(false);
      setRejectReviewComment("");
      await refreshStatusHistory();
    } catch (error) {
      setStatusActionError(
        error instanceof Error
          ? error.message
          : "Не удалось подтвердить задачу",
      );
    } finally {
      setStatusActionPending(false);
    }
  };

  const handleRejectReview = async (): Promise<void> => {
    if (!token || !detailTaskId) {
      return;
    }

    const normalizedComment = rejectReviewComment.trim();
    if (!normalizedComment) {
      setStatusActionError(
        "Укажи комментарий, почему задача возвращается в работу.",
      );
      return;
    }

    try {
      setStatusActionPending(true);
      setStatusActionError(null);

      const response = await apiRequest<{ task: TaskItem }>(
        `/tasks/${detailTaskId}/reject-review`,
        {
          method: "POST",
          body: JSON.stringify({ comment: normalizedComment }),
        },
        token,
      );

      setDetailTask(response.task);
      setRejectReviewMode(false);
      setRejectReviewComment("");
      await refreshStatusHistory();
    } catch (error) {
      setStatusActionError(
        error instanceof Error
          ? error.message
          : "Не удалось вернуть задачу в работу",
      );
    } finally {
      setStatusActionPending(false);
    }
  };

  const handleCreateProposal = async (): Promise<void> => {
    if (!token || !detailTaskId) {
      return;
    }

    const validationError = validateProposalForm(proposalForm);
    if (validationError) {
      setProposalError(validationError);
      return;
    }

    try {
      setProposalPending(true);
      setProposalError(null);

      const response = await apiRequest<{ proposal: ProposalItem }>(
        `/tasks/${detailTaskId}/proposals`,
        {
          method: "POST",
          body: JSON.stringify({
            price: Number(proposalForm.price),
            comment: proposalForm.comment.trim(),
            eta_days: Number(proposalForm.etaDays),
          }),
        },
        token,
      );

      setProposals([response.proposal]);
      setProposalForm({
        price: String(response.proposal.price),
        comment: response.proposal.comment,
        etaDays: String(response.proposal.etaDays),
      });
      setProposalEditMode(false);
    } catch (error) {
      setProposalError(
        error instanceof Error ? error.message : "Не удалось отправить отклик",
      );
    } finally {
      setProposalPending(false);
    }
  };

  const handleUpdateProposal = async (): Promise<void> => {
    if (!token || !ownProposal) {
      return;
    }

    const validationError = validateProposalForm(proposalForm);
    if (validationError) {
      setProposalError(validationError);
      return;
    }

    try {
      setProposalPending(true);
      setProposalError(null);

      const response = await apiRequest<{ proposal: ProposalItem }>(
        `/proposals/${ownProposal.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            price: Number(proposalForm.price),
            comment: proposalForm.comment.trim(),
            eta_days: Number(proposalForm.etaDays),
          }),
        },
        token,
      );

      setProposals((prev) =>
        prev.map((proposal) =>
          proposal.id === response.proposal.id ? response.proposal : proposal,
        ),
      );
      setProposalEditMode(false);
    } catch (error) {
      setProposalError(
        error instanceof Error ? error.message : "Не удалось обновить отклик",
      );
    } finally {
      setProposalPending(false);
    }
  };

  const handleDeleteProposal = async (): Promise<void> => {
    if (!token || !ownProposal) {
      return;
    }

    const confirmed = window.confirm("Удалить свой отклик?");
    if (!confirmed) {
      return;
    }

    try {
      setProposalPending(true);
      setProposalError(null);

      await apiRequest<void>(
        `/proposals/${ownProposal.id}`,
        {
          method: "DELETE",
        },
        token,
      );

      setProposals([]);
      setProposalForm(DEFAULT_PROPOSAL_FORM);
      setProposalEditMode(false);
    } catch (error) {
      setProposalError(
        error instanceof Error ? error.message : "Не удалось удалить отклик",
      );
    } finally {
      setProposalPending(false);
    }
  };

  const handleSelectProposal = async (proposalId: string): Promise<void> => {
    if (!token || !detailTaskId) {
      return;
    }

    try {
      setSelectPendingId(proposalId);

      const response = await apiRequest<{ task: TaskItem }>(
        `/tasks/${detailTaskId}/select-proposal`,
        {
          method: "POST",
          body: JSON.stringify({ proposal_id: proposalId }),
        },
        token,
      );

      setDetailTask(response.task);
      await refreshStatusHistory();
    } catch (error) {
      setProposalsError(
        error instanceof Error
          ? error.message
          : "Не удалось выбрать исполнителя",
      );
    } finally {
      setSelectPendingId(null);
    }
  };

  const handleReadNotification = async (
    notificationId: string,
  ): Promise<void> => {
    if (!token) {
      return;
    }

    try {
      setNotificationsPending(true);
      setNotificationsError(null);

      await apiRequest<{ notification: NotificationItem }>(
        `/notifications/${notificationId}/read`,
        {
          method: "POST",
        },
        token,
      );

      await refreshNotifications({ silent: true });
    } catch (error) {
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Не удалось отметить уведомление прочитанным",
      );
    } finally {
      setNotificationsPending(false);
    }
  };

  const handleReadAllNotifications = async (): Promise<void> => {
    if (!token) {
      return;
    }

    try {
      setNotificationsPending(true);
      setNotificationsError(null);

      await apiRequest<{ updatedCount: number }>(
        "/notifications/read-all",
        {
          method: "POST",
        },
        token,
      );

      await refreshNotifications({ silent: true });
    } catch (error) {
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Не удалось отметить уведомления прочитанными",
      );
    } finally {
      setNotificationsPending(false);
    }
  };

  const handleSetPrimaryRole = async (
    role: PrimaryRoleValue,
    options?: { navigateAfterSave?: boolean },
  ): Promise<void> => {
    if (!token) {
      return;
    }

    try {
      setRoleSavePending(true);
      setRoleSaveError(null);

      const response = await apiRequest<{ user: PublicUser }>(
        "/profile/me",
        {
          method: "PATCH",
          body: JSON.stringify({
            primary_role: role,
          }),
        },
        token,
      );

      setAuthUser(response.user);

      if (options?.navigateAfterSave) {
        const nextPath =
          getPreferredTabByRole(response.user.primaryRole) === "create"
            ? "/create"
            : "/feed";

        navigate(nextPath, { replace: true });
      }
    } catch (error) {
      setRoleSaveError(
        error instanceof Error ? error.message : "Не удалось сохранить роль",
      );
    } finally {
      setRoleSavePending(false);
    }
  };

  const handleSetBotNotifications = async (enabled: boolean): Promise<void> => {
    if (!token) {
      return;
    }

    try {
      setBotNotificationsPending(true);
      setBotNotificationsError(null);

      const response = await apiRequest<{ user: PublicUser }>(
        "/profile/me",
        {
          method: "PATCH",
          body: JSON.stringify({
            bot_notifications_enabled: enabled,
          }),
        },
        token,
      );

      setAuthUser(response.user);
    } catch (error) {
      setBotNotificationsError(
        error instanceof Error
          ? error.message
          : "Не удалось обновить настройку уведомлений бота",
      );
    } finally {
      setBotNotificationsPending(false);
    }
  };

  const saveCustomAvatar = async (dataUrl: string | null): Promise<void> => {
    if (!token) {
      return;
    }

    try {
      setAvatarSavePending(true);
      setAvatarSaveError(null);

      const response = await apiRequest<{ user: PublicUser }>(
        "/profile/me",
        {
          method: "PATCH",
          body: JSON.stringify({
            custom_avatar_data_url: dataUrl,
          }),
        },
        token,
      );

      setAuthUser(response.user);
    } catch (error) {
      setAvatarSaveError(
        error instanceof Error ? error.message : "Не удалось обновить фото",
      );
    } finally {
      setAvatarSavePending(false);
    }
  };

  const handleAvatarInputChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setAvatarSaveError("Можно загрузить только изображение");
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setAvatarSaveError("Файл слишком большой. Максимум 2 МБ.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      await saveCustomAvatar(dataUrl);
    } catch (error) {
      setAvatarSaveError(
        error instanceof Error ? error.message : "Не удалось обработать файл",
      );
    }
  };

  const handleSaveExecutorProfile = async (): Promise<void> => {
    if (!token) {
      return;
    }

    const about = executorProfileForm.about.trim();
    const skills = toDelimitedList(executorProfileForm.skills);
    const portfolioLinks = toDelimitedList(executorProfileForm.portfolioLinks);
    const basePrice = Number(executorProfileForm.basePrice);
    const experienceLevel = executorProfileForm.experienceLevel;

    if (about.length < 20) {
      setExecutorProfileError("Блок «О себе» должен быть минимум 20 символов.");
      return;
    }

    if (skills.length === 0) {
      setExecutorProfileError("Добавь хотя бы 1 навык.");
      return;
    }

    if (portfolioLinks.length === 0) {
      setExecutorProfileError("Добавь хотя бы 1 ссылку на портфолио.");
      return;
    }

    if (!portfolioLinks.every(isValidHttpUrl)) {
      setExecutorProfileError(
        "Ссылки портфолио должны быть валидными URL (http/https).",
      );
      return;
    }

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      setExecutorProfileError("Укажи базовую ставку больше 0.");
      return;
    }

    if (!experienceLevel) {
      setExecutorProfileError("Выбери уровень опыта.");
      return;
    }

    try {
      setExecutorProfilePending(true);
      setExecutorProfileError(null);

      const response = await apiRequest<{ user: PublicUser }>(
        "/profile/me",
        {
          method: "PATCH",
          body: JSON.stringify({
            about,
            skills,
            portfolio_links: portfolioLinks,
            base_price: basePrice,
            experience_level: experienceLevel,
          }),
        },
        token,
      );

      setAuthUser(response.user);
    } catch (error) {
      setExecutorProfileError(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить профиль исполнителя",
      );
    } finally {
      setExecutorProfilePending(false);
    }
  };

  const renderRoleOnboarding = (): JSX.Element => (
    <Section
      header="Стартовый режим"
      footer="Это влияет на стартовый экран и акценты в интерфейсе. Ограничений по функциям нет."
    >
      <p className="inline-hint">
        Выбери, как ты чаще используешь сервис. Роль можно поменять позже в
        профиле.
      </p>

      <div className="role-choice-grid">
        <button
          className="role-choice-card"
          type="button"
          disabled={roleSavePending}
          onClick={() => {
            void handleSetPrimaryRole("CUSTOMER", {
              navigateAfterSave: true,
            });
          }}
        >
          <span className="role-choice-title">Чаще заказчик</span>
          <span className="role-choice-description">
            Сразу попадаешь в создание задачи и быстрее публикуешь заказ.
          </span>
        </button>

        <button
          className="role-choice-card"
          type="button"
          disabled={roleSavePending}
          onClick={() => {
            void handleSetPrimaryRole("EXECUTOR", {
              navigateAfterSave: true,
            });
          }}
        >
          <span className="role-choice-title">Чаще исполнитель</span>
          <span className="role-choice-description">
            Стартовая вкладка будет с лентой задач, чтобы быстрее откликаться.
          </span>
        </button>
      </div>

      {roleSaveError ? <p className="error-text">{roleSaveError}</p> : null}
    </Section>
  );

  const renderAccountHome = (): JSX.Element => {
    if (!authUser) {
      return <></>;
    }

    return (
      <AccountHomeScreen
        authUser={authUser}
        profileAcronym={profileAcronym}
        webAppVersion={webAppState.version}
        apiBaseUrl={API_BASE_URL}
        notificationsUnreadCount={notificationsUnreadCount}
        executorProfileCheck={executorProfileCheck}
        onOpenAvatar={() => navigate("/account/avatar")}
        onOpenRole={() => navigate("/account/role")}
        onOpenExecutor={() => navigate("/account/executor")}
        onOpenBotNotifications={() => navigate("/account/bot-notifications")}
        onOpenNotificationsCenter={() => navigate("/account/notifications")}
      />
    );
  };

  const renderAccountAvatar = (): JSX.Element => {
    if (!authUser) {
      return <></>;
    }

    return (
      <AccountAvatarScreen
        authUser={authUser}
        profileAcronym={profileAcronym}
        avatarSavePending={avatarSavePending}
        avatarSaveError={avatarSaveError}
        onAvatarInputChange={(event) => {
          void handleAvatarInputChange(event);
        }}
        onResetAvatar={() => {
          void saveCustomAvatar(null);
        }}
        onBack={() => navigate("/account")}
      />
    );
  };

  const renderAccountRole = (): JSX.Element => {
    if (!authUser) {
      return <></>;
    }

    return (
      <AccountRoleScreen
        authUser={authUser}
        roleSavePending={roleSavePending}
        roleSaveError={roleSaveError}
        onSetRole={(role) => {
          void handleSetPrimaryRole(role);
        }}
        onBack={() => navigate("/account")}
      />
    );
  };

  const renderAccountExecutor = (): JSX.Element => (
    <AccountExecutorScreen
      executorProfileCheck={executorProfileCheck}
      executorProfileForm={executorProfileForm}
      executorProfilePending={executorProfilePending}
      executorProfileError={executorProfileError}
      onFormPatch={(patch) =>
        setExecutorProfileForm((prev) => ({
          ...prev,
          ...patch,
        }))
      }
      onSave={() => {
        void handleSaveExecutorProfile();
      }}
      onBack={() => navigate("/account")}
    />
  );

  const renderAccountBotNotifications = (): JSX.Element => (
    <AccountBotNotificationsScreen
      enabled={Boolean(authUser?.profile?.botNotificationsEnabled)}
      botNotificationsPending={botNotificationsPending}
      botNotificationsError={botNotificationsError}
      onSetEnabled={(enabled) => {
        void handleSetBotNotifications(enabled);
      }}
      onOpenNotificationsCenter={() => navigate("/account/notifications")}
      onBack={() => navigate("/account")}
    />
  );

  const renderAccountNotifications = (): JSX.Element => (
    <AccountNotificationsScreen
      notificationsUnreadCount={notificationsUnreadCount}
      notifications={notifications}
      notificationsLoading={notificationsLoading}
      notificationsError={notificationsError}
      notificationsPending={notificationsPending}
      onReadAll={() => {
        void handleReadAllNotifications();
      }}
      onRefresh={() => {
        void refreshNotifications();
      }}
      onReadOne={(notificationId) => {
        void handleReadNotification(notificationId);
      }}
      onBack={() => navigate("/account")}
    />
  );

  const renderPublicProfile = (): JSX.Element => {
    if (publicProfileLoading) {
      return (
        <Section>
          <Placeholder
            header="Загрузка"
            description="Получаем публичный профиль..."
          />
        </Section>
      );
    }

    if (publicProfileError) {
      return (
        <Section>
          <Placeholder header="Ошибка" description={publicProfileError} />
        </Section>
      );
    }

    if (!publicProfileUser) {
      return (
        <Section>
          <Placeholder
            header="Профиль не найден"
            description="Проверь ссылку или вернись к ленте."
          />
        </Section>
      );
    }

    const publicProfile = publicProfileUser.profile;
    const publicAcronym = getDisplayAcronym(publicProfileUser.displayName);

    return (
      <>
        <Section
          header="Публичный профиль"
          footer="Эти данные видят другие пользователи при выборе исполнителя и работе по задаче."
        >
          <List>
            <Cell
              before={
                <Avatar
                  size={48}
                  acronym={publicAcronym}
                  imageUrl={publicProfile?.avatarUrl ?? null}
                />
              }
              subtitle="Пользователь платформы"
              description={`Приоритет: ${toRoleLabel(publicProfileUser.primaryRole)}`}
            >
              {publicProfileUser.displayName}
            </Cell>
            <Cell
              subtitle="О себе"
              description={publicProfile?.about ?? "Не заполнено"}
            >
              Описание
            </Cell>
            <Cell
              subtitle="Навыки"
              description={
                publicProfile && publicProfile.skills.length > 0
                  ? publicProfile.skills.join(", ")
                  : "Не указаны"
              }
            >
              Компетенции
            </Cell>
            <Cell
              subtitle="Уровень"
              after={getExperienceLevelLabel(
                publicProfile?.experienceLevel ?? null,
              )}
            >
              Опыт
            </Cell>
            <Cell
              subtitle="Базовая ставка"
              after={
                publicProfile?.basePrice
                  ? formatMoney(publicProfile.basePrice)
                  : "Не указана"
              }
            >
              Стоимость
            </Cell>
            <Cell
              subtitle="Портфолио"
              description={
                publicProfile && publicProfile.portfolioLinks.length > 0
                  ? publicProfile.portfolioLinks.slice(0, 3).join(" • ")
                  : "Ссылки не добавлены"
              }
            >
              Кейсы
            </Cell>
            <Cell subtitle="Рейтинг" after={String(publicProfile?.rating ?? 0)}>
              Репутация
            </Cell>
            <Cell
              subtitle="Завершено задач"
              after={String(publicProfile?.completedTasksCount ?? 0)}
            >
              Статистика
            </Cell>
          </List>
        </Section>

        <Section>
          <div className="row-actions row-actions-tight">
            <Button mode="outline" onClick={() => navigate(-1)}>
              Назад
            </Button>
            <Button mode="bezeled" onClick={() => navigate("/feed")}>
              К ленте
            </Button>
          </div>
        </Section>
      </>
    );
  };

  const renderTasksList = (): JSX.Element => {
    const activeFiltersCount = [
      filterApplied.q.trim(),
      filterApplied.category.trim(),
      filterApplied.budgetMin.trim(),
      filterApplied.budgetMax.trim(),
    ].filter((value) => value.length > 0).length;
    const isCustomerPriority = authUser?.primaryRole === "CUSTOMER";

    const filtersSummary =
      activeFiltersCount > 0
        ? `Фильтров активно: ${activeFiltersCount}`
        : "Фильтры не заданы";

    return (
      <>
        <Section
          header="Лента задач"
          footer="Фильтры свернуты по умолчанию, чтобы сначала видеть список задач."
        >
          <div className="feed-toolbar">
            <Button
              size="m"
              mode={filtersOpen ? "filled" : "outline"}
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              <span className="btn-with-icon">
                <Filter size={16} />
                <span>
                  {filtersOpen ? "Скрыть фильтры" : "Показать фильтры"}
                </span>
              </span>
            </Button>
            <Button
              size="m"
              mode={isCustomerPriority ? "filled" : "bezeled"}
              onClick={() => navigate("/create")}
            >
              <span className="btn-with-icon">
                <CirclePlus size={16} />
                <span>
                  {isCustomerPriority ? "Создать задачу" : "Разместить задачу"}
                </span>
              </span>
            </Button>
          </div>

          <p className="feed-inline-hint">{filtersSummary}</p>

          {filtersOpen ? (
            <>
              <div className="form-grid">
                <Input
                  header="Поиск"
                  placeholder="Например: лендинг"
                  value={filterDraft.q}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({
                      ...prev,
                      q: event.target.value,
                    }))
                  }
                />
                <Input
                  header="Категория"
                  placeholder="frontend"
                  value={filterDraft.category}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                />
                <Input
                  header="Бюджет от"
                  type="number"
                  value={filterDraft.budgetMin}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({
                      ...prev,
                      budgetMin: event.target.value,
                    }))
                  }
                />
                <Input
                  header="Бюджет до"
                  type="number"
                  value={filterDraft.budgetMax}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({
                      ...prev,
                      budgetMax: event.target.value,
                    }))
                  }
                />
              </div>

              <p className="form-label">Статус</p>
              <div className="chip-row">
                {STATUS_OPTIONS.map((statusOption) => (
                  <Button
                    key={statusOption.value}
                    size="s"
                    mode={
                      filterDraft.status === statusOption.value
                        ? "filled"
                        : "outline"
                    }
                    onClick={() =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        status: statusOption.value,
                      }))
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
                    mode={
                      filterDraft.sort === sortOption.value
                        ? "filled"
                        : "outline"
                    }
                    onClick={() =>
                      setFilterDraft((prev) => ({
                        ...prev,
                        sort: sortOption.value,
                      }))
                    }
                  >
                    {sortOption.label}
                  </Button>
                ))}
              </div>

              <div className="row-actions row-actions-tight">
                <Button size="m" mode="filled" onClick={handleApplyFilters}>
                  <span className="btn-with-icon">
                    <Check size={16} />
                    <span>Применить</span>
                  </span>
                </Button>
                <Button size="m" mode="outline" onClick={handleResetFilters}>
                  <span className="btn-with-icon">
                    <RotateCcw size={16} />
                    <span>Сбросить</span>
                  </span>
                </Button>
              </div>
            </>
          ) : null}
        </Section>

        <Section
          header={`Задачи (${pagination.total})`}
          footer={`Страница ${pagination.page}/${Math.max(pagination.totalPages, 1)}`}
        >
          {listLoading ? (
            <Placeholder
              header="Загрузка"
              description="Получаем список задач..."
            />
          ) : listError ? (
            <Placeholder header="Ошибка" description={listError} />
          ) : tasks.length === 0 ? (
            <Placeholder
              header="Пока пусто"
              description="По текущим фильтрам задач не найдено"
            />
          ) : (
            <div className="task-feed-list">
              {tasks.map((task) => {
                const isExpanded = Boolean(expandedFeedDescriptions[task.id]);
                const canClamp = shouldClampTaskDescription(task.description);
                const previewDescription =
                  canClamp && !isExpanded
                    ? trimText(
                        task.description,
                        MAX_TASK_DESCRIPTION_PREVIEW_CHARS,
                      )
                    : task.description;

                return (
                  <article key={task.id} className="task-feed-card">
                    <div className="task-feed-card-head">
                      <h3 className="task-feed-card-title">{task.title}</h3>
                      <p className="task-feed-card-budget">
                        {formatMoney(task.budget)}
                      </p>
                    </div>

                    <div className="task-feed-meta-row">
                      <span className="task-feed-meta-chip">
                        {getStatusLabel(task.status)}
                      </span>
                      <span className="task-feed-meta-chip">
                        {formatDate(task.deadlineAt)}
                      </span>
                    </div>

                    <div className="task-feed-meta-row">
                      <span className="task-feed-meta-chip">
                        {task.category}
                      </span>
                      {task.tags.slice(0, 3).map((tag) => (
                        <span
                          key={`${task.id}-${tag}`}
                          className="task-feed-meta-chip"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <p className="task-feed-description">
                      {previewDescription}
                    </p>

                    {canClamp ? (
                      <div className="task-feed-readmore-row">
                        <Button
                          mode="outline"
                          size="s"
                          onClick={() => toggleFeedDescription(task.id)}
                        >
                          {isExpanded ? "Скрыть" : "Показать еще"}
                        </Button>
                      </div>
                    ) : null}

                    <div className="task-feed-actions">
                      <Button
                        mode="bezeled"
                        size="m"
                        onClick={() => openTaskDetail(task.id)}
                      >
                        Открыть задачу
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="row-actions row-actions-tight">
            <Button
              mode="outline"
              size="m"
              disabled={page <= 1 || listLoading}
              onClick={() => setPage((prev) => prev - 1)}
            >
              <span className="btn-with-icon">
                <ChevronLeft size={16} />
                <span>Назад</span>
              </span>
            </Button>
            <Button
              mode="outline"
              size="m"
              disabled={
                listLoading ||
                page >= pagination.totalPages ||
                pagination.totalPages === 0
              }
              onClick={() => setPage((prev) => prev + 1)}
            >
              <span className="btn-with-icon">
                <span>Вперед</span>
                <ChevronRight size={16} />
              </span>
            </Button>
          </div>
        </Section>
      </>
    );
  };

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
            setCreateForm((prev) => ({
              ...prev,
              description: event.target.value,
            }))
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
            setCreateForm((prev) => ({
              ...prev,
              deadlineAt: event.target.value,
            }))
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
          <span className="btn-with-icon">
            <CirclePlus size={16} />
            <span>
              {createPending ? "Публикуем..." : "Опубликовать задачу"}
            </span>
          </span>
        </Button>
        <Button mode="outline" size="l" onClick={() => navigate("/feed")}>
          <span className="btn-with-icon">
            <ArrowLeft size={16} />
            <span>Назад к ленте</span>
          </span>
        </Button>
      </div>
    </Section>
  );

  const renderProposalsBlock = (): JSX.Element => {
    if (!detailTask || !authUser) {
      return <></>;
    }

    const canManageOwnProposal =
      detailTask.customerId !== authUser.id && detailTask.status === "OPEN";
    const canSelectExecutor =
      detailTask.customerId === authUser.id && detailTask.status === "OPEN";
    const canCreateProposal = executorProfileCheck.isComplete;

    return (
      <Section
        header={isDetailOwner ? `Отклики (${proposals.length})` : "Мой отклик"}
        footer={
          isDetailOwner
            ? "Выбери одного исполнителя. После выбора задача перейдет в статус «В работе»."
            : "Отклик можно изменить или удалить, пока заказчик не выбрал исполнителя."
        }
      >
        {proposalsLoading ? (
          <Placeholder header="Загрузка" description="Получаем отклики..." />
        ) : proposalsError ? (
          <Placeholder header="Ошибка" description={proposalsError} />
        ) : isDetailOwner ? (
          proposals.length === 0 ? (
            <Placeholder
              header="Откликов нет"
              description="Исполнители еще не откликнулись на задачу"
            />
          ) : (
            <div className="proposal-list">
              {proposals.map((proposal) => {
                const executorId = proposal.executor?.id ?? null;
                const executorProfile = proposal.executor?.profile ?? null;
                const executorAcronym = getDisplayAcronym(
                  proposal.executor?.displayName ?? "Исполнитель",
                );
                const skillPreview =
                  executorProfile && executorProfile.skills.length > 0
                    ? executorProfile.skills.slice(0, 5)
                    : [];
                const portfolioPreview =
                  executorProfile?.portfolioLinks?.[0] ?? null;

                return (
                  <div key={proposal.id} className="proposal-card">
                    <div className="proposal-head">
                      <Avatar
                        size={36}
                        acronym={executorAcronym}
                        imageUrl={executorProfile?.avatarUrl ?? null}
                      />
                      <div className="proposal-head-main">
                        <p className="proposal-title">
                          {proposal.executor?.displayName ?? "Исполнитель"}
                        </p>
                        <p className="proposal-mini-meta">
                          Рейтинг: {formatRating(executorProfile?.rating ?? 0)}{" "}
                          • Опыт:{" "}
                          {getExperienceLevelLabel(
                            executorProfile?.experienceLevel ?? null,
                          )}{" "}
                          • Завершено:{" "}
                          {String(executorProfile?.completedTasksCount ?? 0)}
                        </p>
                        <p className="proposal-mini-meta">
                          База:{" "}
                          {executorProfile?.basePrice
                            ? formatMoney(executorProfile.basePrice)
                            : "не указана"}
                        </p>
                      </div>
                    </div>
                    <p className="proposal-meta">
                      {formatMoney(proposal.price)} • {proposal.etaDays} дн.
                    </p>
                    {skillPreview.length > 0 ? (
                      <div className="proposal-skill-row">
                        {skillPreview.map((skill) => (
                          <span
                            key={`${proposal.id}-${skill}`}
                            className="proposal-skill-chip"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {executorProfile?.about ? (
                      <p className="proposal-mini-about">
                        {trimText(executorProfile.about, 110)}
                      </p>
                    ) : null}
                    {portfolioPreview ? (
                      <p className="proposal-mini-portfolio">
                        Портфолио: {trimText(portfolioPreview, 78)}
                      </p>
                    ) : null}
                    <p className="proposal-comment">{proposal.comment}</p>
                    <div className="proposal-actions">
                      {executorId ? (
                        <Button
                          mode="outline"
                          size="s"
                          onClick={() => {
                            openUserProfile(executorId);
                          }}
                        >
                          Профиль
                        </Button>
                      ) : null}
                      <Button
                        mode="filled"
                        size="s"
                        disabled={
                          !canSelectExecutor || selectPendingId === proposal.id
                        }
                        onClick={() => {
                          void handleSelectProposal(proposal.id);
                        }}
                      >
                        {selectPendingId === proposal.id
                          ? "Выбираем..."
                          : "Выбрать"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : ownProposal ? (
          <>
            <div className="proposal-card">
              <p className="proposal-title">{formatMoney(ownProposal.price)}</p>
              <p className="proposal-meta">Срок: {ownProposal.etaDays} дн.</p>
              <p className="proposal-comment">{ownProposal.comment}</p>
            </div>

            {canManageOwnProposal ? (
              <div className="row-actions">
                <Button
                  mode="bezeled"
                  size="m"
                  onClick={() => {
                    setProposalError(null);
                    setProposalEditMode((prev) => !prev);
                    setProposalForm({
                      price: String(ownProposal.price),
                      comment: ownProposal.comment,
                      etaDays: String(ownProposal.etaDays),
                    });
                  }}
                >
                  {proposalEditMode ? "Скрыть форму" : "Изменить"}
                </Button>
                <Button
                  mode="plain"
                  size="m"
                  disabled={proposalPending}
                  onClick={() => {
                    void handleDeleteProposal();
                  }}
                >
                  Удалить
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <Placeholder
            header="Отклик не отправлен"
            description={
              canCreateProposal
                ? "Оставь цену и сроки, чтобы заказчик мог выбрать тебя"
                : "Перед откликом нужно заполнить профиль исполнителя."
            }
          />
        )}

        {!isDetailOwner &&
        canManageOwnProposal &&
        !canCreateProposal &&
        !ownProposal ? (
          <div className="proposal-profile-gate">
            <p className="proposal-profile-gate-title">
              Чтобы откликаться, заполни профиль исполнителя:
            </p>
            <div className="profile-check-list">
              {executorProfileCheck.missing.map((item) => (
                <p key={item} className="profile-check-item">
                  • {item}
                </p>
              ))}
            </div>
            <div className="row-actions row-actions-tight">
              <Button
                mode="filled"
                size="m"
                onClick={() => navigate("/account/executor")}
              >
                Заполнить профиль
              </Button>
            </div>
          </div>
        ) : null}

        {!isDetailOwner &&
        canManageOwnProposal &&
        canCreateProposal &&
        (!ownProposal || proposalEditMode) ? (
          <div className="form-grid proposal-form">
            <Input
              header="Цена"
              type="number"
              value={proposalForm.price}
              onChange={(event) =>
                setProposalForm((prev) => ({
                  ...prev,
                  price: event.target.value,
                }))
              }
            />
            <Input
              header="Срок (дней)"
              type="number"
              value={proposalForm.etaDays}
              onChange={(event) =>
                setProposalForm((prev) => ({
                  ...prev,
                  etaDays: event.target.value,
                }))
              }
            />
            <Textarea
              header="Комментарий"
              value={proposalForm.comment}
              onChange={(event) =>
                setProposalForm((prev) => ({
                  ...prev,
                  comment: event.target.value,
                }))
              }
            />

            {proposalError ? (
              <p className="error-text">{proposalError}</p>
            ) : null}

            <div className="row-actions">
              <Button
                mode="filled"
                size="m"
                disabled={proposalPending}
                onClick={() => {
                  if (ownProposal) {
                    void handleUpdateProposal();
                  } else {
                    void handleCreateProposal();
                  }
                }}
              >
                {proposalPending
                  ? "Сохраняем..."
                  : ownProposal
                    ? "Сохранить отклик"
                    : "Отправить отклик"}
              </Button>
              {ownProposal ? (
                <Button
                  mode="outline"
                  size="m"
                  onClick={() => setProposalEditMode(false)}
                >
                  Отмена
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Section>
    );
  };

  const renderDetailTask = (): JSX.Element => {
    if (detailLoading) {
      return (
        <Section>
          <Placeholder
            header="Загрузка"
            description="Получаем карточку задачи..."
          />
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

    const canEdit = isDetailOwner && detailTask.status === "OPEN";
    const isAssignedExecutor = Boolean(
      authUser &&
      detailTask.assignment &&
      detailTask.assignment.executorId === authUser.id,
    );
    const canSendToReview =
      isAssignedExecutor && detailTask.status === "IN_PROGRESS";
    const canApproveOrReject =
      isDetailOwner && detailTask.status === "ON_REVIEW";
    const detailCustomer = detailTask.customer;
    const canClampDetailDescription = shouldClampTaskDescription(
      detailTask.description,
    );

    return (
      <>
        <Section
          header="Карточка задачи"
          footer={`Создано: ${formatDate(detailTask.createdAt)} • Дедлайн: ${formatDate(
            detailTask.deadlineAt,
          )}`}
        >
          <div className="task-detail-head">
            <h2 className="task-detail-title">{detailTask.title}</h2>
            <p className="task-detail-budget">
              {formatMoney(detailTask.budget)}
            </p>
          </div>

          <div className="task-detail-meta-row">
            <span className="task-feed-meta-chip">
              {getStatusLabel(detailTask.status)}
            </span>
            <span className="task-feed-meta-chip">
              {formatDate(detailTask.deadlineAt)}
            </span>
            <span className="task-feed-meta-chip">{detailTask.category}</span>
          </div>

          {detailTask.tags.length > 0 ? (
            <div className="task-detail-meta-row">
              {detailTask.tags.map((tag) => (
                <span
                  key={`${detailTask.id}-${tag}`}
                  className="task-feed-meta-chip"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          {detailCustomer ? (
            <div className="task-detail-customer-row">
              <p className="task-detail-customer-text">
                Заказчик: {detailCustomer.displayName}
              </p>
              <Button
                mode="outline"
                size="s"
                onClick={() => openUserProfile(detailCustomer.id)}
              >
                Профиль заказчика
              </Button>
            </div>
          ) : (
            <p className="task-detail-customer-text">Заказчик недоступен</p>
          )}
        </Section>

        <Section header="Описание">
          <p
            className={`task-detail-description ${canClampDetailDescription && !expandedDetailDescription ? "task-detail-description-clamped" : ""}`}
          >
            {detailTask.description}
          </p>
          {canClampDetailDescription ? (
            <div className="task-feed-readmore-row">
              <Button
                mode="outline"
                size="s"
                onClick={() => setExpandedDetailDescription((prev) => !prev)}
              >
                {expandedDetailDescription ? "Скрыть" : "Показать еще"}
              </Button>
            </div>
          ) : null}
        </Section>

        <Section header="Действия">
          <div className="row-actions row-actions-tight">
            <Button mode="outline" onClick={() => navigate("/feed")}>
              <span className="btn-with-icon">
                <Home size={16} />
                <span>К ленте</span>
              </span>
            </Button>
            {canEdit ? (
              <Button
                mode="bezeled"
                onClick={() => setEditMode((prev) => !prev)}
              >
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

        {canSendToReview || canApproveOrReject || rejectReviewMode ? (
          <Section
            header="Действия по статусу"
            footer="Статус задачи меняют только участники, которым это разрешено по роли."
          >
            {canSendToReview ? (
              <Button
                mode="filled"
                size="m"
                disabled={statusActionPending}
                onClick={() => {
                  void handleSendToReview();
                }}
              >
                {statusActionPending
                  ? "Отправляем..."
                  : "Отправить на проверку"}
              </Button>
            ) : null}

            {canApproveOrReject ? (
              <>
                <div className="row-actions">
                  <Button
                    mode="filled"
                    size="m"
                    disabled={statusActionPending}
                    onClick={() => {
                      void handleApproveTask();
                    }}
                  >
                    {statusActionPending
                      ? "Подтверждаем..."
                      : "Подтвердить выполнение"}
                  </Button>
                  <Button
                    mode="bezeled"
                    size="m"
                    disabled={statusActionPending}
                    onClick={() => {
                      setStatusActionError(null);
                      setRejectReviewMode((prev) => !prev);
                    }}
                  >
                    {rejectReviewMode ? "Скрыть форму" : "Вернуть в работу"}
                  </Button>
                </div>

                {rejectReviewMode ? (
                  <div className="form-grid">
                    <Textarea
                      header="Комментарий для исполнителя"
                      placeholder="Например: нужно поправить мобильную верстку и форму отправки."
                      value={rejectReviewComment}
                      onChange={(event) => {
                        setRejectReviewComment(event.target.value);
                      }}
                    />
                    <div className="row-actions row-actions-tight">
                      <Button
                        mode="outline"
                        size="m"
                        disabled={statusActionPending}
                        onClick={() => {
                          void handleRejectReview();
                        }}
                      >
                        {statusActionPending
                          ? "Возвращаем..."
                          : "Подтвердить возврат в работу"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {statusActionError ? (
              <p className="error-text">{statusActionError}</p>
            ) : null}
          </Section>
        ) : null}

        <Section
          header="История статусов"
          footer="Последние изменения показываются сверху."
        >
          {statusHistoryLoading ? (
            <Placeholder header="Загрузка" description="Получаем историю..." />
          ) : statusHistoryError ? (
            <Placeholder header="Ошибка" description={statusHistoryError} />
          ) : statusHistory.length === 0 ? (
            <Placeholder
              header="История пуста"
              description="Переходы статуса появятся после действий по задаче."
            />
          ) : (
            <div className="status-history-list">
              {statusHistory.map((entry) => {
                const actorLabel = entry.changedByUser.displayName;

                return (
                  <div key={entry.id} className="status-history-card">
                    <p className="status-history-line">
                      {entry.fromStatus
                        ? `${getStatusLabel(entry.fromStatus)} -> ${getStatusLabel(entry.toStatus)}`
                        : `Создана -> ${getStatusLabel(entry.toStatus)}`}
                    </p>
                    <p className="status-history-meta">
                      {formatDate(entry.createdAt)} • {actorLabel}
                    </p>
                    {entry.comment ? (
                      <p className="status-history-comment">{entry.comment}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
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
                  setEditForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
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
                  setEditForm((prev) => ({
                    ...prev,
                    budget: event.target.value,
                  }))
                }
              />
              <Input
                header="Категория"
                value={editForm.category}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
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

        {renderProposalsBlock()}
      </>
    );
  };

  const renderAuthGate = (): JSX.Element | null => {
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

    return null;
  };

  const authGate = renderAuthGate();

  return (
    <AppRoot
      appearance={webAppState.appearance}
      platform={webAppState.uiPlatform}
    >
      <main className="app-shell">
        {detailTaskId && detailTask ? (
          <Section>
            <p className="inline-hint">
              Сейчас открыт просмотр задачи «{trimText(detailTask.title, 40)}»
            </p>
          </Section>
        ) : null}

        <div className="page-content">
          {authGate ? (
            authGate
          ) : (
            <Routes>
              <Route
                path="/"
                element={<Navigate to={preferredPath} replace />}
              />
              <Route path="/onboarding" element={renderRoleOnboarding()} />
              <Route path="/feed" element={renderTasksList()} />
              <Route path="/create" element={renderCreateTask()} />
              <Route path="/task/:taskId" element={renderDetailTask()} />
              <Route path="/user/:userId" element={renderPublicProfile()} />
              <Route path="/account" element={renderAccountHome()} />
              <Route path="/account/avatar" element={renderAccountAvatar()} />
              <Route path="/account/role" element={renderAccountRole()} />
              <Route
                path="/account/executor"
                element={renderAccountExecutor()}
              />
              <Route
                path="/account/bot-notifications"
                element={renderAccountBotNotifications()}
              />
              <Route
                path="/account/notifications"
                element={renderAccountNotifications()}
              />
              <Route
                path="*"
                element={<Navigate to={preferredPath} replace />}
              />
            </Routes>
          )}
        </div>

        {!authGate && !needsRoleOnboarding ? (
          <nav className="bottom-nav">
            <button
              className={`bottom-nav-item ${activeTab === "list" ? "bottom-nav-item-active" : ""}`}
              type="button"
              onClick={() => switchTab("list")}
            >
              <Home size={18} />
              <span>Лента</span>
            </button>
            <button
              className={`bottom-nav-item ${activeTab === "create" ? "bottom-nav-item-active" : ""}`}
              type="button"
              onClick={() => switchTab("create")}
            >
              <CirclePlus size={18} />
              <span>Создать</span>
            </button>
            <button
              className={`bottom-nav-item ${activeTab === "profile" ? "bottom-nav-item-active" : ""}`}
              type="button"
              onClick={() => switchTab("profile")}
            >
              <UserRound size={18} />
              <span>Профиль</span>
              {notificationsUnreadCount > 0 ? (
                <span className="bottom-nav-badge">
                  {notificationsUnreadCount}
                </span>
              ) : null}
            </button>
          </nav>
        ) : null}
      </main>
    </AppRoot>
  );
}

export default App;
