import { type ChangeEvent, useRef } from "react";
import {
  Bell,
  Briefcase,
  Camera,
  ChevronRight,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import type { NotificationItem } from "../../../entities/notification/model/types";
import type {
  ExecutorProfileForm,
  ExperienceLevelValue,
  PrimaryRoleValue,
  PublicUser,
} from "../../../entities/user/model/types";
import { EXPERIENCE_LEVEL_OPTIONS } from "../../../shared/config/constants";
import { formatDate } from "../../../shared/lib/format";
import { toRoleLabel } from "../../../shared/lib/profile";
import {
  Avatar,
  Button,
  Cell,
  List,
  Placeholder,
  Section,
  Input,
  Textarea,
} from "../../../shared/ui";

type ExecutorProfileCheck = { isComplete: boolean; missing: string[] };

type AccountBackProps = {
  onBack: () => void;
  label?: string;
};

const AccountBack = ({
  onBack,
  label = "Назад в профиль",
}: AccountBackProps): JSX.Element => (
  <Section>
    <div className="row-actions row-actions-tight">
      <Button mode="outline" size="m" onClick={onBack}>
        {label}
      </Button>
    </div>
  </Section>
);

const accountMenuAfter = (value: string): JSX.Element => (
  <span className="account-menu-after">
    <span className="account-menu-after-text">{value}</span>
    <ChevronRight size={16} />
  </span>
);

type AccountHomeScreenProps = {
  authUser: PublicUser;
  profileAcronym: string;
  webAppVersion: string;
  apiBaseUrl: string;
  notificationsUnreadCount: number;
  executorProfileCheck: ExecutorProfileCheck;
  onOpenAvatar: () => void;
  onOpenRole: () => void;
  onOpenExecutor: () => void;
  onOpenBotNotifications: () => void;
  onOpenNotificationsCenter: () => void;
  isAdmin: boolean;
  onOpenAdmin: () => void;
};

export const AccountHomeScreen = ({
  authUser,
  profileAcronym,
  webAppVersion,
  apiBaseUrl,
  notificationsUnreadCount,
  executorProfileCheck,
  onOpenAvatar,
  onOpenRole,
  onOpenExecutor,
  onOpenBotNotifications,
  onOpenNotificationsCenter,
  isAdmin,
  onOpenAdmin,
}: AccountHomeScreenProps): JSX.Element => {
  const hasProfile = Boolean(authUser.profile);

  return (
    <>
      <Section
        header="Профиль"
        footer={`API: ${apiBaseUrl} | WebApp: ${webAppVersion}`}
      >
        <List>
          <Cell
            before={
              <Avatar
                size={48}
                acronym={profileAcronym}
                imageUrl={authUser.profile?.avatarUrl ?? null}
              />
            }
            subtitle="Пользователь системы"
            description={hasProfile ? "Профиль заполнен" : "Профиль пустой"}
          >
            {authUser.displayName}
          </Cell>
          <Cell
            subtitle="Приоритет сценария"
            after={toRoleLabel(authUser.primaryRole)}
          >
            Роль в интерфейсе
          </Cell>
          <Cell
            subtitle="Готовность к откликам"
            after={executorProfileCheck.isComplete ? "Заполнен" : "Неполный"}
          >
            Профиль исполнителя
          </Cell>
        </List>
      </Section>

      <Section
        header="Управление"
        footer="Редактирование вынесено в отдельные экраны, чтобы профиль оставался компактным."
      >
        <List>
          <Cell
            before={<Camera size={18} />}
            subtitle="Фото из Telegram можно заменить"
            after={accountMenuAfter("Фото")}
            onClick={onOpenAvatar}
          >
            Фото профиля
          </Cell>
          <Cell
            before={<UserRound size={18} />}
            subtitle="Влияет на стартовую вкладку"
            after={accountMenuAfter(toRoleLabel(authUser.primaryRole))}
            onClick={onOpenRole}
          >
            Роль в интерфейсе
          </Cell>
          <Cell
            before={<Briefcase size={18} />}
            subtitle="Данные для выбора исполнителя"
            after={accountMenuAfter(
              executorProfileCheck.isComplete ? "Ок" : "Заполнить",
            )}
            onClick={onOpenExecutor}
          >
            Анкета исполнителя
          </Cell>
          <Cell
            before={<ShieldCheck size={18} />}
            subtitle="Дублировать критичные события в бота"
            after={accountMenuAfter(
              authUser.profile?.botNotificationsEnabled
                ? "Включены"
                : "Выключены",
            )}
            onClick={onOpenBotNotifications}
          >
            Уведомления в боте
          </Cell>
          <Cell
            before={<Bell size={18} />}
            subtitle="История событий по задачам"
            after={accountMenuAfter(`Новых: ${notificationsUnreadCount}`)}
            onClick={onOpenNotificationsCenter}
          >
            Центр уведомлений
          </Cell>
          {isAdmin ? (
            <Cell
              before={<ShieldCheck size={18} />}
              subtitle="Модерация пользователей и задач"
              after={accountMenuAfter("Открыть")}
              onClick={onOpenAdmin}
            >
              Админка
            </Cell>
          ) : null}
        </List>
      </Section>
    </>
  );
};

type AccountAvatarScreenProps = {
  authUser: PublicUser;
  profileAcronym: string;
  avatarSavePending: boolean;
  avatarSaveError: string | null;
  onAvatarInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetAvatar: () => void;
  onBack: () => void;
};

export const AccountAvatarScreen = ({
  authUser,
  profileAcronym,
  avatarSavePending,
  avatarSaveError,
  onAvatarInputChange,
  onResetAvatar,
  onBack,
}: AccountAvatarScreenProps): JSX.Element => {
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <Section
        header="Фото профиля"
        footer="Можно загрузить PNG, JPEG, WEBP или GIF до 2 МБ."
      >
        <List>
          <Cell
            before={
              <Avatar
                size={54}
                acronym={profileAcronym}
                imageUrl={authUser.profile?.avatarUrl ?? null}
              />
            }
            subtitle="Текущее фото"
            description="Это фото увидят заказчики и исполнители"
          >
            {authUser.displayName}
          </Cell>
        </List>

        <input
          ref={avatarInputRef}
          className="visually-hidden-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onAvatarInputChange}
        />

        <div className="row-actions row-actions-tight">
          <Button
            mode="bezeled"
            size="m"
            disabled={avatarSavePending}
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarSavePending ? "Загружаем..." : "Загрузить фото"}
          </Button>
          <Button
            mode="outline"
            size="m"
            disabled={avatarSavePending || !authUser.profile?.hasCustomAvatar}
            onClick={onResetAvatar}
          >
            Сбросить фото
          </Button>
        </div>

        {avatarSaveError ? (
          <p className="error-text">{avatarSaveError}</p>
        ) : null}
      </Section>

      <AccountBack onBack={onBack} />
    </>
  );
};

