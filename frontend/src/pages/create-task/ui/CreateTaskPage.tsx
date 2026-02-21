import { ArrowLeft, CirclePlus } from "lucide-react";

import type { TaskForm } from "../../../entities/task/model/types";
import { Button, Input, Section, Textarea } from "../../../shared/ui";

type CreateTaskPageProps = {
  form: TaskForm;
  pending: boolean;
  error: string | null;
  onPatchForm: (patch: Partial<TaskForm>) => void;
  onSubmit: () => void;
  onBackToFeed: () => void;
};

export const CreateTaskPage = ({
  form,
  pending,
  error,
  onPatchForm,
  onSubmit,
  onBackToFeed,
}: CreateTaskPageProps): JSX.Element => (
  <Section
    header="Новая задача"
    footer="После публикации откроется карточка задачи, где можно отредактировать детали."
  >
    <div className="form-grid">
      <Input
        header="Заголовок"
        placeholder="Сделать лендинг"
        value={form.title}
        onChange={(event) => onPatchForm({ title: event.target.value })}
      />
      <Textarea
        header="Описание"
        placeholder="Что нужно сделать"
        value={form.description}
        onChange={(event) => onPatchForm({ description: event.target.value })}
      />
      <Input
        header="Бюджет"
        type="number"
        placeholder="15000"
        value={form.budget}
        onChange={(event) => onPatchForm({ budget: event.target.value })}
      />
      <Input
        header="Категория"
        placeholder="frontend"
        value={form.category}
        onChange={(event) => onPatchForm({ category: event.target.value })}
      />
      <Input
        header="Дедлайн"
        type="datetime-local"
        value={form.deadlineAt}
        onChange={(event) => onPatchForm({ deadlineAt: event.target.value })}
      />
      <Input
        header="Теги"
        placeholder="react, vite, telegram"
        value={form.tags}
        onChange={(event) => onPatchForm({ tags: event.target.value })}
      />
    </div>

    {error ? <p className="error-text">{error}</p> : null}

    <div className="row-actions">
      <Button mode="filled" size="l" disabled={pending} onClick={onSubmit}>
        <span className="btn-with-icon">
          <CirclePlus size={16} />
          <span>{pending ? "Публикуем..." : "Опубликовать задачу"}</span>
        </span>
      </Button>
      <Button mode="outline" size="l" onClick={onBackToFeed}>
        <span className="btn-with-icon">
          <ArrowLeft size={16} />
          <span>Назад к ленте</span>
        </span>
      </Button>
    </div>
  </Section>
);
