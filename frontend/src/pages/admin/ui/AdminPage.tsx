import { Shield, UserX, UserCheck, Search, RefreshCw, Ban } from "lucide-react";

import type {
  AdminAuditItem,
  AdminIdentity,
  AdminTaskItem,
  AdminUserItem,
} from "../../../entities/admin/model/types";
import { formatDate, formatMoney, trimText } from "../../../shared/lib/format";
import { getStatusLabel } from "../../../shared/lib/task";
import { Button, Input, Placeholder, Section } from "../../../shared/ui";

type AdminView = "users" | "tasks" | "audit";

type AdminPageProps = {
  adminAccessLoading: boolean;
  isAdmin: boolean;
  adminAccessError: string | null;
  adminIdentity: AdminIdentity | null;
  activeView: AdminView;
  onChangeView: (view: AdminView) => void;
  users: AdminUserItem[];
  usersLoading: boolean;
  usersError: string | null;
  usersQuery: string;
  onUsersQueryChange: (value: string) => void;
  onUsersSearch: () => void;
  onUsersReload: () => void;
  onToggleUserBlock: (user: AdminUserItem) => void;
  tasks: AdminTaskItem[];
  tasksLoading: boolean;
  tasksError: string | null;
  tasksQuery: string;
  onTasksQueryChange: (value: string) => void;
  onTasksSearch: () => void;
  onTasksReload: () => void;
  onModerateTaskCancel: (task: AdminTaskItem) => void;
  audit: AdminAuditItem[];
  auditLoading: boolean;
  auditError: string | null;
  onAuditReload: () => void;
};