type AccountRoleScreenProps = {
  authUser: PublicUser;
  roleSavePending: boolean;
  roleSaveError: string | null;
  onSetRole: (role: PrimaryRoleValue) => void;
  onBack: () => void;
};

export const AccountRoleScreen = ({
  authUser,
  roleSavePending,
  roleSaveError,
  onSetRole,
  onBack,
}: AccountRoleScreenProps): JSX.Element => (
  <>
    <Section
      header="Роль в интерфейсе"
      footer="Роль влияет только на приоритет экранов, без ограничений функций."
    >
      <Cell
        subtitle="Текущий приоритет"
        after={toRoleLabel(authUser.primaryRole)}
      >
        Основной сценарий
      </Cell>

      <div className="role-switch-row">
        <Button
          size="m"
          mode={authUser.primaryRole === "CUSTOMER" ? "filled" : "outline"}
          disabled={roleSavePending}
          onClick={() => onSetRole("CUSTOMER")}
        >
          Чаще заказчик
        </Button>
        <Button
          size="m"
          mode={authUser.primaryRole === "EXECUTOR" ? "filled" : "outline"}
          disabled={roleSavePending}
          onClick={() => onSetRole("EXECUTOR")}
        >
          Чаще исполнитель
        </Button>
      </div>

      {roleSaveError ? <p className="error-text">{roleSaveError}</p> : null}
    </Section>

    <AccountBack onBack={onBack} />
  </>
);

type AccountExecutorScreenProps = {
  executorProfileCheck: ExecutorProfileCheck;
  executorProfileForm: ExecutorProfileForm;
  executorProfilePending: boolean;
  executorProfileError: string | null;
  onFormPatch: (patch: Partial<ExecutorProfileForm>) => void;
  onSave: () => void;
  onBack: () => void;
};

export const AccountExecutorScreen = ({
  executorProfileCheck,
  executorProfileForm,
  executorProfilePending,
  executorProfileError,
  onFormPatch,
  onSave,
  onBack,
}: AccountExecutorScreenProps): JSX.Element => (
  <>
    <Section
      header="Анкета исполнителя"
      footer="Этот блок нужен, чтобы заказчик выбирал не случайно, а по профилю."
    >
      <Cell
        subtitle="Готовность к откликам"
        after={executorProfileCheck.isComplete ? "Заполнен" : "Неполный"}
      >
        Статус анкеты
      </Cell>

      {!executorProfileCheck.isComplete ? (
        <div className="profile-check-list">
          {executorProfileCheck.missing.map((item) => (
            <p key={item} className="profile-check-item">
              • {item}
            </p>
          ))}
        </div>
      ) : null}

      <div className="form-grid">
        <Textarea
          header="О себе"
          placeholder="Коротко: что умеешь, как работаешь, в чем твоя сильная сторона."
          value={executorProfileForm.about}
          onChange={(event) => onFormPatch({ about: event.target.value })}
        />
        <Input
          header="Навыки"
          placeholder="react, node.js, figma"
          value={executorProfileForm.skills}
          onChange={(event) => onFormPatch({ skills: event.target.value })}
        />
        <Textarea
          header="Портфолио (ссылки)"
          placeholder="По одной ссылке в строке или через запятую"
          value={executorProfileForm.portfolioLinks}
          onChange={(event) =>
            onFormPatch({ portfolioLinks: event.target.value })
          }
          rows={3}
        />
        <Input
          header="Базовая ставка (RUB)"
          type="number"
          placeholder="5000"
          value={executorProfileForm.basePrice}
          onChange={(event) => onFormPatch({ basePrice: event.target.value })}
        />
      </div>

      <p className="form-label">Уровень опыта</p>
      <div className="chip-row">
        {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
          <Button
            key={option.value}
            size="s"
            mode={
              executorProfileForm.experienceLevel === option.value
                ? "filled"
                : "outline"
            }
            onClick={() =>
              onFormPatch({
                experienceLevel: option.value as ExperienceLevelValue,
              })
            }
          >
            {option.label}
          </Button>
        ))}
      </div>

      {executorProfileError ? (
        <p className="error-text">{executorProfileError}</p>
      ) : null}

      <div className="row-actions row-actions-tight">
        <Button
          mode="filled"
          size="m"
          disabled={executorProfilePending}
          onClick={onSave}
        >
          {executorProfilePending ? "Сохраняем..." : "Сохранить анкету"}
        </Button>
      </div>
    </Section>

    <AccountBack onBack={onBack} />
  </>
);

