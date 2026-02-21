import { useEffect, useRef } from "react";
import type { TaskMessageItem } from "../../../entities/chat/model/types";
import { Home } from "lucide-react";

import type {
  ProposalForm,
  ProposalItem,
} from "../../../entities/proposal/model/types";
import type {
  TaskForm,
  TaskItem,
  TaskStatusHistoryItem,
} from "../../../entities/task/model/types";
import type { PublicUser } from "../../../entities/user/model/types";
import {
  formatDate,
  formatMoney,
  formatRating,
  trimText,
} from "../../../shared/lib/format";
import { getExperienceLevelLabel } from "../../../shared/lib/profile";
import {
  getStatusLabel,
  shouldClampTaskDescription,
} from "../../../shared/lib/task";
import { getDisplayAcronym } from "../../../shared/lib/telegram";
import {
  Avatar,
  Button,
  Input,
  Placeholder,
  Section,
  Textarea,
} from "../../../shared/ui";

type ExecutorProfileCheck = { isComplete: boolean; missing: string[] };

type TaskProposalsSectionProps = {
  detailTask: TaskItem;
  authUser: PublicUser;
  isDetailOwner: boolean;
  proposals: ProposalItem[];
  proposalsLoading: boolean;
  proposalsError: string | null;
  ownProposal: ProposalItem | null;
  proposalEditMode: boolean;
  proposalPending: boolean;
  proposalError: string | null;
  proposalForm: ProposalForm;
  selectPendingId: string | null;
  executorProfileCheck: ExecutorProfileCheck;
  onOpenUserProfile: (userId: string) => void;
  onSelectProposal: (proposalId: string) => void;
  onStartEditOwnProposal: () => void;
  onDeleteOwnProposal: () => void;
  onPatchProposalForm: (patch: Partial<ProposalForm>) => void;
  onCreateProposal: () => void;
  onUpdateProposal: () => void;
  onCancelProposalEdit: () => void;
  onOpenExecutorProfileSetup: () => void;
};

const TaskProposalsSection = ({
  detailTask,
  authUser,
  isDetailOwner,
  proposals,
  proposalsLoading,
  proposalsError,
  ownProposal,
  proposalEditMode,
  proposalPending,
  proposalError,
  proposalForm,
  selectPendingId,
  executorProfileCheck,
  onOpenUserProfile,
  onSelectProposal,
  onStartEditOwnProposal,
  onDeleteOwnProposal,
  onPatchProposalForm,
  onCreateProposal,
  onUpdateProposal,
  onCancelProposalEdit,
  onOpenExecutorProfileSetup,
}: TaskProposalsSectionProps): JSX.Element => {
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
                        Рейтинг: {formatRating(executorProfile?.rating ?? 0)} •
                        Опыт:{" "}
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
                        onClick={() => onOpenUserProfile(executorId)}
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
                      onClick={() => onSelectProposal(proposal.id)}
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
              <Button mode="bezeled" size="m" onClick={onStartEditOwnProposal}>
                {proposalEditMode ? "Скрыть форму" : "Изменить"}
              </Button>
              <Button
                mode="plain"
                size="m"
                disabled={proposalPending}
                onClick={onDeleteOwnProposal}
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
            <Button mode="filled" size="m" onClick={onOpenExecutorProfileSetup}>
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
              onPatchProposalForm({ price: event.target.value })
            }
          />
          <Input
            header="Срок (дней)"
            type="number"
            value={proposalForm.etaDays}
            onChange={(event) =>
              onPatchProposalForm({ etaDays: event.target.value })
            }
          />
          <Textarea
            header="Комментарий"
            value={proposalForm.comment}
            onChange={(event) =>
              onPatchProposalForm({ comment: event.target.value })
            }
          />

          {proposalError ? <p className="error-text">{proposalError}</p> : null}

          <div className="row-actions">
            <Button
              mode="filled"
              size="m"
              disabled={proposalPending}
              onClick={ownProposal ? onUpdateProposal : onCreateProposal}
            >
              {proposalPending
                ? "Сохраняем..."
                : ownProposal
                  ? "Сохранить отклик"
                  : "Отправить отклик"}
            </Button>
            {ownProposal ? (
              <Button mode="outline" size="m" onClick={onCancelProposalEdit}>
                Отмена
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Section>
  );
};