export const AdminPage = ({
  adminAccessLoading,
  isAdmin,
  adminAccessError,
  adminIdentity,
  activeView,
  onChangeView,
  users,
  usersLoading,
  usersError,
  usersQuery,
  onUsersQueryChange,
  onUsersSearch,
  onUsersReload,
  onToggleUserBlock,
  tasks,
  tasksLoading,
  tasksError,
  tasksQuery,
  onTasksQueryChange,
  onTasksSearch,
  onTasksReload,
  onModerateTaskCancel,
  audit,
  auditLoading,
  auditError,
  onAuditReload,
}: AdminPageProps): JSX.Element => {
  if (adminAccessLoading) {
    return (
      <Section>
        <Placeholder header="Проверка доступа" description="Проверяем права администратора..." />
      </Section>
    );
  }

  if (!isAdmin) {
    return (
      <Section>
        <Placeholder
          header="Нет доступа"
          description={adminAccessError ?? "Админ-доступ не выдан для этого аккаунта."}
        />
      </Section>
    );
  }

  return (
    <>
      <Section
        header="Админка"
        footer={
          adminIdentity
            ? `Вы вошли как ${adminIdentity.displayName} (${adminIdentity.telegramId})`
            : "Панель управления платформой"
        }
      >
        <div className="chip-row">
          <Button
            mode={activeView === "users" ? "filled" : "outline"}
            size="s"
            onClick={() => onChangeView("users")}
          >
            Пользователи
          </Button>
          <Button
            mode={activeView === "tasks" ? "filled" : "outline"}
            size="s"
            onClick={() => onChangeView("tasks")}
          >
            Задачи
          </Button>
          <Button
            mode={activeView === "audit" ? "filled" : "outline"}
            size="s"
            onClick={() => onChangeView("audit")}
          >
            Аудит
          </Button>
        </div>
      </Section>

      {activeView === "users" ? (
        <Section header="Пользователи" footer="Поиск по имени, username или telegram id.">
          <div className="form-grid">
            <Input
              header="Поиск"
              placeholder="Имя, username, telegram id"
              value={usersQuery}
              onChange={(event) => onUsersQueryChange(event.target.value)}
            />
          </div>

          <div className="row-actions row-actions-tight">
            <Button mode="filled" size="m" onClick={onUsersSearch}>
              <span className="btn-with-icon">
                <Search size={16} />
                <span>Найти</span>
              </span>
            </Button>
            <Button mode="outline" size="m" onClick={onUsersReload}>
              <span className="btn-with-icon">
                <RefreshCw size={16} />
                <span>Обновить</span>
              </span>
            </Button>
          </div>

          {usersLoading ? (
            <Placeholder header="Загрузка" description="Получаем пользователей..." />
          ) : usersError ? (
            <Placeholder header="Ошибка" description={usersError} />
          ) : users.length === 0 ? (
            <Placeholder header="Пусто" description="Пользователи не найдены." />
          ) : (
            <div className="proposal-list">
              {users.map((user) => (
                <div key={user.id} className="proposal-card">
                  <p className="proposal-title">{user.displayName}</p>
                  <p className="proposal-meta">
                    telegram: {user.telegramId} • статус: {user.isBlocked ? "заблокирован" : "активен"}
                  </p>
                  <p className="proposal-mini-meta">ID: {user.id}</p>
                  <div className="row-actions row-actions-tight">
                    <Button
                      mode={user.isBlocked ? "bezeled" : "plain"}
                      size="s"
                      onClick={() => onToggleUserBlock(user)}
                    >
                      <span className="btn-with-icon">
                        {user.isBlocked ? <UserCheck size={16} /> : <UserX size={16} />}
                        <span>{user.isBlocked ? "Разблокировать" : "Заблокировать"}</span>
                      </span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {activeView === "tasks" ? (
        <Section header="Задачи" footer="Модерация: принудительная отмена задачи с причиной.">
          <div className="form-grid">
            <Input
              header="Поиск"
              placeholder="Название или описание"
              value={tasksQuery}
              onChange={(event) => onTasksQueryChange(event.target.value)}
            />
          </div>

          <div className="row-actions row-actions-tight">
            <Button mode="filled" size="m" onClick={onTasksSearch}>
              <span className="btn-with-icon">
                <Search size={16} />
                <span>Найти</span>
              </span>
            </Button>
            <Button mode="outline" size="m" onClick={onTasksReload}>
              <span className="btn-with-icon">
                <RefreshCw size={16} />
                <span>Обновить</span>
              </span>
            </Button>
          </div>

          {tasksLoading ? (
            <Placeholder header="Загрузка" description="Получаем задачи..." />
          ) : tasksError ? (
            <Placeholder header="Ошибка" description={tasksError} />
          ) : tasks.length === 0 ? (
            <Placeholder header="Пусто" description="Задачи не найдены." />
          ) : (
            <div className="task-feed-list">
              {tasks.map((task) => {
                const canModerate =
                  task.status !== "COMPLETED" && task.status !== "CANCELED";

                return (
                  <article key={task.id} className="task-feed-card">
                    <div className="task-feed-card-head">
                      <h3 className="task-feed-card-title">{task.title}</h3>
                      <p className="task-feed-card-budget">{formatMoney(task.budget)}</p>
                    </div>
                    <div className="task-feed-meta-row">
                      <span className="task-feed-meta-chip">{getStatusLabel(task.status)}</span>
                      <span className="task-feed-meta-chip">{formatDate(task.createdAt)}</span>
                    </div>
                    <p className="proposal-mini-meta">Заказчик: {task.customer?.displayName ?? "—"}</p>
                    <p className="task-feed-description">{trimText(task.description, 140)}</p>
                    <div className="row-actions row-actions-tight">
                      <Button
                        mode={canModerate ? "plain" : "outline"}
                        size="s"
                        disabled={!canModerate}
                        onClick={() => onModerateTaskCancel(task)}
                      >
                        <span className="btn-with-icon">
                          <Ban size={16} />
                          <span>Отменить задачу</span>
                        </span>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Section>
      ) : null}

      {activeView === "audit" ? (
        <Section header="Аудит действий" footer="Журнал действий администраторов.">
          <div className="row-actions row-actions-tight">
            <Button mode="outline" size="m" onClick={onAuditReload}>
              <span className="btn-with-icon">
                <RefreshCw size={16} />
                <span>Обновить</span>
              </span>
            </Button>
          </div>

          {auditLoading ? (
            <Placeholder header="Загрузка" description="Получаем журнал аудита..." />
          ) : auditError ? (
            <Placeholder header="Ошибка" description={auditError} />
          ) : audit.length === 0 ? (
            <Placeholder header="Пусто" description="Записей аудита пока нет." />
          ) : (
            <div className="status-history-list">
              {audit.map((entry) => (
                <div key={entry.id} className="status-history-card">
                  <p className="status-history-line">
                    <span className="btn-with-icon">
                      <Shield size={14} />
                      <span>{entry.action}</span>
                    </span>
                  </p>
                  <p className="status-history-meta">
                    {formatDate(entry.createdAt)} • {entry.adminUser.displayName}
                  </p>
                  <p className="proposal-mini-meta">
                    {entry.targetType} • {entry.targetId}
                  </p>
                  {entry.reason ? (
                    <p className="status-history-comment">Причина: {entry.reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : null}
    </>
  );
};
