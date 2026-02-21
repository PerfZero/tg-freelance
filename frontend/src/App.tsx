import { useMemo } from "react";
import WebApp from "@twa-dev/sdk";
import {
  AppRoot,
  Avatar,
  Button,
  Cell,
  List,
  Placeholder,
  Section,
} from "@telegram-apps/telegram-ui";

import "./App.css";

type TgUser = {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  isPremium?: boolean;
};

type WebAppState = {
  isTelegram: boolean;
  platform: string;
  uiPlatform: "ios" | "base";
  appearance: "light" | "dark";
  version: string;
  colorScheme: string;
  startParam?: string;
  user?: TgUser;
};

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
    startParam: WebApp.initDataUnsafe?.start_param,
    user: initUser
      ? {
          id: initUser.id,
          username: initUser.username,
          firstName: initUser.first_name,
          lastName: initUser.last_name,
          languageCode: initUser.language_code,
          isPremium: initUser.is_premium,
        }
      : undefined,
  };
};

const formatName = (user?: TgUser): string => {
  if (!user) {
    return "Гость";
  }

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  if (user.username) {
    return `@${user.username}`;
  }

  return `ID ${user.id}`;
};

const getAcronym = (user?: TgUser): string => {
  if (!user) {
    return "TG";
  }

  const first = user.firstName?.[0] ?? user.username?.[0] ?? "T";
  const second = user.lastName?.[0] ?? "G";

  return `${first}${second}`.toUpperCase();
};

function App() {
  const state = useMemo(() => getSafeState(), []);
  const profileName = useMemo(() => formatName(state.user), [state.user]);
  const profileAcronym = useMemo(() => getAcronym(state.user), [state.user]);

  return (
    <AppRoot appearance={state.appearance} platform={state.uiPlatform}>
      <main className="app-shell">
        <Section>
          <Placeholder
            header="TG Freelance"
            description="MVP-каркас миниаппа в Telegram-стиле. Следующий шаг: экран ленты задач и карточка заказа."
            action={
              <Button
                mode="filled"
                size="l"
                stretched
                onClick={() => {
                  if (state.isTelegram) {
                    WebApp.showAlert("Дальше подключим экран задач.");
                  }
                }}
              >
                Открыть задачи
              </Button>
            }
          >
            <Avatar size={96} acronym={profileAcronym} />
          </Placeholder>
        </Section>

        <Section
          header="Профиль Telegram"
          footer="Данные получены из Telegram WebApp initData"
        >
          <List>
            <Cell
              before={<Avatar size={48} acronym={profileAcronym} />}
              subtitle={
                state.user?.username
                  ? `@${state.user.username}`
                  : "username не указан"
              }
              description={
                state.isTelegram
                  ? "Сессия Telegram активна"
                  : "Открыто вне Telegram"
              }
            >
              {profileName}
            </Cell>
            <Cell subtitle="Telegram ID" after={state.user?.id ?? "n/a"}>
              Пользователь
            </Cell>
            <Cell subtitle="Платформа" after={state.platform}>
              Контекст
            </Cell>
            <Cell subtitle="Версия WebApp" after={state.version}>
              API
            </Cell>
            <Cell subtitle="Тема" after={state.colorScheme}>
              Appearance
            </Cell>
            <Cell
              subtitle="start_param"
              after={state.startParam ?? "не передан"}
            >
              Deeplink
            </Cell>
          </List>
        </Section>
      </main>
    </AppRoot>
  );
}

export default App;