type TaskDetailPageProps = {
  detailLoading: boolean;
  detailError: string | null;
  detailTask: TaskItem | null;
  authUser: PublicUser | null;
  isDetailOwner: boolean;
  expandedDetailDescription: boolean;
  onToggleExpandedDetailDescription: () => void;
  editMode: boolean;
  editPending: boolean;
  editError: string | null;
  editForm: TaskForm;
  onPatchEditForm: (patch: Partial<TaskForm>) => void;
  onToggleEditMode: () => void;
  onSaveTaskEdits: () => void;
  onCancelTask: () => void;
  statusHistory: TaskStatusHistoryItem[];
  statusHistoryLoading: boolean;
  statusHistoryError: string | null;
  statusActionPending: boolean;
  statusActionError: string | null;
  rejectReviewMode: boolean;
  rejectReviewComment: string;
  onToggleRejectReviewMode: () => void;
  onRejectReviewCommentChange: (value: string) => void;
  onSendToReview: () => void;
  onApproveTask: () => void;
  onRejectReview: () => void;
  proposals: ProposalItem[];
  proposalsLoading: boolean;
  proposalsError: string | null;
  ownProposal: ProposalItem | null;
  proposalEditMode: boolean;
  proposalPending: boolean;
  proposalError: string | null;
  proposalForm: ProposalForm;
  selectPendingId: string | null;
  executorProfileCheck: ExecutorProfileCheck;
  onOpenUserProfile: (userId: string) => void;
  onToFeed: () => void;
  onSelectProposal: (proposalId: string) => void;
  onStartEditOwnProposal: () => void;
  onDeleteOwnProposal: () => void;
  onPatchProposalForm: (patch: Partial<ProposalForm>) => void;
  onCreateProposal: () => void;
  onUpdateProposal: () => void;
  onCancelProposalEdit: () => void;
  onOpenExecutorProfileSetup: () => void;
  taskMessages: TaskMessageItem[];
  taskMessagesLoading: boolean;
  taskMessagesError: string | null;
  taskMessageDraft: string;
  taskMessagePending: boolean;
  onTaskMessageDraftChange: (value: string) => void;
  onSendTaskMessage: () => void;
};

