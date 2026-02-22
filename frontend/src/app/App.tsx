import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CirclePlus, Home, UserRound } from "lucide-react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigate,
} from "react-router-dom";

import type {
  AdminAuditItem,
  AdminIdentity,
  AdminLogItem,
  AdminLogLevelValue,
  AdminTaskItem,
  AdminUserItem,
} from "../entities/admin/model/types";
import type { TaskMessageItem } from "../entities/chat/model/types";
import type { NotificationItem } from "../entities/notification/model/types";
import type {
  ProposalForm,
  ProposalItem,
  MyProposalItem,
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
  TOKEN_KEY,
  type TabState,
} from "../shared/config/constants";
import { readFileAsDataUrl } from "../shared/lib/file";
import { trimText } from "../shared/lib/format";
import {
  getExecutorProfileCheck,
  getPreferredTabByRole,
  isValidHttpUrl,
  toDelimitedList,
  toExecutorProfileForm,
} from "../shared/lib/profile";
import {
  buildTasksQuery,
  fromInputDateTimeValue,
  parseTagsInput,
  toInputDateTimeValue,
  validateProposalForm,
  validateTaskForm,
} from "../shared/lib/task";
import { getAcronym, getSafeState } from "../shared/lib/telegram";
import { AppRoot, Placeholder, Section } from "../shared/ui";
import {
  AccountAvatarScreen,
  AccountBotNotificationsScreen,
  AccountExecutorScreen,
  AccountHomeScreen,
  AccountMyProposalsScreen,
  AccountNotificationsScreen,
  AccountRoleScreen,
} from "../pages/account/ui/AccountScreens";
import { CreateTaskPage } from "../pages/create-task/ui/CreateTaskPage";
import { FeedPage } from "../pages/feed/ui/FeedPage";
import { AdminPage } from "../pages/admin/ui/AdminPage";
import { RoleOnboardingPage } from "../pages/onboarding/ui/RoleOnboardingPage";
import { PublicProfilePage } from "../pages/public-profile/ui/PublicProfilePage";
import { TaskDetailPage } from "../pages/task-detail/ui/TaskDetailPage";

import "../App.css";

type AdminView = "users" | "tasks" | "audit" | "logs";
type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const parseTotalUsers = (input: unknown): number | null => {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const value = (input as { totalUsers?: unknown }).totalUsers;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value < 0) {
    return null;
  }

  return Math.floor(value);
};