type AccountBotNotificationsScreenProps = {
  enabled: boolean;
  botNotificationsPending: boolean;
  botNotificationsError: string | null;
  onSetEnabled: (enabled: boolean) => void;
  onOpenNotificationsCenter: () => void;
  onBack: () => void;
};

export const AccountBotNotificationsScreen = ({
  enabled,
  botNotificationsPending,
  botNotificationsError,
  onSetEnabled,
  onOpenNotificationsCenter,
  onBack,
}: AccountBotNotificationsScreenProps): JSX.Element => (
  <>
    <Section
      header="Уведомления в боте"
      footer="Критичные события будут приходить сообщением в Telegram-боте."
    >
      <Cell subtitle="Текущий режим" after={enabled ? "Включены" : "Выключены"}>
        Дублировать события в бота
      </Cell>

      <div className="row-actions row-actions-tight">
        <Button
          mode={enabled ? "filled" : "outline"}
          size="m"
          disabled={botNotificationsPending}
          onClick={() => onSetEnabled(true)}
        >
          Включить
        </Button>
        <Button
          mode={enabled ? "outline" : "filled"}
          size="m"
          disabled={botNotificationsPending}
          onClick={() => onSetEnabled(false)}
        >
          Выключить
        </Button>
      </div>

      <div className="row-actions row-actions-tight">
        <Button mode="bezeled" size="m" onClick={onOpenNotificationsCenter}>
          Открыть центр уведомлений
        </Button>
      </div>

      {botNotificationsError ? (
        <p className="error-text">{botNotificationsError}</p>
      ) : null}
    </Section>

    <AccountBack onBack={onBack} />
  </>
);

type AccountNotificationsScreenProps = {
  notificationsUnreadCount: number;
  notifications: NotificationItem[];
  notificationsLoading: boolean;
  notificationsError: string | null;
  notificationsPending: boolean;
  onReadAll: () => void;
  onRefresh: () => void;
  onReadOne: (notificationId: string) => void;
  onBack: () => void;
};

export const AccountNotificationsScreen = ({
  notificationsUnreadCount,
  notifications,
  notificationsLoading,
  notificationsError,
  notificationsPending,
  onReadAll,
  onRefresh,
  onReadOne,
  onBack,
}: AccountNotificationsScreenProps): JSX.Element => (
  <>
    <Section
      header={`Центр уведомлений (${notificationsUnreadCount})`}
      footer="Отмечай события прочитанными, чтобы лента оставалась чистой."
    >
      <div className="row-actions row-actions-tight">
        <Button
          mode="outline"
          size="s"
          disabled={notificationsPending || notificationsUnreadCount === 0}
          onClick={onReadAll}
        >
          Прочитать все
        </Button>
        <Button
          mode="bezeled"
          size="s"
          disabled={notificationsPending}
          onClick={onRefresh}
        >
          Обновить
        </Button>
      </div>

      {notificationsLoading ? (
        <Placeholder header="Загрузка" description="Получаем уведомления..." />
      ) : notificationsError ? (
        <Placeholder header="Ошибка" description={notificationsError} />
      ) : notifications.length === 0 ? (
        <Placeholder
          header="Пока пусто"
          description="Когда появятся события по задачам, они будут здесь."
        />
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${notification.isRead ? "notification-read" : "notification-unread"}`}
            >
              <p className="notification-title">{notification.title}</p>
              <p className="notification-body">{notification.body}</p>
              <p className="notification-meta">
                {formatDate(notification.createdAt)} •{" "}
                {notification.isRead ? "Прочитано" : "Не прочитано"}
              </p>

              {!notification.isRead ? (
                <div className="notification-actions">
                  <Button
                    mode="outline"
                    size="s"
                    disabled={notificationsPending}
                    onClick={() => onReadOne(notification.id)}
                  >
                    Отметить прочитанным
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Section>

    <AccountBack onBack={onBack} />
  </>
);