export const TaskDetailPage = ({
  detailLoading,
  detailError,
  detailTask,
  authUser,
  isDetailOwner,
  expandedDetailDescription,
  onToggleExpandedDetailDescription,
  editMode,
  editPending,
  editError,
  editForm,
  onPatchEditForm,
  onToggleEditMode,
  onSaveTaskEdits,
  onCancelTask,
  statusHistory,
  statusHistoryLoading,
  statusHistoryError,
  statusActionPending,
  statusActionError,
  rejectReviewMode,
  rejectReviewComment,
  onToggleRejectReviewMode,
  onRejectReviewCommentChange,
  onSendToReview,
  onApproveTask,
  onRejectReview,
  proposals,
  proposalsLoading,
  proposalsError,
  ownProposal,
  proposalEditMode,
  proposalPending,
  proposalError,
  proposalForm,
  selectPendingId,
  executorProfileCheck,
  onOpenUserProfile,
  onToFeed,
  onSelectProposal,
  onStartEditOwnProposal,
  onDeleteOwnProposal,
  onPatchProposalForm,
  onCreateProposal,
  onUpdateProposal,
  onCancelProposalEdit,
  onOpenExecutorProfileSetup,
  taskMessages,
  taskMessagesLoading,
  taskMessagesError,
  taskMessageDraft,
  taskMessagePending,
  onTaskMessageDraftChange,
  onSendTaskMessage,
}: TaskDetailPageProps): JSX.Element => {
  const taskChatListRef = useRef<HTMLDivElement | null>(null);
  const prevTaskMessagesCountRef = useRef(0);

  const hasAssignment = Boolean(detailTask?.assignment);
  const canUseTaskChat = Boolean(
    authUser &&
    detailTask?.assignment &&
    detailTask &&
    (authUser.id === detailTask.customerId ||
      authUser.id === detailTask.assignment.executorId),
  );

  useEffect(() => {
    if (!canUseTaskChat) {
      prevTaskMessagesCountRef.current = 0;
      return;
    }

    const listElement = taskChatListRef.current;
    if (!listElement) {
      return;
    }

    const prevCount = prevTaskMessagesCountRef.current;
    const nextCount = taskMessages.length;
    const distanceToBottom =
      listElement.scrollHeight -
      listElement.scrollTop -
      listElement.clientHeight;
    const wasNearBottom = distanceToBottom < 80;

    if (prevCount === 0 || nextCount > prevCount || wasNearBottom) {
      window.requestAnimationFrame(() => {
        listElement.scrollTop = listElement.scrollHeight;
      });
    }

    prevTaskMessagesCountRef.current = nextCount;
  }, [canUseTaskChat, taskMessages]);

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
  const canApproveOrReject = isDetailOwner && detailTask.status === "ON_REVIEW";
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
          <p className="task-detail-budget">{formatMoney(detailTask.budget)}</p>
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
              onClick={() => onOpenUserProfile(detailCustomer.id)}
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
              onClick={onToggleExpandedDetailDescription}
            >
              {expandedDetailDescription ? "Скрыть" : "Показать еще"}
            </Button>
          </div>
        ) : null}
      </Section>

      <Section header="Действия">
        <div className="row-actions row-actions-tight">
          <Button mode="outline" onClick={onToFeed}>
            <span className="btn-with-icon">
              <Home size={16} />
              <span>К ленте</span>
            </span>
          </Button>
          {canEdit ? (
            <Button mode="bezeled" onClick={onToggleEditMode}>
              {editMode ? "Скрыть редактирование" : "Редактировать"}
            </Button>
          ) : null}
          {canEdit ? (
            <Button mode="plain" onClick={onCancelTask}>
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
              onClick={onSendToReview}
            >
              {statusActionPending ? "Отправляем..." : "Отправить на проверку"}
            </Button>
          ) : null}

          {canApproveOrReject ? (
            <>
              <div className="row-actions">
                <Button
                  mode="filled"
                  size="m"
                  disabled={statusActionPending}
                  onClick={onApproveTask}
                >
                  {statusActionPending
                    ? "Подтверждаем..."
                    : "Подтвердить выполнение"}
                </Button>
                <Button
                  mode="bezeled"
                  size="m"
                  disabled={statusActionPending}
                  onClick={onToggleRejectReviewMode}
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
                    onChange={(event) =>
                      onRejectReviewCommentChange(event.target.value)
                    }
                  />
                  <div className="row-actions row-actions-tight">
                    <Button
                      mode="outline"
                      size="m"
                      disabled={statusActionPending}
                      onClick={onRejectReview}
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
        header="Чат по задаче"
        footer="В чате можно обсуждать детали выполнения и правки по этой задаче."
      >
        {!hasAssignment ? (
          <Placeholder
            header="Чат пока закрыт"
            description="Чат появится после того, как заказчик выберет исполнителя."
          />
        ) : !canUseTaskChat ? (
          <Placeholder
            header="Нет доступа"
            description="Чат доступен только заказчику и выбранному исполнителю."
          />
        ) : (
          <>
            {taskMessagesLoading ? (
              <Placeholder
                header="Загрузка"
                description="Получаем сообщения чата..."
              />
            ) : taskMessagesError ? (
              <Placeholder header="Ошибка" description={taskMessagesError} />
            ) : taskMessages.length === 0 ? (
              <Placeholder
                header="Пока сообщений нет"
                description="Напиши первое сообщение по задаче."
              />
            ) : (
              <div className="task-chat-list" ref={taskChatListRef}>
                {taskMessages.map((message) => {
                  const isOwnMessage = authUser?.id === message.senderId;

                  return (
                    <div
                      key={message.id}
                      className={`task-chat-message ${isOwnMessage ? "task-chat-message-own" : "task-chat-message-other"}`}
                    >
                      <p className="task-chat-author">
                        {isOwnMessage ? "Вы" : message.sender.displayName}
                      </p>
                      <p className="task-chat-text">{message.text}</p>
                      <p className="task-chat-meta">
                        {formatDate(message.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="task-chat-form">
              <Textarea
                header="Сообщение"
                placeholder="Напиши комментарий по задаче..."
                value={taskMessageDraft}
                onChange={(event) =>
                  onTaskMessageDraftChange(event.target.value)
                }
                rows={3}
              />
              <div className="row-actions row-actions-tight">
                <Button
                  mode="filled"
                  size="m"
                  disabled={
                    taskMessagePending || taskMessageDraft.trim().length === 0
                  }
                  onClick={onSendTaskMessage}
                >
                  {taskMessagePending ? "Отправляем..." : "Отправить"}
                </Button>
              </div>
            </div>
          </>
        )}
      </Section>

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
                onPatchEditForm({ title: event.target.value })
              }
            />
            <Textarea
              header="Описание"
              value={editForm.description}
              onChange={(event) =>
                onPatchEditForm({ description: event.target.value })
              }
            />
            <Input
              header="Бюджет"
              type="number"
              value={editForm.budget}
              onChange={(event) =>
                onPatchEditForm({ budget: event.target.value })
              }
            />
            <Input
              header="Категория"
              value={editForm.category}
              onChange={(event) =>
                onPatchEditForm({ category: event.target.value })
              }
            />
            <Input
              header="Дедлайн"
              type="datetime-local"
              value={editForm.deadlineAt}
              onChange={(event) =>
                onPatchEditForm({ deadlineAt: event.target.value })
              }
            />
            <Input
              header="Теги"
              value={editForm.tags}
              onChange={(event) =>
                onPatchEditForm({ tags: event.target.value })
              }
            />
          </div>

          {editError ? <p className="error-text">{editError}</p> : null}

          <div className="row-actions">
            <Button
              mode="filled"
              disabled={editPending}
              onClick={onSaveTaskEdits}
            >
              {editPending ? "Сохраняем..." : "Сохранить"}
            </Button>
            <Button mode="outline" onClick={onToggleEditMode}>
              Отмена
            </Button>
          </div>
        </Section>
      ) : null}

      {authUser ? (
        <TaskProposalsSection
          detailTask={detailTask}
          authUser={authUser}
          isDetailOwner={isDetailOwner}
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
          onOpenUserProfile={onOpenUserProfile}
          onSelectProposal={onSelectProposal}
          onStartEditOwnProposal={onStartEditOwnProposal}
          onDeleteOwnProposal={onDeleteOwnProposal}
          onPatchProposalForm={onPatchProposalForm}
          onCreateProposal={onCreateProposal}
          onUpdateProposal={onUpdateProposal}
          onCancelProposalEdit={onCancelProposalEdit}
          onOpenExecutorProfileSetup={onOpenExecutorProfileSetup}
        />
      ) : null}
    </>
  );
};
