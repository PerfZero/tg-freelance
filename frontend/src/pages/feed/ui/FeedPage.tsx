import {
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Filter,
  RotateCcw,
} from "lucide-react";

import type { TaskFilters, TaskItem } from "../../../entities/task/model/types";
import {
  MAX_TASK_DESCRIPTION_PREVIEW_CHARS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
} from "../../../shared/config/constants";
import { formatDate, formatMoney, trimText } from "../../../shared/lib/format";
import {
  getStatusLabel,
  shouldClampTaskDescription,
} from "../../../shared/lib/task";
import { Button, Input, Placeholder, Section } from "../../../shared/ui";

type FeedPageProps = {
  authPrimaryRole: "CUSTOMER" | "EXECUTOR" | null;
  filterDraft: TaskFilters;
  filterApplied: TaskFilters;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onPatchFilterDraft: (patch: Partial<TaskFilters>) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  tasks: TaskItem[];
  listLoading: boolean;
  listError: string | null;
  expandedFeedDescriptions: Record<string, boolean>;
  onToggleDescription: (taskId: string) => void;
  onOpenTask: (taskId: string) => void;
  onOpenCreate: () => void;
  page: number;
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
  onPrevPage: () => void;
  onNextPage: () => void;
  totalUsersCount: number | null;
};

export const FeedPage = ({
  authPrimaryRole,
  filterDraft,
  filterApplied,
  filtersOpen,
  onToggleFilters,
  onPatchFilterDraft,
  onApplyFilters,
  onResetFilters,
  tasks,
  listLoading,
  listError,
  expandedFeedDescriptions,
  onToggleDescription,
  onOpenTask,
  onOpenCreate,
  page,
  pagination,
  onPrevPage,
  onNextPage,
  totalUsersCount,
}: FeedPageProps): JSX.Element => {
  const activeFiltersCount = [
    filterApplied.q.trim(),
    filterApplied.category.trim(),
    filterApplied.budgetMin.trim(),
    filterApplied.budgetMax.trim(),
  ].filter((value) => value.length > 0).length;

  const isCustomerPriority = authPrimaryRole === "CUSTOMER";
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
            onClick={onToggleFilters}
          >
            <span className="btn-with-icon">
              <Filter size={16} />
              <span>{filtersOpen ? "Скрыть фильтры" : "Показать фильтры"}</span>
            </span>
          </Button>
          <Button
            size="m"
            mode={isCustomerPriority ? "filled" : "bezeled"}
            onClick={onOpenCreate}
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
                  onPatchFilterDraft({ q: event.target.value })
                }
              />
              <Input
                header="Категория"
                placeholder="frontend"
                value={filterDraft.category}
                onChange={(event) =>
                  onPatchFilterDraft({ category: event.target.value })
                }
              />
              <Input
                header="Бюджет от"
                type="number"
                value={filterDraft.budgetMin}
                onChange={(event) =>
                  onPatchFilterDraft({ budgetMin: event.target.value })
                }
              />
              <Input
                header="Бюджет до"
                type="number"
                value={filterDraft.budgetMax}
                onChange={(event) =>
                  onPatchFilterDraft({ budgetMax: event.target.value })
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
                    onPatchFilterDraft({ status: statusOption.value })
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
                    filterDraft.sort === sortOption.value ? "filled" : "outline"
                  }
                  onClick={() => onPatchFilterDraft({ sort: sortOption.value })}
                >
                  {sortOption.label}
                </Button>
              ))}
            </div>

            <div className="row-actions row-actions-tight">
              <Button size="m" mode="filled" onClick={onApplyFilters}>
                <span className="btn-with-icon">
                  <Check size={16} />
                  <span>Применить</span>
                </span>
              </Button>
              <Button size="m" mode="outline" onClick={onResetFilters}>
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
                    <span className="task-feed-meta-chip">{task.category}</span>
                    {task.tags.slice(0, 3).map((tag) => (
                      <span
                        key={`${task.id}-${tag}`}
                        className="task-feed-meta-chip"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <p className="task-feed-description">{previewDescription}</p>

                  {canClamp ? (
                    <div className="task-feed-readmore-row">
                      <Button
                        mode="outline"
                        size="s"
                        onClick={() => onToggleDescription(task.id)}
                      >
                        {isExpanded ? "Скрыть" : "Показать еще"}
                      </Button>
                    </div>
                  ) : null}

                  <div className="task-feed-actions">
                    <Button
                      mode="bezeled"
                      size="m"
                      onClick={() => onOpenTask(task.id)}
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
            onClick={onPrevPage}
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
            onClick={onNextPage}
          >
            <span className="btn-with-icon">
              <span>Вперед</span>
              <ChevronRight size={16} />
            </span>
          </Button>
        </div>

        <p className="feed-platform-stat">
          Пользователей на площадке:{" "}
          {typeof totalUsersCount === "number" ? totalUsersCount : "—"}
        </p>
      </Section>
    </>
  );
};