const parseTotalFromPagination = (input: unknown): number | null => {
  if (typeof input !== "object" || input === null) {
    return null;
  }

  const pagination = (input as { pagination?: unknown }).pagination;
  if (typeof pagination !== "object" || pagination === null) {
    return null;
  }

  const total = (pagination as { total?: unknown }).total;
  if (typeof total !== "number" || !Number.isFinite(total)) {
    return null;
  }

  if (total < 0) {
    return null;
  }

  return Math.floor(total);
};

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

  const readTokenFromLocation = (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }

    const searchToken = new URLSearchParams(window.location.search).get(
      "token",
    );
    if (searchToken && searchToken.trim().length > 0) {
      return searchToken;
    }

    const hashRaw = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const hashToken = new URLSearchParams(hashRaw).get("token");
    if (hashToken && hashToken.trim().length > 0) {
      return hashToken;
    }

    return null;
  };

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const locationToken = readTokenFromLocation();
    if (locationToken) {
      window.localStorage.setItem(TOKEN_KEY, locationToken);
      return locationToken;
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
  const [taskMessages, setTaskMessages] = useState<TaskMessageItem[]>([]);
  const [taskMessagesLoading, setTaskMessagesLoading] = useState(false);
  const [taskMessagesError, setTaskMessagesError] = useState<string | null>(
    null,
  );
  const [taskMessageDraft, setTaskMessageDraft] = useState("");
  const [taskMessagePending, setTaskMessagePending] = useState(false);
  const taskMessagesRef = useRef<TaskMessageItem[]>([]);
  const chatInitializedRef = useRef(false);

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
  const [myProposals, setMyProposals] = useState<MyProposalItem[]>([]);
  const [myProposalsLoading, setMyProposalsLoading] = useState(false);
  const [myProposalsError, setMyProposalsError] = useState<string | null>(null);

  const [selectPendingId, setSelectPendingId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );
  const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
  const [notificationsPending, setNotificationsPending] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAccessLoading, setAdminAccessLoading] = useState(false);
  const [adminAccessError, setAdminAccessError] = useState<string | null>(null);
  const [adminIdentity, setAdminIdentity] = useState<AdminIdentity | null>(
    null,
  );
  const [adminView, setAdminView] = useState<AdminView>("users");

  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [adminUsersQuery, setAdminUsersQuery] = useState("");
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null);

  const [adminTasks, setAdminTasks] = useState<AdminTaskItem[]>([]);
  const [adminTasksQuery, setAdminTasksQuery] = useState("");
  const [adminTasksLoading, setAdminTasksLoading] = useState(false);
  const [adminTasksError, setAdminTasksError] = useState<string | null>(null);

  const [adminAudit, setAdminAudit] = useState<AdminAuditItem[]>([]);
  const [adminAuditLoading, setAdminAuditLoading] = useState(false);
  const [adminAuditError, setAdminAuditError] = useState<string | null>(null);
  const [adminLogs, setAdminLogs] = useState<AdminLogItem[]>([]);
  const [adminLogsQuery, setAdminLogsQuery] = useState("");
  const [adminLogsLevel, setAdminLogsLevel] = useState<
    AdminLogLevelValue | "ALL"
  >("ALL");
  const [adminLogsLoading, setAdminLogsLoading] = useState(false);
  const [adminLogsError, setAdminLogsError] = useState<string | null>(null);
  const [totalUsersCount, setTotalUsersCount] = useState<number | null>(null);

  const isAuthenticated = Boolean(token);
  const isTelegramMiniApp = webAppState.isTelegram;
  const preferredTab = getPreferredTabByRole(authUser?.primaryRole ?? null);
  const preferredPath = preferredTab === "create" ? "/create" : "/feed";
  const needsRoleOnboarding = Boolean(
    isAuthenticated && authUser && authUser.primaryRole === null,
  );
  const activeTab: TabState =
    location.pathname.startsWith("/account") ||
    location.pathname.startsWith("/admin")
      ? "profile"
      : location.pathname === "/create"
        ? "create"
        : "list";
  const hideBottomNav = location.pathname.startsWith("/admin");

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
  const authUserId = authUser?.id ?? null;

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

  const requestTaskMessages = useCallback(
    (taskId: string, authToken: string) =>
      apiRequest<{ items: TaskMessageItem[] }>(
        `/tasks/${taskId}/messages?limit=100`,
        {},
        authToken,
      ),
    [],
  );

  const requestMyProposals = useCallback(
    (authToken: string) =>
      apiRequest<{
        items: MyProposalItem[];
        pagination: PaginationMeta;
      }>("/proposals/my?page=1&limit=50", {}, authToken),
    [],
  );

  const requestPlatformStats = useCallback(async (authToken: string) => {
    try {
      const secureResponse = await apiRequest<unknown>(
        "/profile/platform-stats",
        {},
        authToken,
      );
      const secureValue = parseTotalUsers(secureResponse);
      if (secureValue !== null) {
        return secureValue;
      }
    } catch {
      // try next source
    }

    try {
      const adminResponse = await apiRequest<unknown>(
        "/admin/users?page=1&limit=1",
        {},
        authToken,
      );
      const adminValue = parseTotalFromPagination(adminResponse);
      if (adminValue !== null) {
        return adminValue;
      }
    } catch {
      // try final source
    }

    try {
      const fallbackResponse = await apiRequest<unknown>("/stats");
      const fallbackValue = parseTotalUsers(fallbackResponse);
      if (fallbackValue !== null) {
        return fallbackValue;
      }
    } catch {
      // no-op
    }

    throw new Error("Не удалось получить количество пользователей");
  }, []);

  const requestAdminUsers = useCallback((authToken: string, query: string) => {
    const params = new URLSearchParams({
      page: "1",
      limit: "50",
    });

    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    return apiRequest<{
      items: AdminUserItem[];
      pagination: PaginationMeta;
    }>(`/admin/users?${params.toString()}`, {}, authToken);
  }, []);

  const requestAdminTasks = useCallback((authToken: string, query: string) => {
    const params = new URLSearchParams({
      page: "1",
      limit: "50",
    });

    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    return apiRequest<{
      items: AdminTaskItem[];
      pagination: PaginationMeta;
    }>(`/admin/tasks?${params.toString()}`, {}, authToken);
  }, []);

  const requestAdminAudit = useCallback(
    (authToken: string) =>
      apiRequest<{
        items: AdminAuditItem[];
        pagination: PaginationMeta;
      }>("/admin/audit-log?page=1&limit=50", {}, authToken),
    [],
  );

  const requestAdminLogs = useCallback(
    (
      authToken: string,
      options: {
        query: string;
        level: AdminLogLevelValue | "ALL";
      },
    ) => {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
      });

      if (options.query.trim().length > 0) {
        params.set("q", options.query.trim());
      }

      if (options.level !== "ALL") {
        params.set("level", options.level);
      }

      return apiRequest<{
        items: AdminLogItem[];
        pagination: PaginationMeta;
      }>(`/admin/logs?${params.toString()}`, {}, authToken);
    },
    [],
  );

  const playIncomingMessageSignal = useCallback((): void => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const telegram = (
        window as Window & {
          Telegram?: { WebApp?: { HapticFeedback?: unknown } };
        }
      ).Telegram?.WebApp;

      (
        telegram?.HapticFeedback as
          | {
              notificationOccurred?: (
                type: "error" | "success" | "warning",
              ) => void;
            }
          | undefined
      )?.notificationOccurred?.("warning");
    } catch {
      // no-op
    }

    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioContextCtor) {
        return;
      }

      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      const now = context.currentTime;
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      oscillator.start(now);
      oscillator.stop(now + 0.2);
      oscillator.onended = () => {
        void context.close();
      };
    } catch {
      // no-op
    }
  }, []);

  const applyTaskMessages = useCallback(
    (items: TaskMessageItem[]): void => {
      const prevItems = taskMessagesRef.current;
      const isInitialized = chatInitializedRef.current;

      if (isInitialized && authUserId) {
        const prevIds = new Set(prevItems.map((item) => item.id));
        const hasIncomingMessage = items.some(
          (item) => !prevIds.has(item.id) && item.senderId !== authUserId,
        );

        if (hasIncomingMessage) {
          playIncomingMessageSignal();
        }
      }

      chatInitializedRef.current = true;
      taskMessagesRef.current = items;
      setTaskMessages(items);
    },
    [authUserId, playIncomingMessageSignal],
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

  const refreshTaskMessages = useCallback(
    async (options?: { silent?: boolean }): Promise<void> => {
      if (!token || !detailTaskId) {
        return;
      }

      const isSilent = options?.silent === true;

      try {
        if (!isSilent) {
          setTaskMessagesLoading(true);
        }
        setTaskMessagesError(null);

        const response = await requestTaskMessages(detailTaskId, token);
        applyTaskMessages(response.items);
      } catch (error) {
        if (!isSilent) {
          setTaskMessages([]);
          setTaskMessagesError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить сообщения",
          );
        }
      } finally {
        if (!isSilent) {
          setTaskMessagesLoading(false);
        }
      }
    },
    [applyTaskMessages, detailTaskId, requestTaskMessages, token],
  );

  const loadAdminUsers = useCallback(
    async (query: string): Promise<void> => {
      if (!token || !isAdmin) {
        setAdminUsers([]);
        setAdminUsersError(null);
        setAdminUsersLoading(false);
        return;
      }

      try {
        setAdminUsersLoading(true);
        setAdminUsersError(null);

        const response = await requestAdminUsers(token, query);
        setAdminUsers(response.items);
      } catch (error) {
        setAdminUsers([]);
        setAdminUsersError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить список пользователей",
        );
      } finally {
        setAdminUsersLoading(false);
      }
    },
    [isAdmin, requestAdminUsers, token],
  );

  const loadAdminTasks = useCallback(
    async (query: string): Promise<void> => {
      if (!token || !isAdmin) {
        setAdminTasks([]);
        setAdminTasksError(null);
        setAdminTasksLoading(false);
        return;
      }

      try {
        setAdminTasksLoading(true);
        setAdminTasksError(null);

        const response = await requestAdminTasks(token, query);
        setAdminTasks(response.items);
      } catch (error) {
        setAdminTasks([]);
        setAdminTasksError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить список задач",
        );
      } finally {
        setAdminTasksLoading(false);
      }
    },
    [isAdmin, requestAdminTasks, token],
  );

  const loadAdminAudit = useCallback(async (): Promise<void> => {
    if (!token || !isAdmin) {
      setAdminAudit([]);
      setAdminAuditError(null);
      setAdminAuditLoading(false);
      return;
    }

    try {
      setAdminAuditLoading(true);
      setAdminAuditError(null);

      const response = await requestAdminAudit(token);
      setAdminAudit(response.items);
    } catch (error) {
      setAdminAudit([]);
      setAdminAuditError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить журнал аудита",
      );
    } finally {
      setAdminAuditLoading(false);
    }
  }, [isAdmin, requestAdminAudit, token]);

  const loadAdminLogs = useCallback(
    async (options: {
      query: string;
      level: AdminLogLevelValue | "ALL";
    }): Promise<void> => {
      if (!token || !isAdmin) {
        setAdminLogs([]);
        setAdminLogsError(null);
        setAdminLogsLoading(false);
        return;
      }

      try {
        setAdminLogsLoading(true);
        setAdminLogsError(null);

        const response = await requestAdminLogs(token, {
          query: options.query,
          level: options.level,
        });

        setAdminLogs(response.items);
      } catch (error) {
        setAdminLogs([]);
        setAdminLogsError(
          error instanceof Error ? error.message : "Не удалось загрузить логи",
        );
      } finally {
        setAdminLogsLoading(false);
      }
    },
    [isAdmin, requestAdminLogs, token],
  );

  const loadMyProposals = useCallback(async (): Promise<void> => {
    if (!token) {
      setMyProposals([]);
      setMyProposalsError(null);
      setMyProposalsLoading(false);
      return;
    }

    try {
      setMyProposalsLoading(true);
      setMyProposalsError(null);

      const response = await requestMyProposals(token);
      setMyProposals(response.items);
    } catch (error) {
      setMyProposals([]);
      setMyProposalsError(
        error instanceof Error ? error.message : "Не удалось загрузить отклики",
      );
    } finally {
      setMyProposalsLoading(false);
    }
  }, [requestMyProposals, token]);

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
    const searchParams = new URLSearchParams(location.search);
    const hashRaw = location.hash.startsWith("#")
      ? location.hash.slice(1)
      : location.hash;
    const hashParams = new URLSearchParams(hashRaw);

    if (!searchParams.has("token") && !hashParams.has("token")) {
      return;
    }

    searchParams.delete("token");
    hashParams.delete("token");

    const nextSearch = searchParams.toString();
    const nextHash = hashParams.toString();
    const nextUrl = `${location.pathname}${nextSearch ? `?${nextSearch}` : ""}${nextHash ? `#${nextHash}` : ""}`;

    navigate(nextUrl, { replace: true });
  }, [location.hash, location.pathname, location.search, navigate]);

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
      setIsAdmin(false);
      setAdminAccessLoading(false);
      setAdminAccessError(null);
      setAdminIdentity(null);
      setAdminUsers([]);
      setAdminTasks([]);
      setAdminAudit([]);
      setAdminLogs([]);
      return;
    }

    let active = true;

    const resolveAdminAccess = async (): Promise<void> => {
      try {
        setAdminAccessLoading(true);
        setAdminAccessError(null);

        const response = await apiRequest<{ admin: AdminIdentity }>(
          "/admin/me",
          {},
          token,
        );

        if (!active) {
          return;
        }

        setIsAdmin(true);
        setAdminIdentity(response.admin);
      } catch (error) {
        if (!active) {
          return;
        }

        setIsAdmin(false);
        setAdminIdentity(null);
        setAdminUsers([]);
        setAdminTasks([]);
        setAdminAudit([]);
        setAdminLogs([]);
        setAdminAccessError(
          error instanceof Error
            ? error.message
            : "Не удалось проверить админ-доступ",
        );
      } finally {
        if (active) {
          setAdminAccessLoading(false);
        }
      }
    };

    void resolveAdminAccess();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !isAdmin) {
      return;
    }

    void loadAdminUsers("");
    void loadAdminTasks("");
    void loadAdminAudit();
    void loadAdminLogs({
      query: "",
      level: "ALL",
    });
  }, [
    isAdmin,
    loadAdminAudit,
    loadAdminLogs,
    loadAdminTasks,
    loadAdminUsers,
    token,
  ]);

  useEffect(() => {
    if (!token) {
      setTotalUsersCount(null);
      return;
    }

    let active = true;

    const loadStats = async (): Promise<void> => {
      try {
        const response = await requestPlatformStats(token);
        if (!active) {
          return;
        }

        setTotalUsersCount(response);
      } catch {
        if (!active) {
          return;
        }

        setTotalUsersCount(null);
      }
    };

    void loadStats();

    return () => {
      active = false;
    };
  }, [requestPlatformStats, token]);

  useEffect(() => {
    if (!location.pathname.startsWith("/account/proposals")) {
      return;
    }

    void loadMyProposals();
  }, [loadMyProposals, location.pathname]);

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
    setTaskMessages([]);
    setTaskMessagesLoading(false);
    setTaskMessagesError(null);
    setTaskMessageDraft("");
    setTaskMessagePending(false);
    taskMessagesRef.current = [];
    chatInitializedRef.current = false;
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

  useEffect(() => {
    const canUseTaskChat = Boolean(
      token &&
      detailTaskId &&
      authUser &&
      detailTask &&
      detailTask.assignment &&
      (authUser.id === detailTask.customerId ||
        authUser.id === detailTask.assignment.executorId),
    );

    if (!canUseTaskChat) {
      setTaskMessages([]);
      setTaskMessagesError(null);
      setTaskMessagesLoading(false);
      taskMessagesRef.current = [];
      chatInitializedRef.current = false;
      return;
    }

    let active = true;

    const loadMessages = async (): Promise<void> => {
      try {
        setTaskMessagesLoading(true);
        setTaskMessagesError(null);

        const response = await requestTaskMessages(detailTaskId!, token!);
        if (!active) {
          return;
        }

        applyTaskMessages(response.items);
      } catch (error) {
        if (!active) {
          return;
        }

        setTaskMessages([]);
        setTaskMessagesError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить сообщения",
        );
      } finally {
        if (active) {
          setTaskMessagesLoading(false);
        }
      }
    };

    void loadMessages();

    const timerId = window.setInterval(() => {
      void refreshTaskMessages({ silent: true });
    }, 7000);

    return () => {
      active = false;
      window.clearInterval(timerId);
    };
  }, [
    applyTaskMessages,
    authUser,
    detailTask,
    detailTaskId,
    refreshTaskMessages,
    requestTaskMessages,
    token,
  ]);

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

  const handleAdminToggleUserBlock = async (
    user: AdminUserItem,
  ): Promise<void> => {
    if (!token || !isAdmin) {
      return;
    }

    const nextIsBlocked = !user.isBlocked;
    const reasonPrompt = nextIsBlocked
      ? "Причина блокировки (необязательно):"
      : "Причина разблокировки (необязательно):";
    const reasonRaw = window.prompt(reasonPrompt, "");

    if (reasonRaw === null) {
      return;
    }

    try {
      setAdminUsersError(null);

      const response = await apiRequest<{ user: AdminUserItem }>(
        `/admin/users/${user.id}/block`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_blocked: nextIsBlocked,
            reason: reasonRaw.trim() || undefined,
          }),
        },
        token,
      );

      setAdminUsers((prev) =>
        prev.map((item) =>
          item.id === response.user.id ? response.user : item,
        ),
      );
      await loadAdminAudit();
      await loadAdminLogs({
        query: adminLogsQuery,
        level: adminLogsLevel,
      });
    } catch (error) {
      setAdminUsersError(
        error instanceof Error
          ? error.message
          : "Не удалось изменить блокировку пользователя",
      );
    }
  };

  const handleAdminModerateTaskCancel = async (
    task: AdminTaskItem,
  ): Promise<void> => {
    if (!token || !isAdmin) {
      return;
    }

    const reasonRaw = window.prompt("Причина отмены задачи:", "");
    if (reasonRaw === null) {
      return;
    }

    const reason = reasonRaw.trim();
    if (!reason) {
      setAdminTasksError("Причина обязательна для модерации задачи.");
      return;
    }

    try {
      setAdminTasksError(null);

      const response = await apiRequest<{ task: AdminTaskItem }>(
        `/admin/tasks/${task.id}/moderate`,
        {
          method: "PATCH",
          body: JSON.stringify({
            action: "CANCEL",
            reason,
          }),
        },
        token,
      );

      setAdminTasks((prev) =>
        prev.map((item) =>
          item.id === response.task.id ? response.task : item,
        ),
      );
      setDetailTask((prev) =>
        prev && prev.id === response.task.id
          ? {
              ...prev,
              status: response.task.status,
              updatedAt: response.task.updatedAt,
            }
          : prev,
      );
      await loadAdminAudit();
      await loadAdminLogs({
        query: adminLogsQuery,
        level: adminLogsLevel,
      });
    } catch (error) {
      setAdminTasksError(
        error instanceof Error
          ? error.message
          : "Не удалось отмодерировать задачу",
      );
    }
  };

  const handleOpenAdminWeb = (): void => {
    if (!token) {
      return;
    }

    const webAdminUrl = `${window.location.origin}/admin#token=${encodeURIComponent(token)}`;
    const telegramWebApp = (
      window as Window & {
        Telegram?: {
          WebApp?: {
            openLink?: (url: string) => void;
          };
        };
      }
    ).Telegram?.WebApp;

    if (telegramWebApp?.openLink) {
      telegramWebApp.openLink(webAdminUrl);
      return;
    }

    window.open(webAdminUrl, "_blank", "noopener,noreferrer");
  };

  const handleSendTaskMessage = async (): Promise<void> => {
    if (!token || !detailTaskId) {
      return;
    }

    const text = taskMessageDraft.trim();
    if (!text) {
      return;
    }

    try {
      setTaskMessagePending(true);
      setTaskMessagesError(null);

      const response = await apiRequest<{ message: TaskMessageItem }>(
        `/tasks/${detailTaskId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ text }),
        },
        token,
      );

      const nextMessages = [...taskMessagesRef.current, response.message];
      taskMessagesRef.current = nextMessages;
      setTaskMessages(nextMessages);
      setTaskMessageDraft("");
    } catch (error) {
      setTaskMessagesError(
        error instanceof Error
          ? error.message
          : "Не удалось отправить сообщение",
      );
    } finally {
      setTaskMessagePending(false);
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
    <RoleOnboardingPage
      roleSavePending={roleSavePending}
      roleSaveError={roleSaveError}
      onChooseRole={(role) => {
        void handleSetPrimaryRole(role, {
          navigateAfterSave: true,
        });
      }}
    />
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
        onOpenMyProposals={() => navigate("/account/proposals")}
        isAdmin={isAdmin}
        onOpenAdmin={() => {
          if (isTelegramMiniApp) {
            handleOpenAdminWeb();
            return;
          }

          navigate("/admin");
        }}
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

  const renderAccountMyProposals = (): JSX.Element => (
    <AccountMyProposalsScreen
      proposals={myProposals}
      proposalsLoading={myProposalsLoading}
      proposalsError={myProposalsError}
      onRefresh={() => {
        void loadMyProposals();
      }}
      onOpenTask={(taskId) => {
        navigate(`/task/${taskId}`);
      }}
      onBack={() => navigate("/account")}
    />
  );

  const renderAdmin = (): JSX.Element => {
    if (isTelegramMiniApp) {
      return (
        <Section>
          <Placeholder
            header="Админка в веб-режиме"
            description="Панель администратора вынесена из Telegram Mini App. Открой /admin во внешнем браузере."
          />
        </Section>
      );
    }

    return (
      <AdminPage
        adminAccessLoading={adminAccessLoading}
        isAdmin={isAdmin}
        adminAccessError={adminAccessError}
        adminIdentity={adminIdentity}
        activeView={adminView}
        onChangeView={setAdminView}
        users={adminUsers}
        usersLoading={adminUsersLoading}
        usersError={adminUsersError}
        usersQuery={adminUsersQuery}
        onUsersQueryChange={setAdminUsersQuery}
        onUsersSearch={() => {
          void loadAdminUsers(adminUsersQuery);
        }}
        onUsersReload={() => {
          void loadAdminUsers(adminUsersQuery);
        }}
        onToggleUserBlock={(user) => {
          void handleAdminToggleUserBlock(user);
        }}
        tasks={adminTasks}
        tasksLoading={adminTasksLoading}
        tasksError={adminTasksError}
        tasksQuery={adminTasksQuery}
        onTasksQueryChange={setAdminTasksQuery}
        onTasksSearch={() => {
          void loadAdminTasks(adminTasksQuery);
        }}
        onTasksReload={() => {
          void loadAdminTasks(adminTasksQuery);
        }}
        onModerateTaskCancel={(task) => {
          void handleAdminModerateTaskCancel(task);
        }}
        audit={adminAudit}
        auditLoading={adminAuditLoading}
        auditError={adminAuditError}
        onAuditReload={() => {
          void loadAdminAudit();
        }}
        logs={adminLogs}
        logsLoading={adminLogsLoading}
        logsError={adminLogsError}
        logsQuery={adminLogsQuery}
        onLogsQueryChange={setAdminLogsQuery}
        logsLevel={adminLogsLevel}
        onLogsLevelChange={setAdminLogsLevel}
        onLogsSearch={() => {
          void loadAdminLogs({
            query: adminLogsQuery,
            level: adminLogsLevel,
          });
        }}
        onLogsReload={() => {
          void loadAdminLogs({
            query: adminLogsQuery,
            level: adminLogsLevel,
          });
        }}
      />
    );
  };

  const renderPublicProfile = (): JSX.Element => (
    <PublicProfilePage
      publicProfileUser={publicProfileUser}
      publicProfileLoading={publicProfileLoading}
      publicProfileError={publicProfileError}
      onBack={() => navigate(-1)}
      onToFeed={() => navigate("/feed")}
    />
  );

  const renderTasksList = (): JSX.Element => (
    <FeedPage
      authPrimaryRole={authUser?.primaryRole ?? null}
      filterDraft={filterDraft}
      filterApplied={filterApplied}
      filtersOpen={filtersOpen}
      onToggleFilters={() => setFiltersOpen((prev) => !prev)}
      onPatchFilterDraft={(patch) =>
        setFilterDraft((prev) => ({
          ...prev,
          ...patch,
        }))
      }
      onApplyFilters={handleApplyFilters}
      onResetFilters={handleResetFilters}
      tasks={tasks}
      listLoading={listLoading}
      listError={listError}
      expandedFeedDescriptions={expandedFeedDescriptions}
      onToggleDescription={toggleFeedDescription}
      onOpenTask={openTaskDetail}
      onOpenCreate={() => navigate("/create")}
      page={page}
      pagination={{
        page: pagination.page,
        total: pagination.total,
        totalPages: pagination.totalPages,
      }}
      onPrevPage={() => setPage((prev) => prev - 1)}
      onNextPage={() => setPage((prev) => prev + 1)}
      totalUsersCount={totalUsersCount}
    />
  );

  const renderCreateTask = (): JSX.Element => (
    <CreateTaskPage
      form={createForm}
      pending={createPending}
      error={createError}
      onPatchForm={(patch) =>
        setCreateForm((prev) => ({
          ...prev,
          ...patch,
        }))
      }
      onSubmit={() => {
        void handleCreateTask();
      }}
      onBackToFeed={() => navigate("/feed")}
    />
  );

  const renderDetailTask = (): JSX.Element => (
    <TaskDetailPage
      detailLoading={detailLoading}
      detailError={detailError}
      detailTask={detailTask}
      authUser={authUser}
      isDetailOwner={isDetailOwner}
      expandedDetailDescription={expandedDetailDescription}
      onToggleExpandedDetailDescription={() =>
        setExpandedDetailDescription((prev) => !prev)
      }
      editMode={editMode}
      editPending={editPending}
      editError={editError}
      editForm={editForm}
      onPatchEditForm={(patch: Partial<TaskForm>) =>
        setEditForm((prev) => ({
          ...prev,
          ...patch,
        }))
      }
      onToggleEditMode={() => setEditMode((prev) => !prev)}
      onSaveTaskEdits={() => {
        void handleSaveTaskEdits();
      }}
      onCancelTask={() => {
        void handleCancelTask();
      }}
      statusHistory={statusHistory}
      statusHistoryLoading={statusHistoryLoading}
      statusHistoryError={statusHistoryError}
      statusActionPending={statusActionPending}
      statusActionError={statusActionError}
      rejectReviewMode={rejectReviewMode}
      rejectReviewComment={rejectReviewComment}
      onToggleRejectReviewMode={() => {
        setStatusActionError(null);
        setRejectReviewMode((prev) => !prev);
      }}
      onRejectReviewCommentChange={setRejectReviewComment}
      onSendToReview={() => {
        void handleSendToReview();
      }}
      onApproveTask={() => {
        void handleApproveTask();
      }}
      onRejectReview={() => {
        void handleRejectReview();
      }}
      proposals={proposals}
      proposalsLoading={proposalsLoading}
      proposalsError={proposalsError}
      ownProposal={ownProposal}
      proposalEditMode={proposalEditMode}
      proposalPending={proposalPending}
      proposalError={proposalError}
      proposalForm={proposalForm}
      selectPendingId={selectPendingId}
      executorProfileCheck={executorProfileCheck}
      onOpenUserProfile={openUserProfile}
      onToFeed={() => navigate("/feed")}
      onSelectProposal={(proposalId: string) => {
        void handleSelectProposal(proposalId);
      }}
      onStartEditOwnProposal={() => {
        if (!ownProposal) {
          return;
        }

        setProposalError(null);
        setProposalEditMode((prev) => !prev);
        setProposalForm({
          price: String(ownProposal.price),
          comment: ownProposal.comment,
          etaDays: String(ownProposal.etaDays),
        });
      }}
      onDeleteOwnProposal={() => {
        void handleDeleteProposal();
      }}
      onPatchProposalForm={(patch: Partial<ProposalForm>) =>
        setProposalForm((prev) => ({
          ...prev,
          ...patch,
        }))
      }
      onCreateProposal={() => {
        void handleCreateProposal();
      }}
      onUpdateProposal={() => {
        void handleUpdateProposal();
      }}
      onCancelProposalEdit={() => setProposalEditMode(false)}
      onOpenExecutorProfileSetup={() => navigate("/account/executor")}
      taskMessages={taskMessages}
      taskMessagesLoading={taskMessagesLoading}
      taskMessagesError={taskMessagesError}
      taskMessageDraft={taskMessageDraft}
      taskMessagePending={taskMessagePending}
      onTaskMessageDraftChange={setTaskMessageDraft}
      onSendTaskMessage={() => {
        void handleSendTaskMessage();
      }}
    />
  );

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
              <Route path="/admin" element={renderAdmin()} />
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
                path="/account/proposals"
                element={renderAccountMyProposals()}
              />
              <Route
                path="*"
                element={<Navigate to={preferredPath} replace />}
              />
            </Routes>
          )}
        </div>

        {!authGate && !needsRoleOnboarding && !hideBottomNav ? (
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
