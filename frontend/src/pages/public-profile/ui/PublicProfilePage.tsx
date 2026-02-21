import type { PublicUser } from "../../../entities/user/model/types";
import { formatMoney } from "../../../shared/lib/format";
import {
  getExperienceLevelLabel,
  toRoleLabel,
} from "../../../shared/lib/profile";
import { getDisplayAcronym } from "../../../shared/lib/telegram";
import { Avatar, Button, Cell, List, Placeholder, Section } from "../../../shared/ui";

type PublicProfilePageProps = {
  publicProfileUser: PublicUser | null;
  publicProfileLoading: boolean;
  publicProfileError: string | null;
  onBack: () => void;
  onToFeed: () => void;
};

export const PublicProfilePage = ({
  publicProfileUser,
  publicProfileLoading,
  publicProfileError,
  onBack,
  onToFeed,
}: PublicProfilePageProps): JSX.Element => {
  if (publicProfileLoading) {
    return (
      <Section>
        <Placeholder header="Загрузка" description="Получаем публичный профиль..." />
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
          <Cell subtitle="О себе" description={publicProfile?.about ?? "Не заполнено"}>
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
            after={getExperienceLevelLabel(publicProfile?.experienceLevel ?? null)}
          >
            Опыт
          </Cell>
          <Cell
            subtitle="Базовая ставка"
            after={
              publicProfile?.basePrice ? formatMoney(publicProfile.basePrice) : "Не указана"
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
          <Button mode="outline" onClick={onBack}>
            Назад
          </Button>
          <Button mode="bezeled" onClick={onToFeed}>
            К ленте
          </Button>
        </div>
      </Section>
    </>
  );
};
