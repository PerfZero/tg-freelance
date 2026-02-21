import type { PrimaryRoleValue } from "../../../entities/user/model/types";
import { Section } from "../../../shared/ui";

type RoleOnboardingPageProps = {
  roleSavePending: boolean;
  roleSaveError: string | null;
  onChooseRole: (role: PrimaryRoleValue) => void;
};

export const RoleOnboardingPage = ({
  roleSavePending,
  roleSaveError,
  onChooseRole,
}: RoleOnboardingPageProps): JSX.Element => (
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
        onClick={() => onChooseRole("CUSTOMER")}
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
        onClick={() => onChooseRole("EXECUTOR")}
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
